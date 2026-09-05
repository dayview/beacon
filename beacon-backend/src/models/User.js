import mongoose from 'mongoose';
import crypto from 'crypto';
import { encrypt, decrypt } from '../services/encryptionService.js';

// No accounts, no passwords — a User is just the anonymous owner behind a
// private access link. `accessToken` is that link's secret: whoever holds
// it can act as this owner. There is nothing to register or log into.
const userSchema = new mongoose.Schema({
    accessToken: {
        type: String,
        unique: true,
        required: true,
        default: () => crypto.randomBytes(24).toString('hex'),
    },
    plan: {
        aiProvider: {
            type: String,
            enum: ['openai', 'openrouter', 'anthropic', 'custom', null],
            default: null,
        },
        aiApiKey: {
            type: String, // stored encrypted
            default: null,
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

// ── Methods ──────────────────────────────────────────────────

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
 * Return a safe user object (no secrets — accessToken is the secret and is
 * never included here; it's only ever returned directly from /auth/start).
 */
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        plan: {
            aiProvider: this.plan.aiProvider,
            hasAiKey: !!this.plan.aiApiKey,
        },
        hasMiroConnected: !!(this.miroTokens && this.miroTokens.accessToken),
        createdAt: this.createdAt,
    };
};

const User = mongoose.model('User', userSchema);
export default User;
