import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactDemographics } from '../src/services/piiRedaction.js';

test('plain role text passes through untouched', () => {
    assert.deepEqual(redactDemographics({ role: 'Designer' }), { role: 'Designer' });
});

test('an embedded email address is redacted', () => {
    const result = redactDemographics({ role: 'Reach me at jane.doe@example.com for feedback' });
    assert.equal(result.role, 'Reach me at [redacted] for feedback');
});

test('an embedded phone number is redacted', () => {
    const result = redactDemographics({ role: 'PM, call me at 555-123-4567' });
    assert.equal(result.role, 'PM, call me at [redacted]');
});

test('non-string values pass through unchanged', () => {
    const result = redactDemographics({ role: 'Engineer', yearsExperience: 5, tags: ['a', 'b'] });
    assert.equal(result.role, 'Engineer');
    assert.equal(result.yearsExperience, 5);
    assert.deepEqual(result.tags, ['a', 'b']);
});

test('null/undefined/non-object input passes through unchanged', () => {
    assert.equal(redactDemographics(null), null);
    assert.equal(redactDemographics(undefined), undefined);
});

test('empty demographics object stays empty', () => {
    assert.deepEqual(redactDemographics({}), {});
});
