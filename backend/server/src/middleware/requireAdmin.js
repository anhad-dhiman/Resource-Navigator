import { HttpError } from './errors.js';

export const SESSION_COOKIE = 'admin_session';

/**
 * Requires a valid admin session cookie and sets req.admin.
 * @param {{authService: ReturnType<import('../services/authService.js').createAuthService>, roles?: string[]}} deps
 *   roles: restrict to these roles; omit to allow any admin role.
 */
export function requireAdmin({ authService, roles }) {
  return async (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    const user = token ? await authService.verify(token) : null;
    if (!user) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (roles && !roles.includes(user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Your account does not have permission to do this.');
    }
    req.admin = user;
    next();
  };
}
