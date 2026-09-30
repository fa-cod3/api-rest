const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setup, register, JWT_SECRET } = require('./helpers');

describe('auth', () => {
  let app;

  beforeEach(async () => {
    ({ app } = await setup());
  });

  test('health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('registers a user and returns a token without the password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ANA@example.com ', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ana', email: 'ana@example.com', role: 'user' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.token).toEqual(expect.any(String));
  });

  test('rejects invalid registration data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });

  test('rejects duplicate emails with 409', async () => {
    await register(app);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'ana@example.com', password: 'secret123' });

    expect(res.status).toBe(409);
  });

  test('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON body');
  });

  test('logs in with valid credentials', async () => {
    await register(app);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.token).toEqual(expect.any(String));
  });

  test.each([
    ['wrong password', { email: 'ana@example.com', password: 'wrongpass' }],
    ['unknown email', { email: 'nobody@example.com', password: 'secret123' }],
  ])('rejects login with %s', async (_, body) => {
    await register(app);
    const res = await request(app).post('/api/auth/login').send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('GET /me returns the current user', async () => {
    const { token } = await register(app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@example.com');
  });

  test('GET /me requires a valid token', async () => {
    const missing = await request(app).get('/api/auth/me');
    expect(missing.status).toBe(401);

    const forged = jwt.sign({ sub: '1', role: 'admin' }, 'wrong-secret');
    const invalid = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(invalid.status).toBe(401);

    const expired = jwt.sign({ sub: '1', role: 'user' }, JWT_SECRET, { expiresIn: -10 });
    const old = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(old.status).toBe(401);
  });

  test('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/);
  });
});
