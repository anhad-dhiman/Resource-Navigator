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
  // AI providers, tried in this order. A provider without a key is skipped;
  // with no keys at all, search falls back to the database's full-text matching.
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  },
  // Per AI call, per provider.
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 4000,
  maxQueryLength: 500,
  maxResults: 20,
};
