import { interpretQuery } from './queryInterpreter.js';

export const NO_RESULTS_MESSAGE =
  'We could not find a verified service that matches your request. ' +
  'Please call or text 2-1-1, or visit bc.211.ca, to reach 211 British Columbia ' +
  'for free, confidential help finding community services.';

/**
 * Shapes a database row into a public resource card. Every field comes from
 * the database; match_explanation stays null until the AI step is added.
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
    match_explanation: null,
  };
}

/**
 * Orchestrates a search: interpret the query, look up verified records, respond.
 * @param {{repository: ReturnType<import('../db/resourceRepository.js').createResourceRepository>, maxResults: number}} deps
 */
export function createSearchService({ repository, maxResults }) {
  return {
    /**
     * @param {{query: string, city: string|null}} input Validated input.
     * @returns {Promise<object>} Response body for POST /api/search.
     */
    async search({ query, city }) {
      const interpreted = interpretQuery(query);
      const rows =
        interpreted.categories.length || interpreted.keywords.length
          ? await repository.search({ ...interpreted, city, limit: maxResults })
          : [];

      if (rows.length === 0) {
        return {
          status: 'no_results',
          interpreted,
          city,
          count: 0,
          results: [],
          message: NO_RESULTS_MESSAGE,
        };
      }
      return { status: 'ok', interpreted, city, count: rows.length, results: rows.map(toResourceCard) };
    },
  };
}
