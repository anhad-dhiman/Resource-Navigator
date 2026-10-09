import { HttpError } from './errors.js';

// C0 and C1 control characters (tab and newline included).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * Validates the POST /api/search body and stores clean values in req.search.
 * The city must be one of the cities stored in the database.
 * @param {{listCities: () => Promise<string[]>, maxQueryLength: number}} deps
 */
export function validateSearch({ listCities, maxQueryLength }) {
  return async (req, _res, next) => {
    const { query, city } = req.body ?? {};

    if (typeof query !== 'string' || query.trim() === '') {
      throw new HttpError(400, 'INVALID_QUERY', 'Please describe what you need help with.');
    }
    const trimmed = query.trim();
    if (trimmed.length > maxQueryLength) {
      throw new HttpError(
        400,
        'INVALID_QUERY',
        `Please keep your request under ${maxQueryLength} characters.`,
      );
    }
    if (CONTROL_CHARS.test(trimmed)) {
      throw new HttpError(400, 'INVALID_QUERY', 'Your request contains characters that are not allowed.');
    }

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
