import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import swaggerUi from 'swagger-ui-express';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The OpenAPI 3 document that backs both Swagger UI and the JSDoc-described
 * contract. Parsed once at startup from the persisted `openapi.json`.
 */
export const openApiSpec = JSON.parse(readFileSync(join(ROOT, 'openapi.json'), 'utf8'));

/**
 * Mounts the interactive Swagger UI at `/docs`, serving its assets locally so
 * it works without network access.
 * @param {import('express').Router} router
 */
export function mountDocs(router) {
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, { customSiteTitle: 'Task API Docs' }),
  );
}
