import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '../services/encryptionService.js';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    role: {
        type: String,
        enum: ['researcher', 'participant', 'admin'],
        default: 'researcher',
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
    },
    plan: {
        tier: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free',
        },
        aiProvider: {
            type: String,
            enum: ['openai', 'anthropic', 'custom', null],
            default: null,
        },
        aiApiKey: {
            type: String, // stored encrypted
            default: null,
        },
        recordingEnabled: {
            type: Boolean,
            default: false,
        },
    },
    miroTokens: {
        accessToken: { type: String, default: null },   // stored encrypted
        refreshToken: { type: String, default: null },   // stored encrypted
        expiresAt: { type: Date, default: null },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ── Indexes ──────────────────────────────────────────────────
userSchema.index({ email: 1 });

// ── Pre-save: hash password ──────────────────────────────────
userSchema.pre('save', async function (next) {
    // Only hash if passwordHash is being set with a plaintext value
    if (!this.isModified('passwordHash')) return next();
    try {
        this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
        next();
    } catch (err) {
        next(err);
    }
});

// ── Methods ──────────────────────────────────────────────────

/**
 * Compare a candidate password against the stored hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Generate a signed JWT for this user.
 */
userSchema.methods.generateToken = function () {
    return jwt.sign(
        { id: this._id, email: this.email, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Set the AI API key (encrypts before storing).
 */
userSchema.methods.setAiApiKey = function (plainKey) {
    this.plan.aiApiKey = plainKey ? encrypt(plainKey) : null;
};

/**
 * Get the decrypted AI API key.
 */
userSchema.methods.getAiApiKey = function () {
    return this.plan.aiApiKey ? decrypt(this.plan.aiApiKey) : null;
};

/**
 * Set Miro tokens (encrypts before storing).
 */
userSchema.methods.setMiroTokens = function ({ accessToken, refreshToken, expiresAt }) {
    this.miroTokens = {
        accessToken: accessToken ? encrypt(accessToken) : null,
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        expiresAt: expiresAt || null,
    };
};

/**
 * Get decrypted Miro tokens.
 */
userSchema.methods.getMiroTokens = function () {
    return {
        accessToken: this.miroTokens.accessToken ? decrypt(this.miroTokens.accessToken) : null,
        refreshToken: this.miroTokens.refreshToken ? decrypt(this.miroTokens.refreshToken) : null,
        expiresAt: this.miroTokens.expiresAt,
    };
};

/**
 * Return a safe user object (no secrets).
 */
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        role: this.role,
        workspace: this.workspace,
        plan: {
            tier: this.plan.tier,
            aiProvider: this.plan.aiProvider,
            recordingEnabled: this.plan.recordingEnabled,
            hasAiKey: !!this.plan.aiApiKey,
        },
        hasMiroConnected: !!(this.miroTokens && this.miroTokens.accessToken),
        createdAt: this.createdAt,
    };
};

const User = mongoose.model('User', userSchema);
export default User;
