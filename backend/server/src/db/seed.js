import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPool } from './pool.js';

const SEED_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seeds', 'resources.json');

const RESOURCE_FIELDS = [
  'service_type',
  'service_name',
  'description',
  'physical_address',
  'city',
  'contact_phone',
  'official_url',
  'operating_hours',
  'eligibility_criteria',
  'language_support',
];
const REVIEW_FIELDS = ['verification_status', 'verification_evidence', 'reviewed_at', 'next_review_due'];

/**
 * Replaces all resources and reviews with the seed file contents, in one transaction.
 * Each record is {resource: {...}, review: {...}}.
 * @param {import('pg').Pool} pool
 * @param {string} [file]
 * @returns {Promise<number>} Number of resources inserted.
 */
export async function seed(pool, file = SEED_FILE) {
  const records = JSON.parse(await readFile(file, 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE resource_reviews, verified_resources RESTART IDENTITY');
    for (const { resource, review } of records) {
      const { rows } = await client.query(
        `INSERT INTO verified_resources (${RESOURCE_FIELDS.join(', ')})
         VALUES (${RESOURCE_FIELDS.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING resource_id`,
        RESOURCE_FIELDS.map((f) => resource[f] ?? null),
      );
      await client.query(
        `INSERT INTO resource_reviews (resource_id, ${REVIEW_FIELDS.join(', ')})
         VALUES ($1, ${REVIEW_FIELDS.map((_, i) => `$${i + 2}`).join(', ')})`,
        [rows[0].resource_id, ...REVIEW_FIELDS.map((f) => review[f] ?? null)],
      );
    }
    await client.query('COMMIT');
    return records.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = createPool();
  seed(pool)
    .then((n) => console.log(`Seeded ${n} resources`))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
