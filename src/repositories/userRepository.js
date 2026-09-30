const PUBLIC_COLUMNS = 'id, name, email, role, created_at, updated_at';

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createUserRepository(db) {
  return {
    async list({ limit, offset }) {
      const { rows } = await db.query(
        `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const count = await db.query('SELECT COUNT(*) AS total FROM users');
      return { users: rows.map(toUser), total: Number(count.rows[0].total) };
    },

    async findById(id) {
      const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
      return toUser(rows[0]);
    },

    async findByEmailWithPassword(email) {
      const { rows } = await db.query(
        `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
        [email]
      );
      if (!rows[0]) return null;
      return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
    },

    async create({ name, email, passwordHash, role = 'user' }) {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING ${PUBLIC_COLUMNS}`,
        [name, email, passwordHash, role]
      );
      return toUser(rows[0]);
    },

    // Only the fields that are defined get updated.
    async update(id, { name, email, passwordHash, role }) {
      const fields = { name, email, password_hash: passwordHash, role };
      const sets = [];
      const values = [];
      for (const [column, value] of Object.entries(fields)) {
        if (value !== undefined) {
          values.push(value);
          sets.push(`${column} = $${values.length}`);
        }
      }
      if (sets.length === 0) return this.findById(id);

      values.push(id);
      const { rows } = await db.query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING ${PUBLIC_COLUMNS}`,
        values
      );
      return toUser(rows[0]);
    },

    async remove(id) {
      const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

module.exports = { createUserRepository };
