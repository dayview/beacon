import mongoose from 'mongoose';

const heatmapSchema = new mongoose.Schema({
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: [true, 'Test reference is required'],
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: [true, 'Board reference is required'],
    },
    type: {
        type: String,
        enum: ['click', 'attention', 'scroll'],
        required: true,
    },
    data: [{
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        intensity: { type: Number, required: true },
    }],
    imageUrl: { type: String, default: null },
    generatedAt: { type: Date, default: Date.now },
});

// ── Indexes ──────────────────────────────────────────────────
heatmapSchema.index({ test: 1 });
heatmapSchema.index({ board: 1 });

const Heatmap = mongoose.model('Heatmap', heatmapSchema);
export default Heatmap;
