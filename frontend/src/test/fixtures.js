import { vi } from 'vitest';
export const RESOURCE = {
  resource_id: 8,
  service_name: 'Surrey Food Bank',
  service_type: 'Food',
  description: 'Provides food hampers.',
  physical_address: 'Unit 1 - 13478 78th Avenue',
  city: 'Surrey',
  contact_phone: '604-581-5443',
  official_url: 'https://surreyfoodbank.org',
  operating_hours: 'Mon-Fri 9am-1pm',
  eligibility_criteria: 'Photo ID required',
  language_support: 'English',
  verification: { status: 'Verified', last_reviewed_at: '2026-09-15T00:00:00.000Z' },
};

/** A fetch mock that answers by "METHOD path". */
export function mockFetch(routes) {
  return vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    if (!handler)
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      };
    const {
      status = 200,
      body,
      networkError,
      notJson,
    } = typeof handler === 'function' ? handler(options) : handler;
    if (networkError) throw new TypeError('Failed to fetch');
    return {
      ok: status < 400,
      status,
      json: async () => {
        if (notJson) throw new SyntaxError('Unexpected end of JSON input');
        return body;
      },
    };
  });
}
