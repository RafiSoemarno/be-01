import test from 'node:test';
import assert from 'node:assert/strict';

import { API_ROUTES, getRouteIndex, getHealth } from '../../src/handlers/metaHandler.js';
import { createTaskHandlers } from '../../src/handlers/tasksHandler.js';
import { createTaskStore } from '../../src/stores/taskStore.js';
import { createMockRes, invoke } from '../helpers/http.js';

const SEED = [
  { id: 1, title: 'Alpha task', done: true },
  { id: 2, title: 'Beta task', done: false },
  { id: 3, title: 'Gamma task', done: false },
];

test('metaHandler: route index advertises every endpoint', async () => {
  const res = createMockRes();
  await invoke(getRouteIndex, {}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.name, 'Task API');
  assert.equal(res.body.routes.length, 8);
  for (const route of res.body.routes) {
    assert.equal(typeof route.method, 'string');
    assert.equal(typeof route.path, 'string');
  }
  const paths = API_ROUTES.map((r) => `${r.method} ${r.path}`);
  for (const expected of [
    'GET /',
    'GET /health',
    'GET /docs',
    'GET /tasks',
    'GET /tasks/:id',
    'POST /tasks',
    'PATCH /tasks/:id',
    'DELETE /tasks/:id',
  ]) {
    assert.ok(paths.includes(expected), `missing ${expected}`);
  }
});

test('metaHandler: health returns plain-text ok', async () => {
  const res = createMockRes();
  await invoke(getHealth, {}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, 'ok');
  assert.match(res.headers['content-type'], /text\/plain/);
});

test('tasksHandler.listTasks: returns tasks honoring validated filters', async () => {
  const handler = createTaskHandlers(createTaskStore(SEED));
  const res = createMockRes();
  await invoke(handler.listTasks, { validated: { done: false } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.body.map((t) => t.id),
    [2, 3],
  );
});

test('tasksHandler.getTask: returns the task, or throws notFound', async () => {
  const handler = createTaskHandlers(createTaskStore(SEED));

  const ok = createMockRes();
  await invoke(handler.getTask, { validated: { id: 2 } }, ok);
  assert.deepEqual(ok.body, { id: 2, title: 'Beta task', done: false });

  const missing = await invoke(handler.getTask, { validated: { id: 999 } }, createMockRes());
  assert.equal(missing.error.status, 404);
});

test('tasksHandler.createTask: responds 201 with Location and done=false', async () => {
  const handler = createTaskHandlers(createTaskStore(SEED));
  const res = createMockRes();
  await invoke(handler.createTask, { validated: { title: 'Delta task' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.headers.location, '/tasks/4');
  assert.deepEqual(res.body, { id: 4, title: 'Delta task', done: false });
});

test('tasksHandler.updateTask: patches, or throws notFound', async () => {
  const handler = createTaskHandlers(createTaskStore(SEED));

  const ok = createMockRes();
  await invoke(handler.updateTask, { validated: { id: 2, done: true } }, ok);
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(ok.body, { id: 2, title: 'Beta task', done: true });

  const missing = await invoke(
    handler.updateTask,
    { validated: { id: 999, done: true } },
    createMockRes(),
  );
  assert.equal(missing.error.status, 404);
});

test('tasksHandler.deleteTask: responds 204, or throws notFound', async () => {
  const handler = createTaskHandlers(createTaskStore(SEED));

  const ok = createMockRes();
  await invoke(handler.deleteTask, { validated: { id: 2 } }, ok);
  assert.equal(ok.statusCode, 204);
  assert.equal(ok.body, undefined);
  assert.equal(ok.ended, true);

  const missing = await invoke(handler.deleteTask, { validated: { id: 999 } }, createMockRes());
  assert.equal(missing.error.status, 404);
});
