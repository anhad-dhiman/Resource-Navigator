import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';
import { toResourceCard } from '../services/searchService.js';

const MAX_FILTER_LENGTH = 100;

/** Reads an optional string filter from the query string; null when absent or blank. */
function optionalFilter(value, name) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > MAX_FILTER_LENGTH) {
    throw new HttpError(400, 'INVALID_FILTER', `The ${name} filter is not valid.`);
  }
  return value.trim() || null;
}

/** GET /api/resources, GET /api/resources/:id, GET /api/cities and GET /api/service-types. */
export function resourcesRouter({ repository }) {
  const router = Router();

  router.get('/resources', async (req, res) => {
    const city = optionalFilter(req.query.city, 'city');
    const serviceType = optionalFilter(req.query.type, 'type');
    const rows = await repository.list({ city, serviceType });
    const resources = rows.map((row) => {
      const { match_explanation: _unused, ...resource } = toResourceCard(row);
      return resource;
    });
    res.json({ count: resources.length, resources });
  });

  router.get('/resources/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_ID', 'Resource id must be a positive whole number.');
    }
    const row = await repository.findById(id);
    if (!row) {
      throw new HttpError(404, 'NOT_FOUND', 'This resource was not found or is not currently verified.');
    }
    const { match_explanation: _unused, ...resource } = toResourceCard(row);
    res.json({ resource });
  });

  router.get('/cities', async (_req, res) => {
    res.json({ cities: await repository.listCities() });
  });

  router.get('/service-types', async (_req, res) => {
    res.json({ service_types: await repository.listServiceTypes() });
  });

  return router;
}
