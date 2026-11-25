export const NO_RESULTS_MESSAGE =
  'We could not find a verified service that matches your request. ' +
  'Please call or text 2-1-1, or visit bc.211.ca, to reach 211 British Columbia ' +
  'for free, confidential help finding community services.';

export const IRRELEVANT_MESSAGE =
  'We can only help you find community services in Metro Vancouver, such as food, housing, ' +
  'legal aid, health care and senior support. Please describe what you need help with.';

// Any letter in any language. Input without one cannot describe a need.
const HAS_LETTER = /\p{L}/u;

/**
 * Shapes a database row into a public resource card. Every field comes from the database.
 * @param {object} row
 */
export function toResourceCard(row) {
  return {
    resource_id: row.resource_id,
    service_name: row.service_name,
    service_type: row.service_type,
    description: row.description,
    physical_address: row.physical_address,
    city: row.city,
    contact_phone: row.contact_phone,
    official_url: row.official_url,
    operating_hours: row.operating_hours,
    eligibility_criteria: row.eligibility_criteria,
    language_support: row.language_support,
    verification: {
      status: row.verification_status,
      last_reviewed_at: row.last_reviewed_at,
    },
  };
}

/**
 * Search, database first, in two requests so cards appear before the summary:
 *
 * search():
 * 1. Input with no letters is rejected as irrelevant, without calling the AI.
 * 2. The AI interprets the query: intent (need / off topic / gibberish), urgency
 *    (emergency / self-harm), and service types, keywords and a city chosen only
 *    from values the database provides.
 * 3. Off-topic or gibberish queries get a fixed message; nothing else runs.
 * 4. The database returns verified records. If the AI is unavailable, PostgreSQL
 *    full-text search matches the query's own words instead.
 *
 * summarize(): the AI writes one short summary of why those records were shown.
 *
 * @param {{repository: object, ai?: ReturnType<import('../ai/aiService.js').createAiService>, maxResults: number}} deps
 */
export function createSearchService({ repository, ai, maxResults }) {
  return {
    /**
     * @param {{query: string, city: string|null}} input Validated input.
     * @returns {Promise<object>} Response body for POST /api/search. `status` is
     *   'ok', 'no_results' or 'irrelevant'.
     */
    async search({ query, city }) {
      if (!HAS_LETTER.test(query)) {
        return irrelevant({ interpreted: null, interpretedBy: null, city });
      }

      let interpreted = null;
      if (ai?.enabled) {
        const [serviceTypes, cities] = await Promise.all([
          repository.listServiceTypes(),
          repository.listCities(),
        ]);
        interpreted = serviceTypes.length ? await ai.interpret({ query, serviceTypes, cities }) : null;
      }

      const interpretedOut = interpreted && {
        intent: interpreted.intent,
        urgency: interpreted.urgency,
        categories: interpreted.categories,
        keywords: interpreted.keywords,
        city: interpreted.city,
      };
      const interpretedBy = interpreted?.provider ?? null;

      if (interpreted && interpreted.intent !== 'need') {
        return irrelevant({ interpreted: interpretedOut, interpretedBy, city });
      }

      let rows;
      let searchCity = city;
      if (interpreted) {
        // A city chosen in the filter wins over one named in the query.
        searchCity = city ?? interpreted.city;
        rows =
          interpreted.categories.length || interpreted.keywords.length
            ? await repository.search({
                categories: interpreted.categories,
                keywords: interpreted.keywords,
                city: searchCity,
                limit: maxResults,
              })
            : [];
      } else {
        rows = await repository.searchText({ query, city, limit: maxResults });
      }

      const base = {
        interpreted: interpretedOut,
        ai: { interpreted_by: interpretedBy },
        urgency: interpreted && interpreted.urgency !== 'none' ? interpreted.urgency : null,
        city: searchCity,
        count: rows.length,
      };

      if (rows.length === 0) {
        return {
          status: 'no_results',
          ...base,
          summary_available: false,
          results: [],
          message: NO_RESULTS_MESSAGE,
        };
      }
      return {
        status: 'ok',
        ...base,
        // Only offer a summary when the AI is working; it was unavailable a moment ago otherwise.
        summary_available: Boolean(interpreted),
        results: rows.map(toResourceCard),
      };
    },

    /**
     * @param {{query: string, resourceIds: number[]}} input Validated input.
     * @returns {Promise<{summary: string|null, ai: {summarized_by: string|null}}>}
     */
    async summarize({ query, resourceIds }) {
      const rows = ai?.enabled ? await repository.findByIds(resourceIds) : [];
      const result = rows.length ? await ai.summarize({ query, candidates: rows }) : null;
      return { summary: result?.summary ?? null, ai: { summarized_by: result?.provider ?? null } };
    },
  };
}

function irrelevant({ interpreted, interpretedBy, city }) {
  return {
    status: 'irrelevant',
    interpreted,
    ai: { interpreted_by: interpretedBy },
    urgency: null,
    city,
    count: 0,
    summary_available: false,
    results: [],
    message: IRRELEVANT_MESSAGE,
  };
}
