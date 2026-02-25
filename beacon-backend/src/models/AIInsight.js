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
        confusionZones: [
            {
                id: { type: String, default: null },
                label: { type: String, default: '' },
                problem: { type: String, default: '' },
                fix: { type: String, default: '' },
                severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
                boundingBox: {
                    x: { type: Number, default: 0 },
                    y: { type: Number, default: 0 },
                    width: { type: Number, default: 0 },
                    height: { type: Number, default: 0 }
                },
                relatedElementIds: [{ type: String }],
                clamped: { type: Boolean, default: false }
            }
        ],
    },
    lowConfidence: { type: Boolean, default: false },
    cost: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
    isTestData: { type: Boolean, default: false, index: true },
});

// ── Indexes ──────────────────────────────────────────────────
aiInsightSchema.index({ test: 1 });
aiInsightSchema.index({ session: 1 });

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);
export default AIInsight;
