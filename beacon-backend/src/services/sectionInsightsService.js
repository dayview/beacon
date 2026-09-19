import Session from '../models/Session.js';
import Test from '../models/Test.js';
import { buildSessionQuery } from './analyticsFilters.js';
import { SECTION_OUTCOMES } from '../constants/sectionOutcomes.js';

/**
 * Section Insights Service
 *
 * Per-frame ("section") analysis of a test: was it reached, was it
 * skimmed, lingered on, or backtracked to — and, when dwell time is high,
 * a confidence-scored guess at *why* rather than a flat "confusion" label.
 *
 * Bowei's explicit correction (Discord, Feb 2026) was that long dwell time
 * must not be reported as confusion with certainty — it can equally mean
 * genuine interest. This service only ever escalates to likely_confusion
 * or likely_high_interest when a second, independent signal (backtracking
 * or interaction density) corroborates the dwell reading; long dwell with
 * no corroborating signal is reported as the ambiguous `prolonged_dwell`
 * outcome at low confidence instead of a guess.
 *
 * Two real signal sources exist in this codebase today:
 *  - Guided walkthroughs (Test.tasks with targetElement): Participate.tsx
 *    emits an explicit dwellMs + direction ('forward'/'backward') per step.
 *  - Free exploration (MiroPanel, or a test with no tasks): raw click/hover
 *    events carry a resolved frameId but no explicit dwell — dwell isn't
 *    inferable the same way, so those sessions contribute interaction
 *    density (a real signal) rather than a synthesized dwell number.
 *
 * A section with no dwell samples at all (always true for free-exploration
 * sections, since MiroPanel never emits dwellMs) falls back to interaction
 * density, judged against the test's own median density, as the primary
 * signal instead of a flat low-confidence "normal". That fallback can only
 * ever resolve toward likely_high_interest or insufficient_attention, never
 * likely_confusion or repeated_navigation — confusion and backtracking
 * detection both depend on signals (backtrackCount, dwell) that free
 * exploration doesn't capture, so this never guesses confusion from
 * density alone.
 *
 * A third signal, idle time, is derived (not separately captured) for
 * free-exploration sections: when two consecutive events in a session land
 * on the same frame, a gap between them longer than IDLE_GAP_THRESHOLD_MS
 * counts as an idle span for that section. It only ever demotes an
 * otherwise-"normal" free-exploration section to the ambiguous
 * `prolonged_dwell` outcome — the same "flagged for review, not guessed"
 * treatment high dwell gets in guided mode — since a long unexplained pause
 * is exactly the kind of dwell-like signal free exploration otherwise has
 * no way to see (it has no dwellMs at all, only click/hover counts).
 *
 * A fourth signal, reading order, is also derived for free-exploration
 * sections: frames are sorted top-to-bottom then left-to-right by their
 * Board.elements bounds to get a canonical reading order, and each
 * session's actual visit sequence is compared against it. Returning to a
 * section whose canonical index is behind the furthest point already
 * reached counts as a backtrack against that section — the same
 * `backtrackCount` guided mode already gets from explicit backward
 * task_complete events, just derived instead of captured. It only ever
 * resolves to the existing `repeated_navigation` outcome (never
 * `likely_confusion`), mirroring guided mode's own typical-dwell+backtrack
 * rule rather than inventing new corroboration logic. If any section's
 * frame is missing bounds, the whole signal is skipped for that test
 * rather than guessed from an order that can't actually be determined.
 *
 * A fifth signal, zoom-repeat, is the one signal here that needed new
 * capture rather than new analysis: MiroPanel polls the board's zoom level
 * (there's no zoom-change event in Miro's SDK, only poll-only getZoom())
 * and emits a `zoom` event whenever it actually changes. For a run of
 * consecutive same-frame zoom samples, a direction reversal (zooming in
 * then out, or out then in) is counted — repeatedly zooming in and out on
 * one section reads as "can't parse this at a glance," the same
 * ambiguous-pause idea idle time captures for stillness instead of motion.
 * Like idle time, it only ever demotes an otherwise-normal free-exploration
 * section to `prolonged_dwell`, never to `likely_confusion`.
 *
 * All six signals Bowei named (dwell, backtracking, click density, idle
 * time, reading order, zoom-repeat) are implemented as of this writing.
 */

const OUTCOMES = SECTION_OUTCOMES;

// A gap between two same-frame events shorter than this could just be
// normal reading/clicking cadence; longer implies a genuine pause.
const IDLE_GAP_THRESHOLD_MS = 15000;

