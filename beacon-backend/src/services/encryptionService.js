import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended nonce length for GCM

function getKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    // Accept a 64-char hex string → 32-byte buffer
    return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM. Unlike CBC, GCM is
 * authenticated: the auth tag lets decrypt() detect any tampering with the
 * ciphertext instead of silently returning corrupted plaintext.
 * Returns "iv:authTag:encrypted" as a hex-encoded string.
 */
export function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an "iv:authTag:encrypted" hex string back to plaintext. Throws if
 * the ciphertext or auth tag has been tampered with, or doesn't match this
 * format (e.g. a value encrypted under the old CBC scheme).
 */
export function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Malformed or outdated ciphertext.');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
