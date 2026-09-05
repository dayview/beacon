import Session from '../models/Session.js';
import Test from '../models/Test.js';

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
 * What this does NOT claim to use, because the app doesn't capture it:
 * zoom-repeat, idle time, or reading order. Bowei named all three as
 * useful signals — they're not fabricated here.
 */

const OUTCOMES = {
    SKIPPED: 'skipped',
    INSUFFICIENT_ATTENTION: 'insufficient_attention',
    PROLONGED_DWELL: 'prolonged_dwell',
    LIKELY_CONFUSION: 'likely_confusion',
    LIKELY_HIGH_INTEREST: 'likely_high_interest',
    REPEATED_NAVIGATION: 'repeated_navigation',
    NORMAL: 'normal',
};

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
 * Classify one section from its aggregated signals. Every branch names the
 * signals it used in `explanation`, and `confidence` (0–1) always reflects
 * how much corroborating evidence backed the call — not a fixed constant.
 */
function classifySection({ reachedRatio, avgDwellMs, medianDwellMs, backtrackCount, avgInteractionDensity }) {
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

    if (avgDwellMs === null || medianDwellMs === null || medianDwellMs === 0) {
        return {
            outcome: OUTCOMES.NORMAL,
            confidence: 0.2,
            explanation: 'Reached by most participants, but not enough dwell-time data was recorded to say more.',
        };
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
 * @returns {{ testId: string, mode: 'guided'|'free', totalSessions: number, sections: object[] }}
 */
export async function generateSectionInsights(testId) {
    const test = await Test.findById(testId).populate('board').lean();
    if (!test) {
        throw new Error('Test not found.');
    }

    const steps = (test.tasks || [])
        .filter((t) => t.targetElement)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const boardFrames = (test.board?.elements || []).filter((e) => e.type === 'frame');

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

    const sessions = await Session.find({ test: testId }).select('events').lean();
    const usableSessions = sessions.filter((s) => (s.events || []).length > 0);
    const totalSessions = usableSessions.length;

    const stats = new Map(sectionIds.map((id) => [id, {
        reachedSessionIds: new Set(),
        dwellSamples: [],
        backtrackCount: 0,
        interactionDensities: [],
    }]));

    for (const session of usableSessions) {
        const sessionId = String(session._id);
        const perFrameInteractionCount = new Map();

        for (const event of session.events || []) {
            if (!event.frameId || !stats.has(event.frameId)) continue;
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
    }

    // Baseline dwell for this test — sections are judged relative to their
    // own test's typical dwell, not an arbitrary fixed threshold.
    const sectionAvgDwells = sectionIds
        .map((id) => stats.get(id).dwellSamples)
        .filter((samples) => samples.length > 0)
        .map(average);
    const medianDwellMs = sectionAvgDwells.length > 0 ? median(sectionAvgDwells) : null;

    const sections = sectionIds.map((frameId, order) => {
        const s = stats.get(frameId);
        const reachedCount = s.reachedSessionIds.size;
        const reachedRatio = totalSessions > 0 ? reachedCount / totalSessions : 0;
        const avgDwellMs = s.dwellSamples.length > 0 ? Math.round(average(s.dwellSamples)) : null;
        const avgInteractionDensity = s.interactionDensities.length > 0
            ? round2(average(s.interactionDensities))
            : null;

        const classification = classifySection({
            reachedRatio,
            avgDwellMs,
            medianDwellMs,
            backtrackCount: s.backtrackCount,
            avgInteractionDensity,
        });

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
            ...classification,
        };
    });

    return { testId: String(testId), mode, totalSessions, sections };
}