function average(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

/**
 * Fallback classification for a section with no dwell samples at all
 * (always the case for free-exploration sections). Judges interaction
 * density against the test's own median density — the same relative-to-
 * baseline approach classifySection uses for dwell. Single-signal, so
 * confidence is capped lower than a dwell+backtrack corroborated call, and
 * it never claims confusion: without dwell or backtracking data there's no
 * way to distinguish "confused" from "not engaged" beyond low density.
 */
function classifyByInteractionDensity({
    avgInteractionDensity,
    medianInteractionDensity,
    avgIdleMs,
    medianIdleMs,
    backtrackCount,
    avgZoomReversals,
    medianZoomReversals,
}) {
    if (avgInteractionDensity === null || medianInteractionDensity === null || medianInteractionDensity === 0) {
        return {
            outcome: OUTCOMES.NORMAL,
            confidence: 0.2,
            explanation: 'Reached by most participants, but not enough dwell-time or interaction data was recorded to say more.',
        };
    }

    const densityRatio = avgInteractionDensity / medianInteractionDensity;

    if (densityRatio > 1.5) {
        const pctAbove = Math.round((densityRatio - 1) * 100);
        return {
            outcome: OUTCOMES.LIKELY_HIGH_INTEREST,
            confidence: round2(Math.min(0.7, 0.3 + (densityRatio - 1) * 0.2)),
            explanation: `Interaction density (clicks/hovers) is ${pctAbove}% above the test's median — a pattern consistent with genuine interest. This test has no dwell-time or backtracking data (free-exploration mode), so confusion can't be distinguished from interest here — only interest is ever inferred from density alone.`,
        };
    }

    if (densityRatio < 0.5) {
        const pctBelow = Math.round((1 - densityRatio) * 100);
        return {
            outcome: OUTCOMES.INSUFFICIENT_ATTENTION,
            confidence: round2(Math.min(0.7, 0.3 + (0.5 - densityRatio))),
            explanation: `Interaction density is ${pctBelow}% below the test's median — participants likely passed through this section with little engagement.`,
        };
    }

    if (backtrackCount > 0) {
        return {
            outcome: OUTCOMES.REPEATED_NAVIGATION,
            confidence: round2(Math.min(1, 0.4 + backtrackCount * 0.15)),
            explanation: `${backtrackCount} participant(s) navigated back to this section after already moving past it in the board's layout order, even though interaction levels here were typical.`,
        };
    }

    const hasIdleSignal = avgIdleMs !== null && medianIdleMs !== null && medianIdleMs > 0;
    if (hasIdleSignal) {
        const idleRatio = avgIdleMs / medianIdleMs;
        if (idleRatio > 1.5) {
            const pctAbove = Math.round((idleRatio - 1) * 100);
            return {
                outcome: OUTCOMES.PROLONGED_DWELL,
                confidence: 0.3,
                explanation: `Participants paused on this section for stretches averaging ${Math.round(avgIdleMs / 1000)}s without any click or hover activity — ${pctAbove}% longer than the test's typical idle gap. Could be reading or thinking, or could mean they stepped away; flagged for your review rather than guessed.`,
            };
        }
    }

    const hasZoomSignal = avgZoomReversals !== null && medianZoomReversals !== null && medianZoomReversals > 0;
    if (hasZoomSignal) {
        const zoomRatio = avgZoomReversals / medianZoomReversals;
        if (zoomRatio > 1.5) {
            return {
                outcome: OUTCOMES.PROLONGED_DWELL,
                confidence: 0.3,
                explanation: `Participants zoomed in and out on this section an average of ${avgZoomReversals} time(s) — well above the test's typical zoom-reversal rate. Could mean the content was hard to parse at a glance, or just careful reading; flagged for your review rather than guessed.`,
            };
        }
    }

    return {
        outcome: OUTCOMES.NORMAL,
        confidence: 0.4,
        explanation: 'Interaction density for this section was typical relative to the rest of the test.',
    };
}

/**
 * Classify one section from its aggregated signals. Every branch names the
 * signals it used in `explanation`, and `confidence` (0–1) always reflects
 * how much corroborating evidence backed the call — not a fixed constant.
 */
function classifySection({
    reachedRatio,
    avgDwellMs,
    medianDwellMs,
    backtrackCount,
    avgInteractionDensity,
    medianInteractionDensity,
    avgIdleMs,
    medianIdleMs,
    avgZoomReversals,
    medianZoomReversals,
}) {
    if (reachedRatio === 0) {
        return {
            outcome: OUTCOMES.SKIPPED,
            confidence: 1,
            explanation: 'No participant reached this section.',
        };
    }

    if (reachedRatio < 0.5) {
        return {
            outcome: OUTCOMES.SKIPPED,
            confidence: round2(1 - reachedRatio),
            explanation: `Only ${Math.round(reachedRatio * 100)}% of participants reached this section.`,
        };
    }

    const hasDwellSignal = avgDwellMs !== null && medianDwellMs !== null && medianDwellMs > 0;

    if (!hasDwellSignal) {
        return classifyByInteractionDensity({
            avgInteractionDensity,
            medianInteractionDensity,
            avgIdleMs,
            medianIdleMs,
            backtrackCount,
            avgZoomReversals,
            medianZoomReversals,
        });
    }

    const dwellRatio = avgDwellMs / medianDwellMs;

    if (dwellRatio < 0.5) {
        return {
            outcome: OUTCOMES.INSUFFICIENT_ATTENTION,
            confidence: round2(Math.min(1, 0.3 + (0.5 - dwellRatio))),
            explanation: `Dwell time is ${Math.round((1 - dwellRatio) * 100)}% below the test's median — participants likely skimmed this section rather than read it.`,
        };
    }

    if (dwellRatio > 1.5) {
        const pctAbove = Math.round((dwellRatio - 1) * 100);
        const hasBacktrack = backtrackCount > 0;
        const hasInteraction = avgInteractionDensity !== null && avgInteractionDensity > 1;

        if (hasBacktrack) {
            return {
                outcome: OUTCOMES.LIKELY_CONFUSION,
                confidence: round2(Math.min(1, 0.5 + backtrackCount * 0.1)),
                explanation: `Dwell time is ${pctAbove}% above the test's median, and ${backtrackCount} participant(s) backtracked to this section from later in the flow — a pattern more consistent with confusion than interest.`,
            };
        }

        if (hasInteraction) {
            return {
                outcome: OUTCOMES.LIKELY_HIGH_INTEREST,
                confidence: round2(Math.min(1, 0.4 + avgInteractionDensity * 0.05)),
                explanation: `Dwell time is ${pctAbove}% above the test's median, with active clicking/hovering and no backtracking — a pattern more consistent with genuine interest than confusion.`,
            };
        }

        return {
            outcome: OUTCOMES.PROLONGED_DWELL,
            confidence: 0.3,
            explanation: `Dwell time is ${pctAbove}% above the test's median, but there's no backtracking or interaction data to say whether that's confusion or interest. Flagged for your review rather than guessed.`,
        };
    }

    if (backtrackCount > 0) {
        return {
            outcome: OUTCOMES.REPEATED_NAVIGATION,
            confidence: round2(Math.min(1, 0.4 + backtrackCount * 0.15)),
            explanation: `${backtrackCount} participant(s) navigated back to this section from later in the flow, even though dwell time was typical.`,
        };
    }

    return {
        outcome: OUTCOMES.NORMAL,
        confidence: 0.6,
        explanation: "Dwell time and navigation for this section were typical relative to the rest of the test.",
    };
}

/**
 * Compute per-section (per-frame) insights for a test: reach rate, dwell
 * relative to the test's own median, backtracking, and a classified,
 * confidence-scored, explained outcome per section.
 *
 * @param {string} testId
 * @param {Object} filters
 * @param {string} [filters.sessionId] - restrict to one session
 * @param {string} [filters.role] - restrict to sessions with this participant.demographics.role
 * @returns {{ testId: string, mode: 'guided'|'free', totalSessions: number, sections: object[] }}
 */
export async function generateSectionInsights(testId, filters = {}) {
    const test = await Test.findById(testId).populate('board').lean();
    if (!test) {
        throw new Error('Test not found.');
    }

    const steps = (test.tasks || [])
        .filter((t) => t.targetElement)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const boardFrames = (test.board?.elements || []).filter((e) => e.type === 'frame');
    const overridesByFrameId = new Map(
        (test.sectionOverrides || []).map((o) => [o.frameId, o])
    );

    const mode = steps.length > 0 ? 'guided' : 'free';
    const sectionIds = mode === 'guided'
        ? steps.map((t) => t.targetElement)
        : boardFrames.map((e) => e.miroId);

    if (sectionIds.length === 0) {
        return { testId: String(testId), mode, totalSessions: 0, sections: [] };
    }

    const labelFor = (frameId) => {
        const step = steps.find((t) => t.targetElement === frameId);
        if (step?.description) return step.description;
        const el = boardFrames.find((e) => e.miroId === frameId);
        return el?.content || frameId;
    };

    const sessions = await Session.find(buildSessionQuery(testId, filters)).select('events').lean();
    const usableSessions = sessions.filter((s) => (s.events || []).length > 0);
    const totalSessions = usableSessions.length;

    // Canonical reading order — top-to-bottom, then left-to-right by each
    // frame's board position. Only meaningful (and only computed) when
    // every section's frame actually has bounds; a board synced without
    // position data has no real reading order to compare against.
    const allSectionsHaveBounds = mode === 'free' && sectionIds.every((id) => {
        const el = boardFrames.find((e) => e.miroId === id);
        return el && typeof el.bounds?.x === 'number' && typeof el.bounds?.y === 'number';
    });
    const canonicalIndexByFrameId = allSectionsHaveBounds
        ? new Map(
            [...boardFrames]
                .filter((e) => sectionIds.includes(e.miroId))
                .sort((a, b) => (a.bounds.y - b.bounds.y) || (a.bounds.x - b.bounds.x))
                .map((e, idx) => [e.miroId, idx])
        )
        : null;

    const stats = new Map(sectionIds.map((id) => [id, {
        reachedSessionIds: new Set(),
        dwellSamples: [],
        backtrackCount: 0,
        interactionDensities: [],
        idleSamples: [],
        zoomReversalSamples: [],
    }]));

    for (const session of usableSessions) {
        const sessionId = String(session._id);
        const perFrameInteractionCount = new Map();
        const sortedEvents = [...(session.events || [])]
            .filter((e) => e.frameId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        for (const event of sortedEvents) {
            if (!stats.has(event.frameId)) continue;
            const s = stats.get(event.frameId);
            s.reachedSessionIds.add(sessionId);

            if (event.type === 'task_complete') {
                if (event.metadata && typeof event.metadata.dwellMs === 'number') {
                    s.dwellSamples.push(event.metadata.dwellMs);
                }
                if (event.metadata && event.metadata.direction === 'backward') {
                    s.backtrackCount += 1;
                }
            } else if (event.type === 'click' || event.type === 'hover') {
                perFrameInteractionCount.set(
                    event.frameId,
                    (perFrameInteractionCount.get(event.frameId) || 0) + 1
                );
            }
        }

        for (const [frameId, count] of perFrameInteractionCount) {
            stats.get(frameId)?.interactionDensities.push(count);
        }

        // Idle gaps — only between consecutive events that land on the same
        // frame; a gap across a frame change is navigation, not idling.
        for (let i = 1; i < sortedEvents.length; i++) {
            const prev = sortedEvents[i - 1];
            const curr = sortedEvents[i];
            if (prev.frameId !== curr.frameId || !stats.has(curr.frameId)) continue;
            const gap = new Date(curr.timestamp) - new Date(prev.timestamp);
            if (gap >= IDLE_GAP_THRESHOLD_MS) {
                stats.get(curr.frameId).idleSamples.push(gap);
            }
        }

        // Reading-order backtracks — only from raw browsing events
        // (task_complete's own direction field already covers guided mode).
        // Consecutive events on the same frame are one visit; a visit whose
        // canonical index is behind the furthest index already reached in
        // this session is a backtrack, attributed to the section revisited.
        if (canonicalIndexByFrameId) {
            let maxIndexReached = -1;
            let lastVisitFrameId = null;
            for (const event of sortedEvents) {
                if (event.type === 'task_complete' || event.frameId === lastVisitFrameId) continue;
                lastVisitFrameId = event.frameId;
                const canonicalIndex = canonicalIndexByFrameId.get(event.frameId);
                if (canonicalIndex === undefined) continue;
                if (canonicalIndex < maxIndexReached) {
                    stats.get(event.frameId).backtrackCount += 1;
                } else {
                    maxIndexReached = canonicalIndex;
                }
            }
        }

        // Zoom-reversal count — a run of consecutive same-frame zoom
        // samples with at least one direction change (zoom-in, then out, or
        // vice versa). A run needs >=2 zoom samples for a direction to even
        // exist; runs with fewer are skipped rather than counted as zero,
        // since "no reversal" and "no data" aren't the same thing. Leaving
        // the frame resets tracking — a fresh visit starts a fresh run.
        {
            const zoomEvents = sortedEvents.filter((e) => e.type === 'zoom' && stats.has(e.frameId));
            const reversalsByFrame = new Map();
            let runFrameId = null;
            let runSampleCount = 0;
            let runReversals = 0;
            let lastZoom = null;
            let lastDirection = 0;

            const flushRun = () => {
                if (runFrameId !== null && runSampleCount >= 2) {
                    reversalsByFrame.set(runFrameId, (reversalsByFrame.get(runFrameId) || 0) + runReversals);
                }
            };

            for (const event of zoomEvents) {
                if (event.frameId !== runFrameId) {
                    flushRun();
                    runFrameId = event.frameId;
                    runSampleCount = 0;
                    runReversals = 0;
                    lastZoom = null;
                    lastDirection = 0;
                }
                const zoom = event.metadata?.zoom;
                if (typeof zoom !== 'number') continue;
                runSampleCount += 1;
                if (lastZoom !== null) {
                    const delta = zoom - lastZoom;
                    const direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;
                    if (direction !== 0) {
                        if (lastDirection !== 0 && direction !== lastDirection) {
                            runReversals += 1;
                        }
                        lastDirection = direction;
                    }
                }
                lastZoom = zoom;
            }
            flushRun();

            for (const [frameId, count] of reversalsByFrame) {
                stats.get(frameId).zoomReversalSamples.push(count);
            }
        }
    }

    // Baseline dwell for this test — sections are judged relative to their
    // own test's typical dwell, not an arbitrary fixed threshold.
    const sectionAvgDwells = sectionIds
        .map((id) => stats.get(id).dwellSamples)
        .filter((samples) => samples.length > 0)
        .map(average);
    const medianDwellMs = sectionAvgDwells.length > 0 ? median(sectionAvgDwells) : null;

    // Same idea for interaction density — the fallback signal for sections
    // with no dwell samples at all (free-exploration tests).
    const sectionAvgDensities = sectionIds
        .map((id) => stats.get(id).interactionDensities)
        .filter((samples) => samples.length > 0)
        .map(average);
    const medianInteractionDensity = sectionAvgDensities.length > 0 ? median(sectionAvgDensities) : null;

    // Same idea for idle gaps — free-exploration sections' only source of
    // an idle signal is other sections in this same test.
    const sectionAvgIdles = sectionIds
        .map((id) => stats.get(id).idleSamples)
        .filter((samples) => samples.length > 0)
        .map(average);
    const medianIdleMs = sectionAvgIdles.length > 0 ? median(sectionAvgIdles) : null;

    // Same idea for zoom reversals — unlike idle gaps, a genuinely-measured
    // zero (a run with no direction change) is itself a real data point, so
    // it's included in the baseline rather than filtered out like idle's
    // threshold-gated samples are.
    const sectionAvgZoomReversals = sectionIds
        .map((id) => stats.get(id).zoomReversalSamples)
        .filter((samples) => samples.length > 0)
        .map(average);
    const medianZoomReversals = sectionAvgZoomReversals.length > 0 ? median(sectionAvgZoomReversals) : null;

    const sections = sectionIds.map((frameId, order) => {
        const s = stats.get(frameId);
        const reachedCount = s.reachedSessionIds.size;
        const reachedRatio = totalSessions > 0 ? reachedCount / totalSessions : 0;
        const avgDwellMs = s.dwellSamples.length > 0 ? Math.round(average(s.dwellSamples)) : null;
        const avgInteractionDensity = s.interactionDensities.length > 0
            ? round2(average(s.interactionDensities))
            : null;
        const avgIdleMs = s.idleSamples.length > 0 ? Math.round(average(s.idleSamples)) : null;
        const avgZoomReversals = s.zoomReversalSamples.length > 0 ? round2(average(s.zoomReversalSamples)) : null;

        const classification = classifySection({
            reachedRatio,
            avgDwellMs,
            medianDwellMs,
            backtrackCount: s.backtrackCount,
            avgInteractionDensity,
            medianInteractionDensity,
            avgIdleMs,
            medianIdleMs,
            avgZoomReversals,
            medianZoomReversals,
        });

        const override = overridesByFrameId.get(frameId) || null;

        return {
            frameId,
            label: labelFor(frameId),
            order,
            reachedCount,
            totalSessions,
            reachedRatio: round2(reachedRatio),
            avgDwellMs,
            backtrackCount: s.backtrackCount,
            avgInteractionDensity,
            avgIdleMs,
            avgZoomReversals,
            ...classification,
            override: override
                ? {
                    outcome: override.outcome,
                    note: override.note,
                    overriddenAt: override.overriddenAt,
                }
                : null,
        };
    });

    return { testId: String(testId), mode, totalSessions, sections };
}
