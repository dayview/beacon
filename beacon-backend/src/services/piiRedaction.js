// Participants are already fully anonymous (no accounts) — the one place
// they can type free text is Session.participant.demographics (e.g. the
// "role" field on Participate's pre-start screen). Nothing stops someone
// typing a name, email, or phone number in there instead of "Designer".
// This scrubs the obvious identifying patterns before storage, without
// touching plain role text researchers actually filter/group by.

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?\d[\d\-.\s]{6,}\d)/g;

function redactString(value) {
    return value.replace(EMAIL_PATTERN, '[redacted]').replace(PHONE_PATTERN, '[redacted]');
}

/**
 * Redacts email- and phone-number-like substrings from every own string
 * value in a demographics object. Non-string values pass through unchanged.
 */
export function redactDemographics(demographics) {
    if (!demographics || typeof demographics !== 'object') return demographics;

    const redacted = {};
    for (const [key, value] of Object.entries(demographics)) {
        redacted[key] = typeof value === 'string' ? redactString(value) : value;
    }
    return redacted;
}
