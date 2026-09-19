// Shared between sectionInsightsService.js (the classifier) and Test.js (the
// owner-override sub-schema) — kept in its own file so the model doesn't
// import the service, which itself imports the model.
export const SECTION_OUTCOMES = {
    SKIPPED: 'skipped',
    INSUFFICIENT_ATTENTION: 'insufficient_attention',
    PROLONGED_DWELL: 'prolonged_dwell',
    LIKELY_CONFUSION: 'likely_confusion',
    LIKELY_HIGH_INTEREST: 'likely_high_interest',
    REPEATED_NAVIGATION: 'repeated_navigation',
    NORMAL: 'normal',
};
