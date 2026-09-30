const jwt = require('jsonwebtoken');
const { HttpError } = require('../errors');

function authenticate(jwtSecret) {
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new HttpError(401, 'Missing or invalid Authorization header'));
    }
    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch {
      next(new HttpError(401, 'Invalid or expired token'));
    }
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return next(new HttpError(403, 'Forbidden'));
    }
    next();
  };
}

// Admins can act on any user; regular users only on themselves.
// Must run after idParamSchema validation so req.params.id is a number.
function requireSelfOrAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.id === req.params.id) return next();
  next(new HttpError(403, 'Forbidden'));
}

module.exports = { authenticate, requireRole, requireSelfOrAdmin };
