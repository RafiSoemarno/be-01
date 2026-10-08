/**
 * Error primitives shared by middleware and handlers.
 *
 * `AppError` carries an HTTP status and a stable machine-readable code so the
 * final error middleware can render a structured JSON envelope instead of
 * leaking internals.
 */
export class AppError extends Error {
  /**
   * @param {number} status HTTP status code.
   * @param {string} code Stable machine-readable error code.
   * @param {string} message Human-readable message.
   * @param {unknown} [details] Optional extra context, serialized in the envelope.
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/** @returns {AppError} a 400 Bad Request error. */
export function badRequest(message, details) {
  return new AppError(400, 'bad_request', message, details);
}

/** @returns {AppError} a 404 Not Found error. */
export function notFound(message) {
  return new AppError(404, 'not_found', message);
}

/** @returns {AppError} a 415 Unsupported Media Type error. */
export function unsupportedMediaType(message) {
  return new AppError(415, 'unsupported_media_type', message);
}
