import { AppError } from '../utils/errors.js';

/**
 * Terminal middleware chain.
 *
 * `notFoundHandler` converts unmatched routes into the same JSON envelope as
 * every other error. `errorHandler` guarantees the server never returns a raw
 * 500/HTML page: known errors keep their status and code, everything else is
 * logged server-side and reported as a generic 500.
 */

/** Renders a JSON 404 for anything that reached the end of the stack. */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Express error middleware (four arguments).
 * @param {any} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  let code = 'internal_error';
  let message = 'Internal server error';
  let details;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    status = 400;
    code = 'invalid_json';
    message = 'Malformed JSON in request body';
  } else if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    status = err.status;
    code = 'bad_request';
    message = err.message || 'Bad request';
  }

  if (status >= 500) {
    // Log the real cause server-side; never expose it to the client.
    console.error(err);
  }

  const error = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json({ error });
}
