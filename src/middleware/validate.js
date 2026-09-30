const { HttpError } = require('../errors');

// Validates req[source] against a zod schema and replaces it with the parsed value.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new HttpError(400, 'Validation failed', details));
    }
    // req.query is a getter in Express 5, so define the property instead of assigning it.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
}

module.exports = { validate };
