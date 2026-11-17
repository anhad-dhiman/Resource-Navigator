import { createAiService } from './aiService.js';
import { createGeminiProvider } from './gemini.js';
import { createGroqProvider } from './groq.js';

/**
 * Builds the AI service from config: Gemini first, Groq as backup.
 * A provider without an API key is left out; with none, AI is disabled and
 * search uses the database's own full-text matching.
 */
export function createAiFromConfig({ gemini, groq, timeoutMs }) {
  const providers = [];
  if (gemini.apiKey) providers.push(createGeminiProvider({ ...gemini, timeoutMs }));
  if (groq.apiKey) providers.push(createGroqProvider({ ...groq, timeoutMs }));
  return createAiService({ providers });
}
