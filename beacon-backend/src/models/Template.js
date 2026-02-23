import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Template name is required'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['UX Research', 'Development', 'Business', 'Design'],
    },
    color: {
        type: String,
        default: '#4262ff',
    },
    popular: {
        type: Boolean,
        default: false,
    },
    miroBoardId: {
        type: String,
        default: null,
    },
    thumbnailUrl: {
        type: String,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // null = system template
    },
}, {
    timestamps: true,
});

// ── Indexes ──────────────────────────────────────────────────
templateSchema.index({ category: 1 });
templateSchema.index({ popular: -1, createdAt: -1 });

const Template = mongoose.model('Template', templateSchema);
export default Template;
