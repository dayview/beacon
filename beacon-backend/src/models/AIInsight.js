import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema({
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: [true, 'Test reference is required'],
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: null,
    },
    provider: { type: String, default: null },
    prompt: { type: String, default: null },
    insights: {
        summary: { type: String, default: '' },
        patterns: [{ type: String }],
        recommendations: [{ type: String }],
        sentiment: { type: String, default: 'neutral' },
    },
    cost: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
});

// ── Indexes ──────────────────────────────────────────────────
aiInsightSchema.index({ test: 1 });
aiInsightSchema.index({ session: 1 });

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);
export default AIInsight;
