import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Workspace name is required'],
        trim: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    boards: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
