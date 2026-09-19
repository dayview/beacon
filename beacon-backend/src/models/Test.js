import mongoose from 'mongoose';
import { SECTION_OUTCOMES } from '../constants/sectionOutcomes.js';

const taskSchema = new mongoose.Schema({
    id: { type: String },
    description: { type: String },
    targetElement: { type: String },
    successCriteria: { type: String },
    order: { type: Number },
}, { _id: false });

// The owner's own read on a section, confirming or correcting
// sectionInsightsService's classifier. One entry per frameId; setting
// again replaces the existing entry rather than appending.
const sectionOverrideSchema = new mongoose.Schema({
    frameId: { type: String, required: true },
    outcome: { type: String, enum: Object.values(SECTION_OUTCOMES), required: true },
    note: { type: String, default: null },
    overriddenAt: { type: Date, default: Date.now },
}, { _id: false });

const testSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Test name is required'],
        trim: true,
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: [true, 'Board reference is required'],
    },
    researcher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Researcher reference is required'],
    },
    type: {
        type: String,
        enum: ['solo', 'live-session', 'remote'],
        default: 'solo',
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'completed'],
        default: 'draft',
    },
    tasks: [taskSchema],
    sectionOverrides: [sectionOverrideSchema],
    settings: {
        recordScreen: { type: Boolean, default: false },
        captureEvents: { type: Boolean, default: true },
        maxParticipants: { type: Number, default: 10 },
        minSampleSize: { type: Number, default: 5 }, // completed sessions below this are flagged low-confidence
        duration: { type: Number, default: null }, // minutes
        consentCopy: { type: String, default: null }, // owner-editable consent notice; null falls back to Participate's fixed default text
        retentionDays: { type: Number, default: 90 }, // session data older than this surfaces a warning in LiveAnalytics; no automatic deletion
    },
    createdAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    isTestData: { type: Boolean, default: false, index: true },
    // Read-only viewer credential, separate from the owner's own accessToken —
    // grants no write access and only exposes summary stats (see
    // GET /api/analytics/:testId/shared). Null until the owner generates one;
    // regenerating rotates it, invalidating any previously shared link.
    shareToken: { type: String, default: null },
});

// ── Indexes ──────────────────────────────────────────────────
testSchema.index({ researcher: 1 });
testSchema.index({ board: 1 });
testSchema.index({ status: 1 });

const Test = mongoose.model('Test', testSchema);
export default Test;
