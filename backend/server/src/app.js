import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { healthRouter } from './routes/health.js';
import { searchRouter } from './routes/search.js';
import { resourcesRouter } from './routes/resources.js';
import { adminRouter } from './routes/admin.js';
import { createSearchService } from './services/searchService.js';
import { createAbuseGuard } from './middleware/abuseGuard.js';

/**
 * Builds the Express app. Dependencies are injected so tests can supply fakes.
 * Admin routes are mounted only when an authService is given; without `ai`, search
 * uses the database's full-text matching only.
 * @param {{repository: object, ai?: object, abuseGuard?: object, trustProxy?: boolean|number, authService?: object, secureCookies?: boolean, corsOrigins?: string[], maxQueryLength?: number, maxResults?: number, logRequests?: boolean}} deps
 */
export function createApp({
  repository,
  ai,
  abuseGuard = createAbuseGuard(),
  trustProxy = false,
  authService,
  secureCookies = false,
  corsOrigins = [],
  maxQueryLength = 500,
  maxResults = 20,
  logRequests = true,
}) {
  const app = express();
  const searchService = createSearchService({ repository, ai, maxResults });

  app.disable('x-powered-by');
  // Behind a hosting proxy, req.ip must come from X-Forwarded-For for rate limits and pauses to work.
  app.set('trust proxy', trustProxy);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins.length ? corsOrigins : false, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
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
  app.use(
    '/api/search',
    searchLimiter,
    searchRouter({ searchService, repository, abuseGuard, maxQueryLength, maxResults }),
  );
  app.use('/api', resourcesRouter({ repository }));
  if (authService) app.use('/api/admin', adminRouter({ authService, secureCookies }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
