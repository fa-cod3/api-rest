const request = require('supertest');
const { setup, register, createAdmin } = require('./helpers');

describe('users', () => {
  let app;
  let users;
  let ana;
  let admin;

  const auth = (session) => ({ Authorization: `Bearer ${session.token}` });

  beforeEach(async () => {
    ({ app, users } = await setup());
    ana = await register(app);
    admin = await createAdmin(app, users);
  });

  test('all endpoints require authentication', async () => {
    const responses = await Promise.all([
      request(app).get('/api/users'),
      request(app).post('/api/users').send({}),
      request(app).get('/api/users/1'),
      request(app).put('/api/users/1').send({ name: 'x' }),
      request(app).delete('/api/users/1'),
    ]);
    responses.forEach((res) => expect(res.status).toBe(401));
  });

  describe('GET /api/users', () => {
    test('lists users with pagination', async () => {
      await register(app, { email: 'bob@example.com', name: 'Bob' });

      const res = await request(app).get('/api/users?page=1&limit=2').set(auth(ana));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3 });
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).not.toHaveProperty('passwordHash');

      const page2 = await request(app).get('/api/users?page=2&limit=2').set(auth(ana));
      expect(page2.body.data).toHaveLength(1);
    });

    test('rejects invalid pagination params', async () => {
      const res = await request(app).get('/api/users?limit=500').set(auth(ana));
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/:id', () => {
    test('returns a user', async () => {
      const res = await request(app).get(`/api/users/${ana.user.id}`).set(auth(ana));
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('ana@example.com');
    });

    test('returns 404 for a missing user', async () => {
      const res = await request(app).get('/api/users/9999').set(auth(ana));
      expect(res.status).toBe(404);
    });

    test('returns 400 for a non-numeric id', async () => {
      const res = await request(app).get('/api/users/abc').set(auth(ana));
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/users', () => {
    const newUser = { name: 'Carla', email: 'carla@example.com', password: 'secret123' };

    test('admins can create users', async () => {
      const res = await request(app).post('/api/users').set(auth(admin)).send(newUser);
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ name: 'Carla', role: 'user' });
    });

    test('regular users cannot create users', async () => {
      const res = await request(app).post('/api/users').set(auth(ana)).send(newUser);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    test('users can update themselves', async () => {
      const res = await request(app)
        .put(`/api/users/${ana.user.id}`)
        .set(auth(ana))
        .send({ name: 'Ana María' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Ana María');
    });

    test('changing the password lets the user log in with the new one', async () => {
      await request(app)
        .put(`/api/users/${ana.user.id}`)
        .set(auth(ana))
        .send({ password: 'newsecret99' });

      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@example.com', password: 'secret123' });
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@example.com', password: 'newsecret99' });

      expect(oldLogin.status).toBe(401);
      expect(newLogin.status).toBe(200);
    });

    test('users cannot update other users', async () => {
      const res = await request(app)
        .put(`/api/users/${admin.user.id}`)
        .set(auth(ana))
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });

    test('users cannot promote themselves', async () => {
      const res = await request(app)
        .put(`/api/users/${ana.user.id}`)
        .set(auth(ana))
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
    });

    test('admins can update any user, including role', async () => {
      const res = await request(app)
        .put(`/api/users/${ana.user.id}`)
        .set(auth(admin))
        .send({ role: 'admin' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });

    test('rejects unknown fields and empty bodies', async () => {
      const unknown = await request(app)
        .put(`/api/users/${ana.user.id}`)
        .set(auth(ana))
        .send({ isAdmin: true });
      const empty = await request(app).put(`/api/users/${ana.user.id}`).set(auth(ana)).send({});

      expect(unknown.status).toBe(400);
      expect(empty.status).toBe(400);
    });

    test('returns 409 when the new email is taken', async () => {
      const res = await request(app)
        .put(`/api/users/${ana.user.id}`)
        .set(auth(ana))
        .send({ email: 'admin@example.com' });
      expect(res.status).toBe(409);
    });

    test('returns 404 when an admin updates a missing user', async () => {
      const res = await request(app).put('/api/users/9999').set(auth(admin)).send({ name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('users can delete themselves', async () => {
      const res = await request(app).delete(`/api/users/${ana.user.id}`).set(auth(ana));
      expect(res.status).toBe(204);

      const after = await request(app).get(`/api/users/${ana.user.id}`).set(auth(admin));
      expect(after.status).toBe(404);
    });

    test('users cannot delete other users', async () => {
      const res = await request(app).delete(`/api/users/${admin.user.id}`).set(auth(ana));
      expect(res.status).toBe(403);
    });

    test('admins can delete any user', async () => {
      const res = await request(app).delete(`/api/users/${ana.user.id}`).set(auth(admin));
      expect(res.status).toBe(204);
    });

    test('returns 404 for a missing user', async () => {
      const res = await request(app).delete('/api/users/9999').set(auth(admin));
      expect(res.status).toBe(404);
    });
  });
});
