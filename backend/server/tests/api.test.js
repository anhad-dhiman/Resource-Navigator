import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { NO_RESULTS_MESSAGE } from '../src/services/searchService.js';

const ROW = {
  resource_id: 8,
  service_type: 'Food',
  service_name: 'Surrey Food Bank',
  description: 'Food hampers',
  physical_address: 'Unit 1 - 13478 78th Avenue',
  city: 'Surrey',
  contact_phone: '604-581-5443',
  official_url: 'https://surreyfoodbank.org',
  operating_hours: 'Mon-Fri',
  eligibility_criteria: 'Photo ID',
  language_support: 'English',
  verification_status: 'Verified',
  last_reviewed_at: '2026-09-15T00:00:00.000Z',
};

function fakeRepository(overrides = {}) {
  return {
    search: vi.fn().mockResolvedValue([ROW]),
    findById: vi.fn().mockResolvedValue(ROW),
    listCities: vi.fn().mockResolvedValue(['Surrey', 'Vancouver']),
    ping: vi.fn().mockResolvedValue(),
    ...overrides,
  };
}

let repository;
let app;
beforeEach(() => {
  repository = fakeRepository();
  app = createApp({ repository, logRequests: false });
});

describe('POST /api/search', () => {
  it('returns resource cards with provenance from the database row', async () => {
    const res = await request(app).post('/api/search').send({ query: 'Food bank in Surrey', city: 'surrey' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.city).toBe('Surrey');
    expect(res.body.results[0]).toMatchObject({
      resource_id: 8,
      official_url: 'https://surreyfoodbank.org',
      verification: { status: 'Verified', last_reviewed_at: '2026-09-15T00:00:00.000Z' },
      match_explanation: null,
    });
    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['Food'], city: 'Surrey' }),
    );
  });

  it('returns the 211 BC message when nothing matches', async () => {
    repository.search.mockResolvedValue([]);
    const res = await request(app).post('/api/search').send({ query: 'xyzzy' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'no_results',
      count: 0,
      results: [],
      message: NO_RESULTS_MESSAGE,
    });
  });

  it('skips the database when the query has no usable words', async () => {
    const res = await request(app).post('/api/search').send({ query: 'I need help' });
    expect(res.body.status).toBe('no_results');
    expect(repository.search).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 'INVALID_QUERY'],
    [{ query: '   ' }, 'INVALID_QUERY'],
    [{ query: 42 }, 'INVALID_QUERY'],
    [{ query: 'a'.repeat(501) }, 'INVALID_QUERY'],
    [{ query: 'food\u0000' }, 'INVALID_QUERY'],
    [{ query: 'food', city: 'Toronto' }, 'INVALID_CITY'],
    [{ query: 'food', city: ['Surrey'] }, 'INVALID_CITY'],
  ])('rejects invalid input %j', async (body, code) => {
    const res = await request(app).post('/api/search').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(repository.search).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/search').set('content-type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_BODY');
  });

  it('hides internal details when the database fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repository.search.mockRejectedValue(new Error('connection refused at 10.0.0.5'));
    const res = await request(app).post('/api/search').send({ query: 'food' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
    errorSpy.mockRestore();
  });

  it('never logs the query text', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logged = createApp({ repository });
    await request(logged).post('/api/search?q=secret').send({ query: 'my private eviction situation' });
    const output = logSpy.mock.calls.flat().join(' ');
    expect(output).toContain('POST /api/search 200');
    expect(output).not.toContain('eviction');
    expect(output).not.toContain('secret');
    logSpy.mockRestore();
  });
});

describe('GET /api/resources/:id', () => {
  it('returns a public resource without match_explanation', async () => {
    const res = await request(app).get('/api/resources/8');
    expect(res.status).toBe(200);
    expect(res.body.resource.service_name).toBe('Surrey Food Bank');
    expect(res.body.resource).not.toHaveProperty('match_explanation');
  });

  it('returns 404 when the resource is missing or not verified', async () => {
    repository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/resources/99');
    expect(res.status).toBe(404);
  });

  it.each(['abc', '0', '-1', '1.5'])('rejects id %s', async (id) => {
    const res = await request(app).get(`/api/resources/${id}`);
    expect(res.status).toBe(400);
    expect(repository.findById).not.toHaveBeenCalled();
  });
});

describe('other routes', () => {
  it('GET /api/cities lists cities', async () => {
    const res = await request(app).get('/api/cities');
    expect(res.body).toEqual({ cities: ['Surrey', 'Vancouver'] });
  });

  it('GET /health reports database status', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok', database: 'ok' });
    repository.ping.mockRejectedValue(new Error('down'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('unreachable');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
