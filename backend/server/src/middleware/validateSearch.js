import { HttpError } from './errors.js';

// C0 and C1 control characters (tab and newline included).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * Checks a query: a non-empty string, at most maxQueryLength characters, no control characters.
 * @returns {string} The trimmed query.
 */
function checkQuery(query, maxQueryLength) {
  if (typeof query !== 'string' || query.trim() === '') {
    throw new HttpError(400, 'INVALID_QUERY', 'Please describe what you need help with.');
  }
  const trimmed = query.trim();
  if (trimmed.length > maxQueryLength) {
    throw new HttpError(400, 'INVALID_QUERY', `Please keep your request under ${maxQueryLength} characters.`);
  }
  if (CONTROL_CHARS.test(trimmed)) {
    throw new HttpError(400, 'INVALID_QUERY', 'Your request contains characters that are not allowed.');
  }
  return trimmed;
}

/**
 * Validates the POST /api/search body and stores clean values in req.search.
 * The city must be one of the cities stored in the database.
 * @param {{listCities: () => Promise<string[]>, maxQueryLength: number}} deps
 */
export function validateSearch({ listCities, maxQueryLength }) {
  return async (req, _res, next) => {
    const { query, city } = req.body ?? {};

    const trimmed = checkQuery(query, maxQueryLength);

    let cleanCity = null;
    if (city !== undefined && city !== null && city !== '') {
      if (typeof city !== 'string') {
        throw new HttpError(400, 'INVALID_CITY', 'Please choose a city from the list.');
      }
      const cities = await listCities();
      cleanCity = cities.find((c) => c.toLowerCase() === city.trim().toLowerCase());
      if (!cleanCity) {
        throw new HttpError(400, 'INVALID_CITY', 'Please choose a city from the list.');
      }
    }

    req.search = { query: trimmed, city: cleanCity };
    next();
  };
}

/**
 * Validates the POST /api/search/summary body ({query, resource_ids}) into req.summary.
 * @param {{maxQueryLength: number, maxResults: number}} deps
 */
export function validateSummary({ maxQueryLength, maxResults }) {
  return (req, _res, next) => {
    const { query, resource_ids: ids } = req.body ?? {};
    const trimmed = checkQuery(query, maxQueryLength);
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > maxResults ||
      !ids.every((id) => Number.isInteger(id) && id > 0)
    ) {
      throw new HttpError(
        400,
        'INVALID_RESOURCE_IDS',
        `resource_ids must be 1 to ${maxResults} positive whole numbers.`,
      );
    }
    req.summary = { query: trimmed, resourceIds: [...new Set(ids)] };
    next();
  };
}
