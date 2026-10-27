import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/services/authService.js';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const PASSWORD = 'correct horse battery';
let hash;
beforeAll(async () => {
  hash = await bcrypt.hash(PASSWORD, 4);
});

function makeApp(users) {
  const adminRepository = {
    findByUsername: vi.fn(
      async (u) => users.find((x) => x.username.toLowerCase() === u.toLowerCase()) ?? null,
    ),
    findById: vi.fn(async (id) => {
      const u = users.find((x) => x.user_id === id);
      return u ? { user_id: u.user_id, username: u.username, role: u.role } : null;
    }),
  };
  const authService = createAuthService({ adminRepository, jwtSecret: SECRET });
  return { app: createApp({ repository: {}, authService, logRequests: false }), adminRepository };
}

let users;
let app;
beforeEach(() => {
  users = [
    { user_id: 1, username: 'alice', password_hash: hash, role: 'administrator' },
    { user_id: 2, username: 'mo', password_hash: hash, role: 'moderator' },
  ];
  ({ app } = makeApp(users));
});

function sessionCookie(res) {
  return res.headers['set-cookie']?.find((c) => c.startsWith('admin_session='));
}

describe('POST /api/admin/login', () => {
  it('sets an httpOnly, SameSite=Strict session cookie and never returns the token', async () => {
    const res = await request(app).post('/api/admin/login').send({ username: 'alice', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { user_id: 1, username: 'alice', role: 'administrator' } });
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/admin/);
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/); // no JWT in the body
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  it('lets moderators sign in too', async () => {
    const res = await request(app).post('/api/admin/login').send({ username: 'MO', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('moderator');
  });

  it.each([
    ['wrong password', { username: 'alice', password: 'nope' }],
    ['unknown user', { username: 'ghost', password: PASSWORD }],
  ])('returns the same 401 for a %s', async (_label, body) => {
    const res = await request(app).post('/api/admin/login').send(body);
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' });
    expect(sessionCookie(res)).toBeUndefined();
  });

  it.each([
    {},
    { username: 'alice' },
    { username: '  ', password: 'x' },
    { username: ['alice'], password: 'x' },
  ])('rejects malformed body %j', async (body) => {
    const res = await request(app).post('/api/admin/login').send(body);
    expect(res.status).toBe(400);
  });

  it('rate-limits repeated failed attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/admin/login').send({ username: 'alice', password: 'bad' });
    }
    const res = await request(app).post('/api/admin/login').send({ username: 'alice', password: PASSWORD });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('GET /api/admin/me', () => {
  it('returns the signed-in user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/admin/login').send({ username: 'alice', password: PASSWORD });
    const res = await agent.get('/api/admin/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ user_id: 1, username: 'alice', role: 'administrator' });
  });

  it('is never cached', async () => {
    const agent = request.agent(app);
    await agent.post('/api/admin/login').send({ username: 'alice', password: PASSWORD });
    const res = await agent.get('/api/admin/me');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('requires a session', async () => {
    const res = await request(app).get('/api/admin/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each([
    [
      'a forged signature',
      jwt.sign({ sub: '1' }, 'some-other-secret-that-is-long-enough!!', { algorithm: 'HS256' }),
    ],
    ['an expired token', jwt.sign({ sub: '1' }, SECRET, { algorithm: 'HS256', expiresIn: -10 })],
    ['an unsigned token', jwt.sign({ sub: '1' }, null, { algorithm: 'none' })],
    ['garbage', 'not-a-token'],
  ])('rejects %s', async (_label, token) => {
    const res = await request(app).get('/api/admin/me').set('Cookie', `admin_session=${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects a valid token for an account that has been deleted', async () => {
    const agent = request.agent(app);
    await agent.post('/api/admin/login').send({ username: 'alice', password: PASSWORD });
    users.splice(0, 1);
    expect((await agent.get('/api/admin/me')).status).toBe(401);
  });

  it('ignores a token sent as a Bearer header', async () => {
    const token = jwt.sign({ sub: '1' }, SECRET, { algorithm: 'HS256' });
    const res = await request(app).get('/api/admin/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/logout', () => {
  it('clears the session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/admin/login').send({ username: 'alice', password: PASSWORD });
    const res = await agent.post('/api/admin/logout');
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await agent.get('/api/admin/me')).status).toBe(401);
  });
});

describe('without an auth service', () => {
  it('does not mount admin routes', async () => {
    const plain = createApp({ repository: {}, logRequests: false });
    expect((await request(plain).post('/api/admin/login').send({})).status).toBe(404);
  });
});

describe('createAuthService', () => {
  it('refuses a short secret', () => {
    expect(() => createAuthService({ adminRepository: {}, jwtSecret: 'short' })).toThrow(/at least 32/);
  });
});
