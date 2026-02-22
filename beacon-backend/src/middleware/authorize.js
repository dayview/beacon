import Test from '../models/Test.js';
import Session from '../models/Session.js';

/**
 * Middleware: verify the authenticated user owns the test referenced by :testId.
 * Attach the test document to req.test for downstream handlers.
 */
export const authorizeTestOwner = (paramName = 'testId') => {
    return async (req, res, next) => {
        try {
            const testId = req.params[paramName];
            if (!testId) {
                return res.status(400).json({ error: `Missing ${paramName} parameter.` });
            }

            const test = await Test.findById(testId);
            if (!test) {
                return res.status(404).json({ error: 'Test not found.' });
            }

            if (!test.researcher.equals(req.user._id)) {
                return res.status(403).json({ error: 'Access denied. You do not own this test.' });
            }

            req.test = test;
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware: verify the authenticated user owns the test associated with a session.
 * Uses :id or :sessionId param to find the session, then checks test ownership.
 * Attaches session to req.session and test to req.test.
 */
export const authorizeSessionOwner = (paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const sessionId = req.params[paramName];
            if (!sessionId) {
                return res.status(400).json({ error: `Missing ${paramName} parameter.` });
            }

            const session = await Session.findById(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found.' });
            }

            const test = await Test.findById(session.test);
            if (!test) {
                return res.status(404).json({ error: 'Associated test not found.' });
            }

            if (!test.researcher.equals(req.user._id)) {
                return res.status(403).json({ error: 'Access denied. You do not own this test.' });
            }

            req.testDoc = test;
            req.sessionDoc = session;
            next();
        } catch (error) {
            next(error);
        }
    };
};
