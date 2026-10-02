# REST API — Node.js + Express + PostgreSQL

[![CI](https://github.com/fa-cod3/api-rest/actions/workflows/ci.yml/badge.svg)](https://github.com/fa-cod3/api-rest/actions/workflows/ci.yml)

A production-style REST API for user management with JWT authentication, role-based access control, input validation and a full automated test suite.

**Live API:** https://fa-code-api.vercel.app (deployed on Vercel with a Neon PostgreSQL database), e.g. [`/api/health`](https://fa-code-api.vercel.app/api/health)

## Features

- 🔐 **JWT authentication**: register, login and a `/me` endpoint
- 👥 **User CRUD** with pagination
- 🛡️ **Role-based access**: users manage their own account, while admins manage everyone
- ✅ **Input validation** with [zod], returning clear per-field error messages
- 🔑 Passwords hashed with **bcrypt**, never returned by the API
- 🧱 Security headers (**helmet**), **CORS** and request size limits
- 🧪 **31 integration tests** (Jest + Supertest) running against an in-memory PostgreSQL
- 🐳 `docker-compose` for a local PostgreSQL, plus GitHub Actions CI

## Tech stack

| Layer | Tools |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Database | PostgreSQL (`pg`) |
| Auth | JSON Web Tokens, bcryptjs |
| Validation | zod |
| Testing | Jest, Supertest, pg-mem |

## Getting started

```bash
git clone https://github.com/fa-cod3/api-rest.git
cd api-rest
npm install

# Start PostgreSQL (or point DATABASE_URL at your own instance)
docker compose up -d

cp .env.example .env   # then set a strong JWT_SECRET
npm run dev            # creates the schema and starts http://localhost:3000
```

Run the tests (no database needed):

```bash
npm test
```

## API

All responses are JSON. Protected endpoints need an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create an account, returns `{ user, token }` |
| `POST` | `/api/auth/login` | — | Log in, returns `{ user, token }` |
| `GET` | `/api/auth/me` | ✔ | Current user |

### Users

| Method | Endpoint | Who | Description |
|---|---|---|---|
| `GET` | `/api/users?page=1&limit=20` | any user | Paginated list |
| `POST` | `/api/users` | admin | Create a user |
| `GET` | `/api/users/:id` | any user | Get one user |
| `PUT` | `/api/users/:id` | self or admin | Update `name`, `email`, `password` (and `role`, admin only) |
| `DELETE` | `/api/users/:id` | self or admin | Delete a user |

### Health

`GET /api/health` returns `{ "status": "ok" }` when the API and database are reachable.

### Example

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"secret123"}'

# Use the returned token
curl http://localhost:3000/api/users -H "Authorization: Bearer <token>"
```

Validation errors look like this:

```json
{
  "error": "Validation failed",
  "details": [{ "field": "email", "message": "Invalid email" }]
}
```

| Status | Meaning |
|---|---|
| `400` | Invalid body, query or JSON |
| `401` | Missing, invalid or expired token, or wrong credentials |
| `403` | Authenticated but not allowed |
| `404` | Resource or route not found |
| `409` | Email already registered |

### Creating the first admin

Register normally, then promote the account in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## Project structure

```
src/
├── app.js                 # Express app factory (injectable DB, used by tests)
├── server.js              # Entry point: connects, migrates, listens
├── config.js              # Environment variables
├── schemas.js             # zod validation schemas
├── errors.js              # HttpError
├── db/                    # Pool, schema.sql, migration
├── middleware/            # auth, validation, error handling
├── repositories/          # SQL queries (parameterized)
└── routes/                # auth and users endpoints
tests/                     # Jest + Supertest integration tests
```

## License

MIT

[zod]: https://zod.dev
