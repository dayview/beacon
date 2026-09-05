import mongoose from 'mongoose';

const elementSchema = new mongoose.Schema({
    miroId: { type: String },
    type: {
        type: String,
        enum: ['frame', 'sticky', 'shape', 'text'],
    },
    // The containing frame's Miro item ID, if this element sits inside one.
    // Comes straight from Miro API v2's `parent.id` on the item — not computed.
    parentFrameId: { type: String, default: null },
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
    thumbnailUrl: { type: String, default: null },
    sharingPolicy: { type: String, default: null },
    elements: [elementSchema],
    lastSyncedAt: { type: Date, default: null },
});

const Board = mongoose.model('Board', boardSchema);
export default Board;
