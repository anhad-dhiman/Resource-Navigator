import { Router } from 'express';
import { validateSearch } from '../middleware/validateSearch.js';

/** POST /api/search: plain-language query in, verified resource cards out. */
export function searchRouter({ searchService, repository, maxQueryLength }) {
  const router = Router();
  router.post(
    '/',
    validateSearch({ listCities: () => repository.listCities(), maxQueryLength }),
    async (req, res) => {
      res.json(await searchService.search(req.search));
    },
  );
  return router;
}
