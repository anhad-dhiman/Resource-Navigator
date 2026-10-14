// The only module that talks to the backend. Every call sends and receives JSON,
// the same requests you would make in Postman (see backend/docs/api.md).

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/** An error from the API, with a message that is safe to show to the user. */
export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const listeners = new Set();

/**
 * Subscribes to every request/response pair, for the JSON developer panel.
 * @param {(exchange: object) => void} listener
 * @returns {() => void} Unsubscribe function.
 */
export function onExchange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function request(method, path, body) {
  const started = performance.now();
  const exchange = { method, path, request: body ?? null, at: new Date().toISOString() };
  let res;
  let data = null;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    data = await res.json().catch(() => null);
  } catch {
    listeners.forEach((l) => l({ ...exchange, status: 0, response: null, ms: performance.now() - started }));
    throw new ApiError(
      'NETWORK_ERROR',
      'We could not reach the service. Please check your connection and try again.',
      0,
    );
  }

  listeners.forEach((l) =>
    l({ ...exchange, status: res.status, response: data, ms: performance.now() - started }),
  );

  if (!res.ok) {
    throw new ApiError(
      data?.error?.code ?? 'UNKNOWN',
      data?.error?.message ?? 'Something went wrong. Please try again later.',
      res.status,
    );
  }
  return data;
}

function queryString(params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return qs.size ? `?${qs}` : '';
}

export const api = {
  /**
   * POST /api/search
   * @param {{query: string, city?: string}} input
   * @returns {Promise<{status: 'ok'|'no_results', interpreted: object, city: string|null, count: number, results: object[], message?: string}>}
   */
  search: ({ query, city }) => request('POST', '/api/search', { query, ...(city && { city }) }),

  /** GET /api/resources/:id → {resource} */
  getResource: (id) => request('GET', `/api/resources/${encodeURIComponent(id)}`),

  /** GET /api/resources?city=&type= → {count, resources} */
  listResources: ({ city, type } = {}) => request('GET', `/api/resources${queryString({ city, type })}`),

  /** GET /api/cities → {cities} */
  listCities: () => request('GET', '/api/cities'),

  /** GET /api/service-types → {service_types} */
  listServiceTypes: () => request('GET', '/api/service-types'),
};
