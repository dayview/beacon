import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['click', 'hover', 'scroll', 'task_complete'],
    },
    timestamp: { type: Date, default: Date.now },
    coordinates: {
        x: { type: Number },
        y: { type: Number },
    },
    element: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: [true, 'Test reference is required'],
    },
    participant: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        demographics: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'in_progress',
    },
    events: [eventSchema],
    recording: {
        enabled: { type: Boolean, default: false },
        url: { type: String, default: null },
        duration: { type: Number, default: null }, // seconds
    },
    metrics: {
        taskCompletionRate: { type: Number, default: 0 },
        timeOnTask: { type: mongoose.Schema.Types.Mixed, default: {} },
        clickCount: { type: Number, default: 0 },
        pathEfficiency: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
});

// ── Indexes ──────────────────────────────────────────────────
sessionSchema.index({ test: 1 });
sessionSchema.index({ 'participant.id': 1 });
sessionSchema.index({ status: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
