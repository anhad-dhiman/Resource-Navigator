import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { IRRELEVANT_MESSAGE, NO_RESULTS_MESSAGE } from '../src/services/searchService.js';
import { createAbuseGuard, PAUSED_MESSAGE } from '../src/middleware/abuseGuard.js';

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
    findByIds: vi.fn().mockResolvedValue([ROW]),
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

const NEED = {
  intent: 'need',
  urgency: 'none',
  categories: ['Food'],
  keywords: ['food', 'bank'],
  city: 'Surrey',
  provider: 'gemini',
};

function fakeAi(overrides = {}) {
  return {
    enabled: true,
    interpret: vi.fn().mockResolvedValue(NEED),
    summarize: vi
      .fn()
      .mockResolvedValue({ summary: 'These food banks give groceries in Surrey.', provider: 'gemini' }),
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
      urgency: null,
      ai: { interpreted_by: null },
      summary_available: false,
    });
    expect(res.body.results[0]).toEqual({
      resource_id: 8,
      service_name: 'Surrey Food Bank',
      service_type: 'Food',
      description: 'Food hampers',
      physical_address: 'Unit 1 - 13478 78th Avenue',
      city: 'Surrey',
      contact_phone: '604-581-5443',
      official_url: 'https://surreyfoodbank.org',
      operating_hours: 'Mon-Fri',
      eligibility_criteria: 'Photo ID',
      language_support: 'English',
      verification: { status: 'Verified', last_reviewed_at: '2026-09-15T00:00:00.000Z' },
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
      summary_available: false,
      message: NO_RESULTS_MESSAGE,
    });
  });

  it('treats input with no letters as irrelevant without searching', async () => {
    const res = await request(app).post('/api/search').send({ query: '!!! 123 ???' });
    expect(res.body).toMatchObject({ status: 'irrelevant', message: IRRELEVANT_MESSAGE, results: [] });
    expect(repository.searchText).not.toHaveBeenCalled();
  });

  it('accepts letters in any language', async () => {
    const res = await request(app).post('/api/search').send({ query: '食物' });
    expect(res.body.status).not.toBe('irrelevant');
  });

  describe('with AI', () => {
    let ai;
    beforeEach(() => {
      ai = fakeAi();
      app = createApp({ repository, ai, logRequests: false });
    });

    it('interprets with database values and returns cards, with a summary to fetch next', async () => {
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
        urgency: null,
        interpreted: {
          intent: 'need',
          urgency: 'none',
          categories: ['Food'],
          keywords: ['food', 'bank'],
          city: 'Surrey',
        },
        ai: { interpreted_by: 'gemini' },
        summary_available: true,
      });
      // The summary is a separate request, so cards come back without waiting for it.
      expect(ai.summarize).not.toHaveBeenCalled();
    });

    it('lets the city filter win over a city named in the query', async () => {
      await request(app).post('/api/search').send({ query: 'food in surrey', city: 'Vancouver' });
      expect(repository.search).toHaveBeenCalledWith(expect.objectContaining({ city: 'Vancouver' }));
    });

    it('flags emergencies and still returns results', async () => {
      ai.interpret.mockResolvedValue({ ...NEED, urgency: 'emergency', categories: ['Health'] });
      const res = await request(app).post('/api/search').send({ query: 'I got into an accident. Help' });
      expect(res.body).toMatchObject({ status: 'ok', urgency: 'emergency' });
    });

    it('flags self-harm even when nothing matches', async () => {
      ai.interpret.mockResolvedValue({ ...NEED, urgency: 'self_harm', categories: [], keywords: [] });
      const res = await request(app).post('/api/search').send({ query: 'I want to hurt myself' });
      expect(res.body).toMatchObject({ status: 'no_results', urgency: 'self_harm' });
    });

    it.each(['off_topic', 'gibberish'])('answers a %s query with a message and no search', async (intent) => {
      ai.interpret.mockResolvedValue({ ...NEED, intent });
      const res = await request(app).post('/api/search').send({ query: 'what is 2+2' });
      expect(res.body).toMatchObject({
        status: 'irrelevant',
        message: IRRELEVANT_MESSAGE,
        summary_available: false,
      });
      expect(repository.search).not.toHaveBeenCalled();
    });

    it('falls back to database text search when every AI provider fails', async () => {
      ai.interpret.mockResolvedValue(null);
      const res = await request(app).post('/api/search').send({ query: 'food bank' });
      expect(repository.searchText).toHaveBeenCalled();
      expect(res.body).toMatchObject({
        status: 'ok',
        interpreted: null,
        ai: { interpreted_by: null },
        summary_available: false,
      });
    });

    it('skips the database when the AI finds no service type or keyword', async () => {
      ai.interpret.mockResolvedValue({ ...NEED, categories: [], keywords: [] });
      const res = await request(app).post('/api/search').send({ query: 'help' });
      expect(res.body.status).toBe('no_results');
      expect(repository.search).not.toHaveBeenCalled();
    });

    it('does not call the AI for invalid input', async () => {
      await request(app).post('/api/search').send({ query: '' });
      expect(ai.interpret).not.toHaveBeenCalled();
    });
  });

  describe('pausing repeated unrelated searches', () => {
    let ai;
    let now;
    beforeEach(() => {
      now = 1_000_000;
      ai = fakeAi({ interpret: vi.fn().mockResolvedValue({ ...NEED, intent: 'off_topic' }) });
      const abuseGuard = createAbuseGuard({ now: () => now });
      app = createApp({ repository, ai, abuseGuard, logRequests: false });
    });

    it('warns on the second, pauses on the third, and lifts the pause after 30 minutes', async () => {
      const search = () => request(app).post('/api/search').send({ query: 'tell me a joke' });
      expect((await search()).body.message).toBe(IRRELEVANT_MESSAGE);
      expect((await search()).body.message).toMatch(
        /Another unrelated search will pause search for 30 minutes/,
      );
      expect((await search()).body.message).toBe(PAUSED_MESSAGE);

      const paused = await search();
      expect(paused.status).toBe(429);
      expect(paused.body.error.code).toBe('SEARCH_PAUSED');
      expect(paused.headers['retry-after']).toBe('1800');
      const summary = await request(app)
        .post('/api/search/summary')
        .send({ query: 'food', resource_ids: [8] });
      expect(summary.status).toBe(429);

      now += 30 * 60_000 + 1;
      expect((await search()).status).toBe(200);
    });

    it('never counts real needs', async () => {
      ai.interpret.mockResolvedValue(NEED);
      for (let i = 0; i < 5; i++) {
        expect((await request(app).post('/api/search').send({ query: 'food' })).status).toBe(200);
      }
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

describe('POST /api/search/summary', () => {
  it('summarizes the given cards, loaded fresh from the database', async () => {
    const ai = fakeAi();
    app = createApp({ repository, ai, logRequests: false });
    const res = await request(app)
      .post('/api/search/summary')
      .send({ query: ' food bank ', resource_ids: [8, 8] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      summary: 'These food banks give groceries in Surrey.',
      ai: { summarized_by: 'gemini' },
    });
    expect(repository.findByIds).toHaveBeenCalledWith([8]);
    expect(ai.summarize).toHaveBeenCalledWith({ query: 'food bank', candidates: [ROW] });
  });

  it('returns a null summary when the AI fails or is not configured', async () => {
    app = createApp({
      repository,
      ai: fakeAi({ summarize: vi.fn().mockResolvedValue(null) }),
      logRequests: false,
    });
    expect(
      (
        await request(app)
          .post('/api/search/summary')
          .send({ query: 'food', resource_ids: [8] })
      ).body,
    ).toEqual({
      summary: null,
      ai: { summarized_by: null },
    });
    app = createApp({ repository, logRequests: false });
    expect(
      (
        await request(app)
          .post('/api/search/summary')
          .send({ query: 'food', resource_ids: [8] })
      ).body.summary,
    ).toBeNull();
  });

  it.each([
    [{ query: 'food' }],
    [{ query: 'food', resource_ids: [] }],
    [{ query: 'food', resource_ids: [0] }],
    [{ query: 'food', resource_ids: ['8'] }],
    [{ query: 'food', resource_ids: Array.from({ length: 21 }, (_, i) => i + 1) }],
    [{ query: '', resource_ids: [8] }],
  ])('rejects %j', async (body) => {
    const res = await request(app).post('/api/search/summary').send(body);
    expect(res.status).toBe(400);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });
});

describe('GET /api/resources', () => {
  it('lists public resources', async () => {
    const res = await request(app).get('/api/resources');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
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
  it('returns a public resource', async () => {
    const res = await request(app).get('/api/resources/8');
    expect(res.status).toBe(200);
    expect(res.body.resource.service_name).toBe('Surrey Food Bank');
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
