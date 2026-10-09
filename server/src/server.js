import { config } from './config.js';
import { createPool } from './db/pool.js';
import { createResourceRepository } from './db/resourceRepository.js';
import { createApp } from './app.js';

const pool = createPool();
const app = createApp({
  repository: createResourceRepository(pool),
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
