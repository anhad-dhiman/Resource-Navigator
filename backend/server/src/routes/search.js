import { Router } from 'express';
import { validateSearch, validateSummary } from '../middleware/validateSearch.js';
import { PAUSED_MESSAGE, rejectPaused } from '../middleware/abuseGuard.js';

const LAST_WARNING = ' Another unrelated search will pause search for 30 minutes.';

/**
 * POST /api/search: plain-language query in, verified resource cards out.
 * POST /api/search/summary: one AI summary for the cards a search returned.
 * Unrelated or meaningless searches count against the client in abuseGuard.
 */
export function searchRouter({ searchService, repository, abuseGuard, maxQueryLength, maxResults }) {
  const router = Router();
  router.use(rejectPaused(abuseGuard));

  router.post(
    '/',
    validateSearch({ listCities: () => repository.listCities(), maxQueryLength }),
    async (req, res) => {
      const result = await searchService.search(req.search);
      if (result.status === 'irrelevant') {
        const { paused, strikesLeft } = abuseGuard.strike(req.ip);
        if (paused) result.message = PAUSED_MESSAGE;
        else if (strikesLeft === 1) result.message += LAST_WARNING;
      }
      res.json(result);
    },
  );

  router.post('/summary', validateSummary({ maxQueryLength, maxResults }), async (req, res) => {
    res.json(await searchService.summarize(req.summary));
  });

  return router;
}
