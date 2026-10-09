import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { healthRouter } from './routes/health.js';
import { searchRouter } from './routes/search.js';
import { resourcesRouter } from './routes/resources.js';
import { createSearchService } from './services/searchService.js';

/**
 * Builds the Express app. Dependencies are injected so tests can supply a fake repository.
 * @param {{repository: object, corsOrigins?: string[], maxQueryLength?: number, maxResults?: number, logRequests?: boolean}} deps
 */
export function createApp({
  repository,
  corsOrigins = [],
  maxQueryLength = 500,
  maxResults = 20,
  logRequests = true,
}) {
  const app = express();
  const searchService = createSearchService({ repository, maxResults });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));
  app.use(express.json({ limit: '10kb' }));
  if (logRequests) app.use(requestLogger);

  const searchLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many searches. Please wait a minute and try again.' },
    },
  });

  app.use('/health', healthRouter({ repository }));
  app.use('/api/search', searchLimiter, searchRouter({ searchService, repository, maxQueryLength }));
  app.use('/api', resourcesRouter({ repository }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
