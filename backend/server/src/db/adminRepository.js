// Data access for admin_users. All SQL is parameterized.

/**
 * @param {import('pg').Pool} pool
 */
export function createAdminRepository(pool) {
  return {
    /**
     * @param {string} username Case-insensitive.
     * @returns {Promise<{user_id: number, username: string, password_hash: string, role: string}|null>}
     */
    async findByUsername(username) {
      const { rows } = await pool.query(
        'SELECT user_id, username, password_hash, role FROM admin_users WHERE lower(username) = lower($1)',
        [username],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {number} userId
     * @returns {Promise<{user_id: number, username: string, role: string}|null>} Never includes the hash.
     */
    async findById(userId) {
      const { rows } = await pool.query(
        'SELECT user_id, username, role FROM admin_users WHERE user_id = $1',
        [userId],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {{username: string, passwordHash: string, role: 'administrator'|'moderator'}} user
     * @returns {Promise<{user_id: number, username: string, role: string}>}
     */
    async create({ username, passwordHash, role }) {
      const { rows } = await pool.query(
        `INSERT INTO admin_users (username, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING user_id, username, role`,
        [username, passwordHash, role],
      );
      return rows[0];
    },
  };
}
