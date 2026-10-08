import { createApp } from '../app.js';

/**
 * Starts the HTTP listener and installs graceful-shutdown handlers.
 *
 * @param {{port?: number|string, app?: import('express').Express}} [options]
 * @returns {import('node:http').Server}
 */
export function startServer({ port = process.env.PORT ?? 3000, app = createApp() } = {}) {
  const server = app.listen(port, () => {
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Task API listening on http://localhost:${boundPort}`);
    console.log(`API docs available at http://localhost:${boundPort}/docs`);
  });

  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}
