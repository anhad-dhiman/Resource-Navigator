import { Router } from 'express';

/** GET /health: confirms the API and the database are reachable. */
export function healthRouter({ repository }) {
  const router = Router();
  router.get('/', async (_req, res) => {
    try {
      await repository.ping();
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });
  return router;
}
