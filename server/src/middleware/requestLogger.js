/**
 * Logs method, path, status and duration. The query string and body are
 * deliberately omitted so user query text is never written to logs (FR12).
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
}
