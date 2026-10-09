/** An error whose message is safe to show to the user. */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code Machine-readable error code.
   * @param {string} message Plain-language message for the user.
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Responds 404 for unknown routes. */
export function notFound(_req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'The requested resource was not found.'));
}

/**
 * Final error handler. Known errors return their message; anything else
 * (including database errors) returns a generic message with no internal details.
 */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // Malformed JSON body from express.json().
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_BODY', message: 'The request body is not valid.' } });
  }
  // Log only the error name and code: never the request body or query text.
  console.error(`Unhandled error: ${err.name}${err.code ? ` (${err.code})` : ''}`);
  return res.status(503).json({
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'The service is temporarily unavailable. Please try again later.',
    },
  });
}
