import { AiError, parseModelJson, postJson } from './errors.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
// Pins the request/response format of the Interactions API.
const API_REVISION = '2026-05-20';

/**
 * Google Gemini through the Interactions API.
 * `store: false` keeps Google from storing the interaction for later retrieval.
 * @param {{apiKey: string, model: string, timeoutMs: number, fetchImpl?: typeof fetch}} options
 */
export function createGeminiProvider({ apiKey, model, timeoutMs, fetchImpl }) {
  return {
    name: 'gemini',
    model,

    /**
     * @param {{system: string, input: string, schema: object, maxOutputTokens: number}} request
     * @returns {Promise<object>} The model's JSON output, parsed.
     */
    async generateJson({ system, input, schema, maxOutputTokens }) {
      const data = await postJson({
        provider: 'gemini',
        url: ENDPOINT,
        headers: { 'x-goog-api-key': apiKey, 'Api-Revision': API_REVISION },
        body: {
          model,
          store: false,
          system_instruction: system,
          input,
          response_format: { type: 'text', mime_type: 'application/json', schema },
          generation_config: { thinking_level: 'minimal', max_output_tokens: maxOutputTokens },
        },
        timeoutMs,
        fetchImpl,
      });

      const output = (data.steps ?? []).filter((s) => s.type === 'model_output').at(-1);
      const text = (output?.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
      if (data.status && data.status !== 'completed') {
        throw new AiError('bad_response', 'gemini', `status ${data.status}`);
      }
      return parseModelJson('gemini', text);
    },
  };
}
