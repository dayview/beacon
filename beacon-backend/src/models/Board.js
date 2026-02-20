import mongoose from 'mongoose';

const elementSchema = new mongoose.Schema({
    miroId: { type: String },
    type: {
        type: String,
        enum: ['frame', 'sticky', 'shape', 'text'],
    },
    bounds: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
    },
    content: { type: String, default: '' },
}, { _id: false });

const boardSchema = new mongoose.Schema({
    miroId: {
        type: String,
        unique: true,
        required: [true, 'Miro board ID is required'],
    },
    name: {
        type: String,
        required: [true, 'Board name is required'],
        trim: true,
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
    },
    thumbnailUrl: { type: String, default: null },
    elements: [elementSchema],
    lastSyncedAt: { type: Date, default: null },
});

// ── Indexes ──────────────────────────────────────────────────
boardSchema.index({ miroId: 1 });
boardSchema.index({ workspace: 1 });

const Board = mongoose.model('Board', boardSchema);
export default Board;
