const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

async function migrate(db) {
  await db.query(schema);
}

if (require.main === module) {
  const { createPool } = require('./pool');
  const pool = createPool();
  migrate(pool)
    .then(() => console.log('Database schema is up to date'))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { migrate };
