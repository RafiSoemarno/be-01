import { Router } from 'express';

import { getRouteIndex, getHealth } from '../handlers/metaHandler.js';
import { mountDocs } from '../docs/swagger.js';

/**
 * Meta routes: the route index, the health probe, and the Swagger UI.
 * @returns {import('express').Router}
 */
export function createMetaRouter() {
  const router = Router();

  router.get('/', getRouteIndex);
  router.get('/health', getHealth);
  mountDocs(router);

  return router;
}
