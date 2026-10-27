import 'dotenv/config';

/** Runtime configuration, read once from environment variables. */
export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Signs admin session tokens. Admin routes are disabled when it is missing or too short.
  jwtSecret: process.env.JWT_SECRET,
  // Session cookies need HTTPS in production; plain HTTP is fine on localhost.
  secureCookies: process.env.NODE_ENV === 'production',
  maxQueryLength: 500,
  maxResults: 20,
};
