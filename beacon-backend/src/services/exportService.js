import ExcelJS from 'exceljs';
import Session from '../models/Session.js';
import { detectConfusionZones, getDwellTimeSummary } from './confusionService.js';
import { computeNavigationPaths, computeScrollDepth } from './flowService.js';
import { generateSectionInsights } from './sectionInsightsService.js';

// ── Shared aggregations (also used directly by routes/analytics.js) ──

export async function computeElementStats(testId) {
    const sessions = await Session.find({ test: testId }).select('events').lean();
    const elementStats = new Map();

    for (const session of sessions) {
        for (const event of session.events || []) {
            const el = event.element || 'unknown';
            if (!elementStats.has(el)) {
                elementStats.set(el, {
                    element: el,
                    clicks: 0,
                    hovers: 0,
                    scrolls: 0,
                    taskCompletes: 0,
                    totalInteractions: 0,
                    sessions: new Set(),
                });
            }
            const stats = elementStats.get(el);
            stats.totalInteractions++;
            stats.sessions.add(session._id.toString());
            if (event.type === 'click') stats.clicks++;
            else if (event.type === 'hover') stats.hovers++;
            else if (event.type === 'scroll') stats.scrolls++;
            else if (event.type === 'task_complete') stats.taskCompletes++;
        }
    }

    return {
        totalSessions: sessions.length,
        elements: Array.from(elementStats.values())
            .map((s) => ({
                element: s.element,
                clicks: s.clicks,
                hovers: s.hovers,
                scrolls: s.scrolls,
                taskCompletes: s.taskCompletes,
                totalInteractions: s.totalInteractions,
                sessionCount: s.sessions.size,
            }))
            .sort((a, b) => b.totalInteractions - a.totalInteractions),
    };
}

export async function computeSessionStats(testId) {
    const sessions = await Session.find({ test: testId })
        .select('status startedAt completedAt')
        .lean();

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const completionRate = totalSessions > 0
        ? Math.round((completedSessions.length / totalSessions) * 100)
        : 0;

    const timedSessions = completedSessions.filter((s) => s.completedAt && s.startedAt);
    const avgDurationMs = timedSessions.length > 0
        ? timedSessions.reduce((sum, s) =>
            sum + (new Date(s.completedAt) - new Date(s.startedAt)), 0
        ) / timedSessions.length
        : 0;

    return {
        totalSessions,
        completionRate,
        avgDuration: Math.round(avgDurationMs / 1000), // seconds
    };
}

// ── Raw per-event export (CSV) ────────────────────────────────

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const EVENT_CSV_HEADER = [
    'sessionId', 'participantId', 'sessionStatus', 'eventType',
    'timestamp', 'x', 'y', 'element', 'frameId', 'metadata',
];

export async function buildEventsCsv(testId) {
    const sessions = await Session.find({ test: testId })
        .select('events participant status')
        .lean();

    const rows = [EVENT_CSV_HEADER.join(',')];

    for (const session of sessions) {
        const sessionId = session._id.toString();
        const participantId = session.participant?.id
            ? session.participant.id.toString()
            : '';

        for (const event of session.events || []) {
            const metadata = event.metadata && Object.keys(event.metadata).length
                ? JSON.stringify(event.metadata)
                : '';

            rows.push([
                sessionId,
                participantId,
                session.status,
                event.type,
                event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
                event.coordinates?.x ?? '',
                event.coordinates?.y ?? '',
                event.element ?? '',
                event.frameId ?? '',
                metadata,
            ].map(csvEscape).join(','));
        }
    }

    return rows.join('\n');
}

// ── Aggregated analytics export (multi-sheet XLSX) ────────────

function addSheet(workbook, name, columns, rows) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };
    if (rows.length > 0) sheet.addRows(rows);
}

