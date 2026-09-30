const bcrypt = require('bcryptjs');
const request = require('supertest');
const { newDb } = require('pg-mem');
const { createApp } = require('../src/app');
const { migrate } = require('../src/db/migrate');
const { createUserRepository } = require('../src/repositories/userRepository');

const JWT_SECRET = 'test-secret';

// Builds an app backed by a fresh in-memory PostgreSQL database.
async function setup() {
  const { Pool } = newDb().adapters.createPg();
  const db = new Pool();
  await migrate(db);
  const app = createApp({ db, jwtSecret: JWT_SECRET });
  return { app, db, users: createUserRepository(db) };
}

async function register(app, overrides = {}) {
  const body = { name: 'Ana', email: 'ana@example.com', password: 'secret123', ...overrides };
  const res = await request(app).post('/api/auth/register').send(body);
  return res.body;
}

async function createAdmin(app, users) {
  await users.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('adminpass1', 4),
    role: 'admin',
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'adminpass1' });
  return res.body;
}

module.exports = { setup, register, createAdmin, JWT_SECRET };
