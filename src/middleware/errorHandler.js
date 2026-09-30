const { HttpError } = require('../errors');

function notFound(req, res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  // PostgreSQL unique_violation: the only unique column is users.email
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Email is already registered' });
  }
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
