const config = require('./config');
const { createPool } = require('./db/pool');
const { migrate } = require('./db/migrate');
const { createApp } = require('./app');

async function start() {
  const db = createPool();
  await migrate(db);

  const app = createApp({
    db,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    corsOrigin: config.corsOrigin,
  });

  const server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });

  const shutdown = () => {
    server.close(() => db.end().then(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
