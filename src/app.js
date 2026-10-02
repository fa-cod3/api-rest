const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createUserRepository } = require('./repositories/userRepository');
const { authRouter } = require('./routes/auth');
const { usersRouter } = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp({ db, jwtSecret, jwtExpiresIn = '1h', corsOrigin = '*' }) {
  if (!jwtSecret) throw new Error('JWT_SECRET is not set');

  const app = express();
  const users = createUserRepository(db);

  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (req, res) => {
    res.json({
      name: 'FA Code REST API',
      docs: 'https://github.com/fa-cod3/api-rest',
      endpoints: ['/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/me', '/api/users'],
    });
  });

  app.get('/api/health', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter({ users, jwtSecret, jwtExpiresIn }));
  app.use('/api/users', usersRouter({ users, jwtSecret }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
