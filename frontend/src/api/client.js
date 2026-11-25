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

const SECRET_FIELDS = ['password'];

/** Copy of a request body with secret fields masked, for the JSON panel. */
function redact(body) {
  if (!body) return null;
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, SECRET_FIELDS.includes(k) ? '••••••' : v]),
  );
}

const RETRY_DELAY_MS = 400;

/**
 * Sends one JSON request. With `retry`, a connection failure, or a 5xx response that
 * didn't come from our API (no JSON error body, e.g. a dropped connection at a proxy),
 * is retried once. Only used for read-only calls, so a retry can't do anything twice.
 */
async function request(method, path, body, { retry = false } = {}) {
  try {
    return await send(method, path, body);
  } catch (err) {
    if (!retry || !err.retryable) throw err;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return send(method, path, body);
  }
}

async function send(method, path, body) {
  const started = performance.now();
  const exchange = { method, path, request: redact(body), at: new Date().toISOString() };
  let res;
  let data = null;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
      // Sends the admin session cookie when the backend is on another origin (production).
      credentials: 'include',
    });
    data = await res.json().catch(() => null);
  } catch {
    listeners.forEach((l) => l({ ...exchange, status: 0, response: null, ms: performance.now() - started }));
    const error = new ApiError(
      'NETWORK_ERROR',
      'We could not reach the service. Please check your connection and try again.',
      0,
    );
    error.retryable = true;
    throw error;
  }

  listeners.forEach((l) =>
    l({ ...exchange, status: res.status, response: data, ms: performance.now() - started }),
  );

  if (!res.ok) {
    const error = new ApiError(
      data?.error?.code ?? 'UNKNOWN',
      data?.error?.message ?? 'Something went wrong. Please try again later.',
      res.status,
    );
    error.retryable = res.status >= 500 && !data?.error;
    throw error;
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
   * @returns {Promise<{status: 'ok'|'no_results'|'irrelevant', urgency: 'emergency'|'self_harm'|null, summary_available: boolean, interpreted: object|null, city: string|null, count: number, results: object[], message?: string}>}
   */
  search: ({ query, city }) =>
    request('POST', '/api/search', { query, ...(city && { city }) }, { retry: true }),

  /**
   * POST /api/search/summary: one AI summary for the cards a search returned.
   * @param {{query: string, resourceIds: number[]}} input
   * @returns {Promise<{summary: string|null, ai: {summarized_by: string|null}}>}
   */
  summary: ({ query, resourceIds }) =>
    request('POST', '/api/search/summary', { query, resource_ids: resourceIds }, { retry: true }),

  /** GET /api/resources/:id → {resource} */
  getResource: (id) => request('GET', `/api/resources/${encodeURIComponent(id)}`),

  /** GET /api/resources?city=&type= → {count, resources} */
  listResources: ({ city, type } = {}) => request('GET', `/api/resources${queryString({ city, type })}`),

  /** GET /api/cities → {cities} */
  listCities: () => request('GET', '/api/cities'),

  /** GET /api/service-types → {service_types} */
  listServiceTypes: () => request('GET', '/api/service-types'),

  admin: {
    /** POST /api/admin/login → {user}. The session is set as an httpOnly cookie, never returned. */
    login: ({ username, password }) => request('POST', '/api/admin/login', { username, password }),

    /** POST /api/admin/logout → {status} */
    logout: () => request('POST', '/api/admin/logout'),

    /** GET /api/admin/me → {user}. Throws ApiError with status 401 when not signed in. */
    me: () => request('GET', '/api/admin/me'),
  },
};
