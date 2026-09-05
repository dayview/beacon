import { body, param, query, validationResult } from 'express-validator';

/**
 * Process validation errors and return 400 if any exist.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map((e) => ({
                field: e.path,
                message: e.msg,
            })),
        });
    }
    next();
};

// ── Reusable validation chains ───────────────────────────────

export const objectIdParam = (paramName = 'id') => [
    param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName} format`),
];

export const testCreateValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Test name is required'),
    body('board')
        .notEmpty()
        .withMessage('Valid board ID is required'),
    body('tasks')
        .optional()
        .isArray()
        .withMessage('Tasks must be an array'),
    body('settings')
        .optional()
        .isObject()
        .withMessage('Settings must be an object'),
];

export const testUpdateValidation = [
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Test name cannot be empty'),
    body('status')
        .optional()
        .isIn(['draft', 'active', 'paused', 'completed'])
        .withMessage('Invalid status'),
    body('tasks')
        .optional()
        .isArray()
        .withMessage('Tasks must be an array'),
    body('settings')
        .optional()
        .isObject()
        .withMessage('Settings must be an object'),
];

export const testQueryValidation = [
    query('status')
        .optional()
        .isIn(['draft', 'active', 'paused', 'completed'])
        .withMessage('Invalid status filter'),
    query('workspace')
        .optional()
        .isMongoId()
        .withMessage('Invalid workspace ID'),
];
