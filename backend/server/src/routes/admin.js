import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../middleware/errors.js';
import { requireAdmin, SESSION_COOKIE } from '../middleware/requireAdmin.js';
import { SESSION_TTL_SECONDS } from '../services/authService.js';

const MAX_USERNAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;

/**
 * Admin authentication routes under /api/admin.
 * The session token is only ever sent in an httpOnly cookie, never in a response body.
 * @param {{authService: object, secureCookies: boolean}} deps
 */
export function adminRouter({ authService, secureCookies }) {
  const router = Router();

  // Account data must never be cached by the browser or a proxy.
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  const cookieOptions = {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'strict',
    path: '/api/admin',
  };

  // Brute-force protection: failed attempts per IP; successful logins don't count.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
      },
    },
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body ?? {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password ||
      username.length > MAX_USERNAME_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      throw new HttpError(400, 'INVALID_CREDENTIALS_FORMAT', 'Please enter your username and password.');
    }

    const result = await authService.login(username.trim(), password);
    if (!result) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    res.cookie(SESSION_COOKIE, result.token, { ...cookieOptions, maxAge: SESSION_TTL_SECONDS * 1000 });
    res.json({ user: result.user });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json({ status: 'ok' });
  });

  // The signed-in account. The dashboard calls this to check the session.
  router.get('/me', requireAdmin({ authService }), (req, res) => {
    res.json({ user: req.admin });
  });

  return router;
}