export async function buildAnalyticsWorkbook(testId) {
    const [
        elementStats,
        confusionZones,
        dwellTimes,
        sectionInsights,
        flow,
        scrollDepth,
        sessionStats,
    ] = await Promise.all([
        computeElementStats(testId),
        detectConfusionZones(testId),
        getDwellTimeSummary(testId),
        generateSectionInsights(testId),
        computeNavigationPaths(testId, { topN: 10 }),
        computeScrollDepth(testId),
        computeSessionStats(testId),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Beacon';
    workbook.created = new Date();

    addSheet(workbook, 'Summary',
        [
            { header: 'Metric', key: 'metric', width: 32 },
            { header: 'Value', key: 'value', width: 20 },
        ],
        [
            { metric: 'Total Sessions', value: sessionStats.totalSessions },
            { metric: 'Completion Rate (%)', value: sessionStats.completionRate },
            { metric: 'Avg Session Duration (s)', value: sessionStats.avgDuration },
            { metric: 'Confusion Zones Detected', value: confusionZones.length },
            { metric: 'Avg Max Scroll Depth (px)', value: scrollDepth.avgMaxDepth },
            { metric: 'Scroll Dropoff Point (px)', value: scrollDepth.dropoffPoint },
        ]
    );

    addSheet(workbook, 'Elements',
        [
            { header: 'Element', key: 'element', width: 32 },
            { header: 'Clicks', key: 'clicks', width: 10 },
            { header: 'Hovers', key: 'hovers', width: 10 },
            { header: 'Scrolls', key: 'scrolls', width: 10 },
            { header: 'Task Completes', key: 'taskCompletes', width: 15 },
            { header: 'Total Interactions', key: 'totalInteractions', width: 18 },
            { header: 'Sessions', key: 'sessionCount', width: 10 },
        ],
        elementStats.elements
    );

    addSheet(workbook, 'Confusion',
        [
            { header: 'Element', key: 'element', width: 32 },
            { header: 'Type', key: 'type', width: 14 },
            { header: 'Severity (0-1)', key: 'severity', width: 14 },
            { header: 'Affected Sessions', key: 'affectedSessions', width: 17 },
            { header: 'Avg Dwell (ms)', key: 'avgDwellTimeMs', width: 15 },
            { header: 'Details', key: 'details', width: 60 },
        ],
        confusionZones
    );

    addSheet(workbook, 'Dwell Times',
        [
            { header: 'Element', key: 'element', width: 32 },
            { header: 'Total Dwell (ms)', key: 'totalDwellMs', width: 17 },
            { header: 'Avg Dwell (ms)', key: 'avgDwellMs', width: 15 },
            { header: 'Sessions', key: 'sessionCount', width: 10 },
        ],
        dwellTimes
    );

    addSheet(workbook, 'Sections',
        [
            { header: 'Frame ID', key: 'frameId', width: 20 },
            { header: 'Label', key: 'label', width: 24 },
            { header: 'Order', key: 'order', width: 8 },
            { header: 'Reached', key: 'reachedCount', width: 10 },
            { header: 'Total Sessions', key: 'totalSessions', width: 15 },
            { header: 'Reached Ratio', key: 'reachedRatio', width: 14 },
            { header: 'Avg Dwell (ms)', key: 'avgDwellMs', width: 15 },
            { header: 'Backtracks', key: 'backtrackCount', width: 12 },
            { header: 'Outcome', key: 'outcome', width: 20 },
            { header: 'Confidence (0-1)', key: 'confidence', width: 16 },
            { header: 'Explanation', key: 'explanation', width: 60 },
        ],
        sectionInsights.sections
    );

    addSheet(workbook, 'Flow - Top Paths',
        [
            { header: 'Path', key: 'path', width: 60 },
            { header: 'Count', key: 'count', width: 10 },
            { header: 'Percentage', key: 'percentage', width: 12 },
        ],
        flow.paths.map((p) => ({ ...p, path: p.path.join(' -> ') }))
    );

    addSheet(workbook, 'Flow - Dropoffs',
        [
            { header: 'Element', key: 'element', width: 32 },
            { header: 'Dropoff Rate', key: 'dropoffRate', width: 14 },
        ],
        flow.dropoffPoints
    );

    addSheet(workbook, 'Scroll Depth',
        [
            { header: 'Y Position (px)', key: 'y', width: 16 },
            { header: 'Sessions Reached', key: 'sessionsReached', width: 18 },
            { header: 'Percentage', key: 'percentage', width: 12 },
        ],
        scrollDepth.depthDistribution
    );

    return workbook.xlsx.writeBuffer();
}
