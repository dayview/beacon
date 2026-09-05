import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

let encrypt, decrypt;

before(async () => {
    // encryptionService reads ENCRYPTION_KEY lazily (inside each call), so
    // it's fine to set it here rather than needing it at process start.
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    ({ encrypt, decrypt } = await import('../src/services/encryptionService.js'));
});

test('encrypt/decrypt round-trips a plaintext string', () => {
    const plaintext = 'super-secret-miro-access-token';
    const ciphertext = encrypt(plaintext);
    assert.equal(decrypt(ciphertext), plaintext);
});

test('ciphertext is not the plaintext, and uses the iv:authTag:encrypted format', () => {
    const ciphertext = encrypt('hello world');
    assert.notEqual(ciphertext, 'hello world');
    assert.equal(ciphertext.split(':').length, 3);
});

test('a tampered ciphertext body is rejected, not silently decrypted', () => {
    const ciphertext = encrypt('super-secret-miro-access-token');
    const [iv, tag, body] = ciphertext.split(':');
    const flippedLastByte = body.slice(0, -2) + (body.slice(-2) === '00' ? '11' : '00');
    assert.throws(() => decrypt(`${iv}:${tag}:${flippedLastByte}`));
});

test('a tampered auth tag is rejected', () => {
    const ciphertext = encrypt('super-secret-miro-access-token');
    const [iv, , body] = ciphertext.split(':');
    assert.throws(() => decrypt(`${iv}:${'00'.repeat(16)}:${body}`));
});

test('a value in the old CBC "iv:encrypted" (2-part) format is rejected cleanly', () => {
    assert.throws(() => decrypt('aabbccddeeff00112233445566778899:deadbeef'));
});

test('null/empty input passes through unchanged for both encrypt and decrypt', () => {
    assert.equal(encrypt(null), null);
    assert.equal(decrypt(null), null);
    assert.equal(encrypt(''), '');
});
