import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const ADMIN_ROLES = ['administrator', 'moderator'];
export const SESSION_TTL_SECONDS = 60 * 60;
export const BCRYPT_COST = 12;
export const MIN_JWT_SECRET_LENGTH = 32;

// Compared against when the username doesn't exist, so a login attempt takes
// the same time whether or not the account exists (no username enumeration).
const DUMMY_HASH = '$2b$12$kzmVyC/u7O/N5PdRp9ruqurKeSB1GcwGSOeiXvZJo4VTlCaY2VYo2';

/** Hashes a password for admin_users.password_hash. */
export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Admin authentication: checks credentials and issues/verifies session tokens.
 * @param {{adminRepository: ReturnType<import('../db/adminRepository.js').createAdminRepository>, jwtSecret: string}} deps
 */
export function createAuthService({ adminRepository, jwtSecret }) {
  if (!jwtSecret || jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  return {
    /**
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{user: {user_id: number, username: string, role: string}, token: string}|null>}
     *   null when the credentials are wrong.
     */
    async login(username, password) {
      const admin = await adminRepository.findByUsername(username);
      const valid = await bcrypt.compare(password, admin?.password_hash ?? DUMMY_HASH);
      if (!admin || !valid || !ADMIN_ROLES.includes(admin.role)) return null;

      const user = { user_id: admin.user_id, username: admin.username, role: admin.role };
      const token = jwt.sign({ sub: String(admin.user_id) }, jwtSecret, {
        algorithm: 'HS256',
        expiresIn: SESSION_TTL_SECONDS,
      });
      return { user, token };
    },

    /**
     * Verifies a session token and loads the account fresh from the database,
     * so deleted accounts and role changes take effect immediately.
     * @param {string} token
     * @returns {Promise<{user_id: number, username: string, role: string}|null>}
     */
    async verify(token) {
      let payload;
      try {
        payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      } catch {
        return null;
      }
      const userId = Number(payload.sub);
      if (!Number.isInteger(userId)) return null;
      const user = await adminRepository.findById(userId);
      return user && ADMIN_ROLES.includes(user.role) ? user : null;
    },
  };
}
