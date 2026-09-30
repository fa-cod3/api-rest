const express = require('express');
const bcrypt = require('bcryptjs');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole, requireSelfOrAdmin } = require('../middleware/auth');
const { registerSchema, updateUserSchema, idParamSchema, paginationSchema } = require('../schemas');
const { HttpError } = require('../errors');

function usersRouter({ users, jwtSecret }) {
  const router = express.Router();

  router.use(authenticate(jwtSecret));

  router.get('/', validate(paginationSchema, 'query'), async (req, res) => {
    const { page, limit } = req.query;
    const { users: data, total } = await users.list({ limit, offset: (page - 1) * limit });
    res.json({ data, page, limit, total });
  });

  router.post('/', requireRole('admin'), validate(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await users.create({ name, email, passwordHash });
    res.status(201).json({ user });
  });

  router.get('/:id', validate(idParamSchema, 'params'), async (req, res) => {
    const user = await users.findById(req.params.id);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user });
  });

  router.put(
    '/:id',
    validate(idParamSchema, 'params'),
    requireSelfOrAdmin,
    validate(updateUserSchema),
    async (req, res) => {
      const { password, role, ...rest } = req.body;
      if (role !== undefined && req.user.role !== 'admin') {
        throw new HttpError(403, 'Only admins can change roles');
      }
      const changes = { ...rest, role };
      if (password) changes.passwordHash = await bcrypt.hash(password, 10);

      const user = await users.update(req.params.id, changes);
      if (!user) throw new HttpError(404, 'User not found');
      res.json({ user });
    }
  );

  router.delete('/:id', validate(idParamSchema, 'params'), requireSelfOrAdmin, async (req, res) => {
    const deleted = await users.remove(req.params.id);
    if (!deleted) throw new HttpError(404, 'User not found');
    res.status(204).end();
  });

  return router;
}

module.exports = { usersRouter };
