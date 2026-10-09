import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';
import { toResourceCard } from '../services/searchService.js';

/** GET /api/resources/:id and GET /api/cities. */
export function resourcesRouter({ repository }) {
  const router = Router();

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

  return router;
}
