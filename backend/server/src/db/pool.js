import pg from 'pg';
import { config } from '../config.js';

/**
 * Creates a PostgreSQL connection pool.
 * @param {string} [connectionString] Defaults to DATABASE_URL.
 * @returns {pg.Pool}
 */
export function createPool(connectionString = config.databaseUrl) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new pg.Pool({
    connectionString,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}
