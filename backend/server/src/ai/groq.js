import { parseModelJson, postJson } from './errors.js';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq (OpenAI-compatible chat completions), the backup provider.
 * Uses strict JSON-schema output, which needs a model that supports it (e.g. openai/gpt-oss-20b).
 * @param {{apiKey: string, model: string, timeoutMs: number, fetchImpl?: typeof fetch}} options
 */
export function createGroqProvider({ apiKey, model, timeoutMs, fetchImpl }) {
  return {
    name: 'groq',
    model,

    /**
     * @param {{system: string, input: string, schema: object, schemaName: string, maxOutputTokens: number}} request
     * @returns {Promise<object>} The model's JSON output, parsed.
     */
    async generateJson({ system, input, schema, schemaName, maxOutputTokens }) {
      const data = await postJson({
        provider: 'groq',
        url: ENDPOINT,
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: input },
          ],
          response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
          max_completion_tokens: maxOutputTokens,
        },
        timeoutMs,
        fetchImpl,
      });
      return parseModelJson('groq', data.choices?.[0]?.message?.content);
    },
  };
}
