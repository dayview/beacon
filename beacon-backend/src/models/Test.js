import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    id: { type: String },
    description: { type: String },
    targetElement: { type: String },
    successCriteria: { type: String },
    order: { type: Number },
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
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'completed'],
        default: 'draft',
    },
    tasks: [taskSchema],
    settings: {
        recordScreen: { type: Boolean, default: false },
        captureEvents: { type: Boolean, default: true },
        maxParticipants: { type: Number, default: 10 },
        duration: { type: Number, default: null }, // minutes
    },
    createdAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
});

// ── Indexes ──────────────────────────────────────────────────
testSchema.index({ researcher: 1 });
testSchema.index({ board: 1 });
testSchema.index({ status: 1 });

const Test = mongoose.model('Test', testSchema);
export default Test;
