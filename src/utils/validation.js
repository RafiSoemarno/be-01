import { badRequest } from './errors.js';

/**
 * Strict primitive validators. Every helper either returns a normalized value
 * or throws an `AppError` (400) — nothing fails silently.
 */

/**
 * @param {unknown} value
 * @returns {boolean} true only for non-null, non-array objects.
 */
export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses a canonical positive integer id (`/^[1-9]\d*$/`).
 * @param {unknown} value
 * @returns {number}
 * @throws {import('./errors.js').AppError} when the value is not a valid id.
 */
export function parsePositiveInt(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw badRequest(`Invalid id "${value}": expected a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw badRequest(`Invalid id "${value}": out of range`);
  }
  return parsed;
}

/**
 * Parses the literal strings `"true"` / `"false"` into booleans.
 * @param {unknown} value
 * @returns {boolean}
 * @throws {import('./errors.js').AppError} for any other value.
 */
export function parseBooleanString(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw badRequest(`Invalid boolean "${value}": expected "true" or "false"`);
}

/**
 * Rejects any key in `source` that is not part of `allowed`.
 * @param {Record<string, unknown>} source
 * @param {string[]} allowed
 * @param {string} [context]
 * @throws {import('./errors.js').AppError} when an unknown key is present.
 */
export function assertNoUnknownKeys(source, allowed, context = 'query') {
  const unknown = Object.keys(source).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw badRequest(`Unknown ${context} parameter(s): ${unknown.join(', ')}`, { unknown });
  }
}

/**
 * Validates and trims a task title.
 * @param {unknown} value
 * @returns {string}
 * @throws {import('./errors.js').AppError} for non-strings or blank strings.
 */
export function normalizeTitle(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest('Field "title" must be a non-empty string');
  }
  return value.trim();
}
