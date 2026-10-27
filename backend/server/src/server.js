import { config } from './config.js';
import { createPool } from './db/pool.js';
import { createResourceRepository } from './db/resourceRepository.js';
import { createAdminRepository } from './db/adminRepository.js';
import { createAuthService, MIN_JWT_SECRET_LENGTH } from './services/authService.js';
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

const app = createApp({
  repository: createResourceRepository(pool),
  authService,
  secureCookies: config.secureCookies,
  corsOrigins: config.corsOrigins,
  maxQueryLength: config.maxQueryLength,
  maxResults: config.maxResults,
});

const server = app.listen(config.port, () => {
  console.log(`Resource Navigator API listening on port ${config.port}`);
});

function shutdown() {
  server.close(() => pool.end());
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
