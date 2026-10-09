// Runs against a real PostgreSQL database. Set TEST_DATABASE_URL to an empty
// database you don't mind being reset, e.g. a local resource_navigator_test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { createResourceRepository } from '../src/db/resourceRepository.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('database integration', () => {
  let pool;
  let repo;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    await pool.query(
      'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public',
    );
    await migrate(pool);
    await seed(pool);
    repo = createResourceRepository(pool);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('seeds every record with one review', async () => {
    const { rows } = await pool.query(
      'SELECT (SELECT count(*) FROM verified_resources)::int AS r, (SELECT count(*) FROM resource_reviews)::int AS v',
    );
    expect(rows[0].r).toBeGreaterThan(0);
    expect(rows[0].v).toBe(rows[0].r);
  });

  it('finds food banks in Surrey by category and city', async () => {
    const rows = await repo.search({
      categories: ['Food'],
      keywords: ['food', 'bank'],
      city: 'surrey',
      limit: 20,
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.city).toBe('Surrey');
    expect(rows[0].service_type).toBe('Food');
  });

  it('matches on full-text keywords without a category', async () => {
    const rows = await repo.search({ categories: [], keywords: ['tenancy'], city: null, limit: 20 });
    expect(rows.map((r) => r.service_type)).toContain('Legal Aid');
  });

  it('excludes a resource once its latest review is not Verified (FR9)', async () => {
    const [first] = await repo.search({ categories: ['Housing'], keywords: [], city: null, limit: 1 });
    await pool.query(
      "INSERT INTO resource_reviews (resource_id, reviewed_at, verification_status) VALUES ($1, now(), 'Flagged')",
      [first.resource_id],
    );
    expect(await repo.findById(first.resource_id)).toBeNull();
    const rows = await repo.search({ categories: ['Housing'], keywords: [], city: null, limit: 50 });
    expect(rows.map((r) => r.resource_id)).not.toContain(first.resource_id);
  });

  it('migrations are idempotent', async () => {
    expect(await migrate(pool)).toEqual([]);
  });
});
