import {
  isPlainObject,
  parsePositiveInt,
  parseBooleanString,
  assertNoUnknownKeys,
  normalizeTitle,
} from '../utils/validation.js';
import { badRequest, unsupportedMediaType } from '../utils/errors.js';

/**
 * Per-route validation middleware.
 *
 * Every validator either calls `next()` with normalized values on
 * `req.validated`, or forwards an `AppError` to the error middleware. Routes
 * never reach a handler with unvalidated input.
 */

const LIST_QUERY_KEYS = ['done', 'search'];

/** Validates `GET /tasks` query parameters. */
export function validateListQuery(req, _res, next) {
  const query = req.query ?? {};
  try {
    assertNoUnknownKeys(query, LIST_QUERY_KEYS);
  } catch (err) {
    return next(err);
  }

  if (query.search !== undefined && typeof query.search !== 'string') {
    return next(badRequest('Query parameter "search" must be a single string'));
  }

  let done;
  if (query.done !== undefined) {
    try {
      done = parseBooleanString(query.done);
    } catch (err) {
      return next(err);
    }
  }

  req.validated = { done, search: query.search };
  return next();
}

/** Validates the `:id` route parameter and exposes it as a number. */
export function validateIdParam(req, _res, next) {
  try {
    req.validated = { id: parsePositiveInt(req.params?.id) };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Requires an `application/json` body when one is supplied. */
export function requireJsonBody(req, _res, next) {
  if (req.is('application/json')) {
    return next();
  }
  const contentLength = req.headers?.['content-length'];
  const hasBody = contentLength !== undefined && contentLength !== '0';
  if (hasBody) {
    return next(unsupportedMediaType('Content-Type must be application/json'));
  }
  return next(badRequest('Request body is required and must be JSON'));
}

/** Validates the `POST /tasks` body into `{ title }`. */
export function validateCreateBody(req, _res, next) {
  const body = req.body;
  if (!isPlainObject(body)) {
    return next(badRequest('Request body must be a JSON object'));
  }
  try {
    // Additional fields are intentionally ignored; only `title` is read.
    req.validated = { ...req.validated, title: normalizeTitle(body.title) };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Validates the `PATCH /tasks/:id` body into `{ title?, done? }`. */
export function validateUpdateBody(req, _res, next) {
  const body = req.body;
  if (!isPlainObject(body)) {
    return next(badRequest('Request body must be a JSON object'));
  }

  const hasTitle = body.title !== undefined;
  const hasDone = body.done !== undefined;
  if (!hasTitle && !hasDone) {
    return next(badRequest('Request body must contain at least one of: title, done'));
  }

  const validated = {};
  try {
    if (hasTitle) {
      validated.title = normalizeTitle(body.title);
    }
    if (hasDone) {
      if (typeof body.done !== 'boolean') {
        throw badRequest('Field "done" must be a boolean');
      }
      validated.done = body.done;
    }
  } catch (err) {
    return next(err);
  }

  req.validated = { ...req.validated, ...validated };
  return next();
}
