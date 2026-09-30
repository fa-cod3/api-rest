const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../schemas');
const { HttpError } = require('../errors');

function authRouter({ users, jwtSecret, jwtExpiresIn }) {
  const router = express.Router();

  const signToken = (user) =>
    jwt.sign({ sub: String(user.id), role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });

  router.post('/register', validate(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await users.create({ name, email, passwordHash });
    res.status(201).json({ user, token: signToken(user) });
  });

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const found = await users.findByEmailWithPassword(email);
    if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    const { passwordHash, ...user } = found;
    res.json({ user, token: signToken(user) });
  });

  router.get('/me', authenticate(jwtSecret), async (req, res) => {
    const user = await users.findById(req.user.id);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user });
  });

  return router;
}

module.exports = { authRouter };
