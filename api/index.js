// Vercel serverless entry point: reuses the Express app with a lazily migrated pool.
const config = require('../src/config');
const { createPool } = require('../src/db/pool');
const { migrate } = require('../src/db/migrate');
const { createApp } = require('../src/app');

let ready;

function init() {
  if (!ready) {
    const db = createPool();
    ready = migrate(db).then(() =>
      createApp({
        db,
        jwtSecret: config.jwtSecret,
        jwtExpiresIn: config.jwtExpiresIn,
        corsOrigin: config.corsOrigin,
      })
    );
    ready.catch(() => {
      ready = undefined;
    });
  }
  return ready;
}

module.exports = async (req, res) => {
  const app = await init();
  return app(req, res);
};
