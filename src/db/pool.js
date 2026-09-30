const { Pool } = require('pg');
const config = require('../config');

function createPool(connectionString = config.databaseUrl) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new Pool({ connectionString });
}

module.exports = { createPool };
