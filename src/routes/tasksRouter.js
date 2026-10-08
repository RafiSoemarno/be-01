import { Router } from 'express';

import { createTaskHandlers } from '../handlers/tasksHandler.js';
import {
  validateListQuery,
  validateIdParam,
  requireJsonBody,
  validateCreateBody,
  validateUpdateBody,
} from '../middleware/validate.js';

/**
 * Builds the `/tasks` CRUD router. Validation runs before every handler so a
 * handler only ever sees normalized values on `req.validated`.
 *
 * @param {ReturnType<import('../stores/taskStore.js').createTaskStore>} store
 * @returns {import('express').Router}
 */
export function createTasksRouter(store) {
  const handlers = createTaskHandlers(store);
  const router = Router();

  router.get('/', validateListQuery, handlers.listTasks);
  router.post('/', requireJsonBody, validateCreateBody, handlers.createTask);

  router
    .route('/:id')
    .all(validateIdParam)
    .get(handlers.getTask)
    .patch(requireJsonBody, validateUpdateBody, handlers.updateTask)
    .delete(handlers.deleteTask);

  return router;
}
