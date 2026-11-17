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
    searchText: vi.fn().mockResolvedValue([ROW]),
    findById: vi.fn().mockResolvedValue(ROW),
    list: vi.fn().mockResolvedValue([ROW]),
    listServiceTypes: vi.fn().mockResolvedValue(['Food', 'Housing']),
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

function fakeAi(overrides = {}) {
  return {
    enabled: true,
    interpret: vi.fn().mockResolvedValue({
      categories: ['Food'],
      keywords: ['food', 'bank'],
      city: 'Surrey',
      provider: 'gemini',
    }),
    explain: vi.fn().mockResolvedValue({
      explanations: new Map([[8, 'Gives food hampers in Surrey.']]),
      provider: 'gemini',
    }),
    ...overrides,
  };
}

describe('POST /api/search', () => {
  it('without AI, matches the query text in the database and returns cards with provenance', async () => {
    const res = await request(app).post('/api/search').send({ query: 'Food bank in Surrey', city: 'surrey' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      city: 'Surrey',
      interpreted: null,
      ai: { interpreted_by: null, explained_by: null },
    });
    expect(res.body.results[0]).toMatchObject({
      resource_id: 8,
      official_url: 'https://surreyfoodbank.org',
      verification: { status: 'Verified', last_reviewed_at: '2026-09-15T00:00:00.000Z' },
      match_explanation: null,
    });
    expect(repository.searchText).toHaveBeenCalledWith({
      query: 'Food bank in Surrey',
      city: 'Surrey',
      limit: 20,
    });
    expect(repository.search).not.toHaveBeenCalled();
  });

  it('returns the 211 BC message when nothing matches', async () => {
    repository.searchText.mockResolvedValue([]);
    const res = await request(app).post('/api/search').send({ query: 'xyzzy' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'no_results',
      count: 0,
      results: [],
      message: NO_RESULTS_MESSAGE,
    });
  });

  describe('with AI', () => {
    let ai;
    beforeEach(() => {
      ai = fakeAi();
      app = createApp({ repository, ai, logRequests: false });
    });

    it('interprets with database values, searches, and adds the explanations', async () => {
      const res = await request(app).post('/api/search').send({ query: 'food bank in surrey' });
      expect(ai.interpret).toHaveBeenCalledWith({
        query: 'food bank in surrey',
        serviceTypes: ['Food', 'Housing'],
        cities: ['Surrey', 'Vancouver'],
      });
      expect(repository.search).toHaveBeenCalledWith({
        categories: ['Food'],
        keywords: ['food', 'bank'],
        city: 'Surrey',
        limit: 20,
      });
      expect(res.body).toMatchObject({
        status: 'ok',
        city: 'Surrey',
        interpreted: { categories: ['Food'], keywords: ['food', 'bank'], city: 'Surrey' },
        ai: { interpreted_by: 'gemini', explained_by: 'gemini' },
      });
      expect(res.body.results[0].match_explanation).toBe('Gives food hampers in Surrey.');
      // The explain step only ever sees rows that came from the database.
      expect(ai.explain).toHaveBeenCalledWith({ query: 'food bank in surrey', candidates: [ROW] });
    });

    it('lets the city filter win over a city named in the query', async () => {
      await request(app).post('/api/search').send({ query: 'food in surrey', city: 'Vancouver' });
      expect(repository.search).toHaveBeenCalledWith(expect.objectContaining({ city: 'Vancouver' }));
    });

    it('falls back to database text search when every AI provider fails', async () => {
      ai.interpret.mockResolvedValue(null);
      ai.explain.mockResolvedValue(null);
      const res = await request(app).post('/api/search').send({ query: 'food bank' });
      expect(repository.searchText).toHaveBeenCalled();
      expect(ai.explain).not.toHaveBeenCalled();
      expect(res.body).toMatchObject({
        status: 'ok',
        interpreted: null,
        ai: { interpreted_by: null, explained_by: null },
      });
      expect(res.body.results[0].match_explanation).toBeNull();
    });

    it('returns the cards without explanations when only the explain step fails', async () => {
      ai.explain.mockResolvedValue(null);
      const res = await request(app).post('/api/search').send({ query: 'food bank' });
      expect(res.body.ai).toEqual({ interpreted_by: 'gemini', explained_by: null });
      expect(res.body.results[0].match_explanation).toBeNull();
    });

    it('skips the database and the explain step when the AI finds no need', async () => {
      ai.interpret.mockResolvedValue({ categories: [], keywords: [], city: null, provider: 'gemini' });
      const res = await request(app).post('/api/search').send({ query: 'hello' });
      expect(res.body.status).toBe('no_results');
      expect(repository.search).not.toHaveBeenCalled();
      expect(ai.explain).not.toHaveBeenCalled();
    });

    it('does not call the AI for invalid input', async () => {
      await request(app).post('/api/search').send({ query: '' });
      expect(ai.interpret).not.toHaveBeenCalled();
    });
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
    expect(repository.searchText).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/search').set('content-type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_BODY');
  });

  it('hides internal details when the database fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repository.searchText.mockRejectedValue(new Error('connection refused at 10.0.0.5'));
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

describe('GET /api/resources', () => {
  it('lists public resources without match_explanation', async () => {
    const res = await request(app).get('/api/resources');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.resources[0]).not.toHaveProperty('match_explanation');
    expect(repository.list).toHaveBeenCalledWith({ city: null, serviceType: null });
  });

  it('passes city and type filters through', async () => {
    await request(app).get('/api/resources?city=Surrey&type=Food');
    expect(repository.list).toHaveBeenCalledWith({ city: 'Surrey', serviceType: 'Food' });
  });

  it('rejects repeated or oversized filters', async () => {
    expect((await request(app).get('/api/resources?city=a&city=b')).status).toBe(400);
    expect((await request(app).get(`/api/resources?type=${'x'.repeat(101)}`)).status).toBe(400);
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

  it('GET /api/service-types lists service types', async () => {
    const res = await request(app).get('/api/service-types');
    expect(res.body).toEqual({ service_types: ['Food', 'Housing'] });
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
