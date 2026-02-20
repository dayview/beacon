/**
 * WebSocket event name constants.
 */

// ── Participant → Server ─────────────────────────────────────
export const SESSION_JOIN = 'session:join';
export const SESSION_EVENT = 'session:event';
export const SESSION_COMPLETE = 'session:complete';

// ── Server → Researchers ─────────────────────────────────────
export const PARTICIPANT_JOINED = 'participant:joined';
export const PARTICIPANT_EVENT = 'participant:event';
export const PARTICIPANT_LEFT = 'participant:left';
export const TEST_UPDATED = 'test:updated';

// ── Server → Participants ────────────────────────────────────
export const TASK_UPDATE = 'task:update';
export const TEST_ENDED = 'test:ended';

// ── Connection ───────────────────────────────────────────────
export const CONNECT = 'connection';
export const DISCONNECT = 'disconnect';
export const ERROR = 'error';
