/**
 * Wraps an async Express route handler so rejected promises are
 * forwarded to next(err) instead of crashing the process.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
