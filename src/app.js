import express from 'express';

import { taskStore } from './stores/taskStore.js';
import { createMetaRouter } from './routes/metaRouter.js';
import { createTasksRouter } from './routes/tasksRouter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application without binding a port, so tests can mount it
 * on an ephemeral port and inject an isolated store.
 *
 * @param {{store?: ReturnType<import('./stores/taskStore.js').createTaskStore>}} [options]
 * @returns {import('express').Express}
 */
export function createApp({ store = taskStore } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use(createMetaRouter());
  app.use('/tasks', createTasksRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
