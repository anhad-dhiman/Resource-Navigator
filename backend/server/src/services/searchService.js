export const NO_RESULTS_MESSAGE =
  'We could not find a verified service that matches your request. ' +
  'Please call or text 2-1-1, or visit bc.211.ca, to reach 211 British Columbia ' +
  'for free, confidential help finding community services.';

/**
 * Shapes a database row into a public resource card. Every field comes from
 * the database except match_explanation, which the AI writes (or null).
 * @param {object} row
 * @param {string|null} [explanation]
 */
export function toResourceCard(row, explanation = null) {
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
    match_explanation: explanation,
  };
}

/**
 * Orchestrates a search, database first:
 * 1. the AI interprets the query into service types, keywords and a city,
 *    choosing only from values the database provides;
 * 2. the database returns verified records (or, if the AI is unavailable,
 *    matches the query's own words with PostgreSQL full-text search);
 * 3. if step 1 worked, the AI writes a short explanation for each record. If
 *    that fails, the records are returned without explanations.
 * @param {{repository: object, ai?: ReturnType<import('../ai/aiService.js').createAiService>, maxResults: number}} deps
 */
export function createSearchService({ repository, ai, maxResults }) {
  return {
    /**
     * @param {{query: string, city: string|null}} input Validated input.
     * @returns {Promise<object>} Response body for POST /api/search.
     */
    async search({ query, city }) {
      const aiInfo = { interpreted_by: null, explained_by: null };
      let interpreted = null;
      let searchCity = city;
      let rows;

      if (ai?.enabled) {
        const [serviceTypes, cities] = await Promise.all([
          repository.listServiceTypes(),
          repository.listCities(),
        ]);
        interpreted = serviceTypes.length ? await ai.interpret({ query, serviceTypes, cities }) : null;
      }

      if (interpreted) {
        aiInfo.interpreted_by = interpreted.provider;
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

      const interpretedOut = interpreted
        ? { categories: interpreted.categories, keywords: interpreted.keywords, city: interpreted.city }
        : null;

      if (rows.length === 0) {
        return {
          status: 'no_results',
          interpreted: interpretedOut,
          ai: aiInfo,
          city: searchCity,
          count: 0,
          results: [],
          message: NO_RESULTS_MESSAGE,
        };
      }

      // Skip the explain step if the AI was unavailable a moment ago: it would fail the same way.
      const explained = interpreted ? await ai.explain({ query, candidates: rows }) : null;
      if (explained) aiInfo.explained_by = explained.provider;

      return {
        status: 'ok',
        interpreted: interpretedOut,
        ai: aiInfo,
        city: searchCity,
        count: rows.length,
        results: rows.map((row) => toResourceCard(row, explained?.explanations.get(row.resource_id) ?? null)),
      };
    },
  };
}
