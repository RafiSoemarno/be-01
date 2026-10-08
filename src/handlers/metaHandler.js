/**
 * Meta endpoints: route index and health probe.
 */

/**
 * Single source of truth for the public route surface, reused by `GET /` and
 * (by hand) the OpenAPI document.
 * @type {{method: string, path: string, description: string}[]}
 */
export const API_ROUTES = [
  { method: 'GET', path: '/', description: 'List all available routes' },
  { method: 'GET', path: '/health', description: 'Health probe, returns "ok"' },
  { method: 'GET', path: '/docs', description: 'Interactive Swagger UI' },
  { method: 'GET', path: '/tasks', description: 'List tasks, optionally filtered by done/search' },
  { method: 'GET', path: '/tasks/:id', description: 'Fetch a single task' },
  { method: 'POST', path: '/tasks', description: 'Create a task' },
  { method: 'PATCH', path: '/tasks/:id', description: 'Update a task' },
  { method: 'DELETE', path: '/tasks/:id', description: 'Delete a task' },
];

/**
 * `GET /` — returns the route index as JSON.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function getRouteIndex(_req, res) {
  res.json({ name: 'Task API', version: '1.0.0', routes: API_ROUTES });
}

/**
 * `GET /health` — returns the plain-text literal `ok`.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export function getHealth(_req, res) {
  res.type('text/plain').send('ok');
}
