import mongoose from 'mongoose';

/**
 * Builds the Mongo filter for Session.find given optional analytics
 * filters. `sessionId` and `role` narrow which sessions are included in a
 * query; section filtering (by Miro frame) happens per-event instead, via
 * filterEventsBySection below, since a session can touch multiple sections.
 *
 * An invalid/unknown sessionId resolves to a query that matches nothing
 * (rather than throwing a Mongoose CastError on a malformed ObjectId),
 * since this is reachable directly via query params, not just the UI's
 * own dropdown.
 */
export function buildSessionQuery(testId, { sessionId, role } = {}) {
    const query = { test: testId };
    if (sessionId) {
        query._id = mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null;
    }
    if (role) {
        query['participant.demographics.role'] = role;
    }
    return query;
}

/** Narrows a session's events down to one board section (Miro frame ID), or returns them unchanged. */
export function filterEventsBySection(events, sectionId) {
    if (!sectionId) return events || [];
    return (events || []).filter((e) => e.frameId === sectionId);
}
