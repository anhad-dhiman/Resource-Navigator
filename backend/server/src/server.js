import { config } from './config.js';
import { createPool } from './db/pool.js';
import { createResourceRepository } from './db/resourceRepository.js';
import { createAdminRepository } from './db/adminRepository.js';
import { createAuthService, MIN_JWT_SECRET_LENGTH } from './services/authService.js';
import { createAiFromConfig } from './ai/index.js';
import { createApp } from './app.js';

const pool = createPool();

let authService;
if (config.jwtSecret && config.jwtSecret.length >= MIN_JWT_SECRET_LENGTH) {
  authService = createAuthService({
    adminRepository: createAdminRepository(pool),
    jwtSecret: config.jwtSecret,
  });
} else {
  console.warn(
    `JWT_SECRET is missing or shorter than ${MIN_JWT_SECRET_LENGTH} characters: admin routes are disabled. See .env.example.`,
  );
}

const ai = createAiFromConfig({ gemini: config.gemini, groq: config.groq, timeoutMs: config.aiTimeoutMs });
console.log(
  ai.enabled
    ? `AI providers: ${[config.gemini.apiKey && `gemini (${config.gemini.model})`, config.groq.apiKey && `groq (${config.groq.model})`].filter(Boolean).join(', then ')}`
    : 'No AI API keys set: search uses database full-text matching only. See .env.example.',
);

const app = createApp({
  repository: createResourceRepository(pool),
  ai,
  trustProxy: config.trustProxy,
  authService,
  secureCookies: config.secureCookies,
  corsOrigins: config.corsOrigins,
  maxQueryLength: config.maxQueryLength,
  maxResults: config.maxResults,
});

const server = app.listen(config.port, () => {
  console.log(`Resource Navigator API listening on port ${config.port}`);
});
// Keep idle connections open longer than proxies in front of the API (the Vite dev
// proxy, hosting load balancers) so they never reuse a socket this server just closed.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown() {
  server.close(() => pool.end());
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
