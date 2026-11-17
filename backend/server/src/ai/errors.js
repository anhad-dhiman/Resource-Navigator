/** A failed AI call. `code` is safe to log; it never contains the user's query. */
export class AiError extends Error {
  /**
   * @param {'not_configured'|'rate_limited'|'timeout'|'http_error'|'bad_response'} code
   * @param {string} provider
   * @param {string} [detail] Status or reason, for logs.
   */
  constructor(code, provider, detail = '') {
    super(`${provider}: ${code}${detail ? ` (${detail})` : ''}`);
    this.code = code;
    this.provider = provider;
  }
}

/**
 * POSTs JSON with a timeout and maps failures to AiError.
 * @returns {Promise<object>} Parsed JSON body of a 2xx response.
 */
export async function postJson({ provider, url, headers, body, timeoutMs, fetchImpl = fetch }) {
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new AiError(timedOut ? 'timeout' : 'http_error', provider, timedOut ? `${timeoutMs}ms` : err?.name);
  }
  if (res.status === 429) throw new AiError('rate_limited', provider, '429');
  if (!res.ok) throw new AiError('http_error', provider, String(res.status));
  try {
    return await res.json();
  } catch {
    throw new AiError('bad_response', provider, 'invalid JSON body');
  }
}

/** Parses the model's text as JSON, or throws AiError. */
export function parseModelJson(provider, text) {
  if (typeof text !== 'string' || !text.trim()) throw new AiError('bad_response', provider, 'empty output');
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError('bad_response', provider, 'output is not JSON');
  }
}
