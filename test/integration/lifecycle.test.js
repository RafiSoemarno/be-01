import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import { createApp } from '../../src/app.js';
import { createTaskStore } from '../../src/stores/taskStore.js';

const SEED = [
  { id: 1, title: 'Alpha task', done: true },
  { id: 2, title: 'Beta task', done: false },
  { id: 3, title: 'Gamma task', done: false },
];

/** Boots the real HTTP app on an ephemeral port for one test. */
async function withServer(fn, { store = createTaskStore(SEED) } = {}) {
  const app = createApp({ store });
  const server = app.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function request(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  let body = text;
  if (contentType.includes('application/json') && text.length > 0) {
    body = JSON.parse(text);
  }
  return { status: res.status, headers: res.headers, body, text };
}

function send(method, payload) {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

test('lifecycle: meta endpoints', async () => {
  await withServer(async (base) => {
    const index = await request(base, '/');
    assert.equal(index.status, 200);
    assert.equal(index.body.name, 'Task API');
    assert.equal(index.body.routes.length, 8);

    const health = await request(base, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.text, 'ok');

    const docs = await request(base, '/docs');
    assert.equal(docs.status, 200);
    assert.match(docs.headers.get('content-type'), /text\/html/);
  });
});

test('lifecycle: listing and filtering tasks', async () => {
  await withServer(async (base) => {
    const all = await request(base, '/tasks');
    assert.equal(all.status, 200);
    assert.deepEqual(
      all.body.map((t) => t.id),
      [1, 2, 3],
    );

    const done = await request(base, '/tasks?done=true');
    assert.deepEqual(
      done.body.map((t) => t.id),
      [1],
    );

    const pending = await request(base, '/tasks?done=false');
    assert.deepEqual(
      pending.body.map((t) => t.id),
      [2, 3],
    );

    const search = await request(base, '/tasks?search=Beta');
    assert.deepEqual(
      search.body.map((t) => t.id),
      [2],
    );

    const combined = await request(base, '/tasks?done=false&search=Gamma');
    assert.deepEqual(
      combined.body.map((t) => t.id),
      [3],
    );
  });
});

test('lifecycle: invalid list queries are rejected with 400', async () => {
  await withServer(async (base) => {
    for (const qs of ['?done=maybe', '?bogus=1', '?search=a&search=b', '?done=1']) {
      const res = await request(base, `/tasks${qs}`);
      assert.equal(res.status, 400, `expected 400 for ${qs}`);
      assert.equal(res.body.error.code, 'bad_request');
    }
  });
});

test('lifecycle: reading a single task', async () => {
  await withServer(async (base) => {
    const found = await request(base, '/tasks/1');
    assert.equal(found.status, 200);
    assert.deepEqual(found.body, { id: 1, title: 'Alpha task', done: true });

    const missing = await request(base, '/tasks/999');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'not_found');

    const invalid = await request(base, '/tasks/abc');
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'bad_request');
  });
});

test('lifecycle: creating tasks', async () => {
  await withServer(async (base) => {
    const created = await request(base, '/tasks', send('POST', { title: 'Delta task' }));
    assert.equal(created.status, 201);
    assert.equal(created.headers.get('location'), '/tasks/4');
    assert.deepEqual(created.body, { id: 4, title: 'Delta task', done: false });

    // Additional fields are ignored and done always starts false.
    const ignored = await request(base, '/tasks', send('POST', { title: 'Epsilon', done: true, id: 99 }));
    assert.equal(ignored.status, 201);
    assert.equal(ignored.body.id, 5);
    assert.equal(ignored.body.done, false);
    assert.equal(ignored.body.extra, undefined);

    const missingTitle = await request(base, '/tasks', send('POST', { done: true }));
    assert.equal(missingTitle.status, 400);

    const emptyTitle = await request(base, '/tasks', send('POST', { title: '  ' }));
    assert.equal(emptyTitle.status, 400);
  });
});

test('lifecycle: body content-type and malformed JSON failures', async () => {
  await withServer(async (base) => {
    const wrongType = await request(base, '/tasks', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'title=Delta',
    });
    assert.equal(wrongType.status, 415);
    assert.equal(wrongType.body.error.code, 'unsupported_media_type');

    const noBody = await request(base, '/tasks', { method: 'POST' });
    assert.equal(noBody.status, 400);

    const malformed = await request(base, '/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.code, 'invalid_json');
  });
});

test('lifecycle: updating tasks', async () => {
  await withServer(async (base) => {
    const titleOnly = await request(base, '/tasks/2', send('PATCH', { title: 'Beta v2' }));
    assert.equal(titleOnly.status, 200);
    assert.deepEqual(titleOnly.body, { id: 2, title: 'Beta v2', done: false });

    const doneOnly = await request(base, '/tasks/2', send('PATCH', { done: true }));
    assert.deepEqual(doneOnly.body, { id: 2, title: 'Beta v2', done: true });

    const both = await request(base, '/tasks/2', send('PATCH', { title: 'Beta v3', done: false }));
    assert.deepEqual(both.body, { id: 2, title: 'Beta v3', done: false });

    const empty = await request(base, '/tasks/2', send('PATCH', {}));
    assert.equal(empty.status, 400);

    const unknownOnly = await request(base, '/tasks/2', send('PATCH', { extra: 1 }));
    assert.equal(unknownOnly.status, 400);

    const badType = await request(base, '/tasks/2', send('PATCH', { done: 'yes' }));
    assert.equal(badType.status, 400);

    const invalidId = await request(base, '/tasks/abc', send('PATCH', { done: true }));
    assert.equal(invalidId.status, 400);

    const missing = await request(base, '/tasks/999', send('PATCH', { done: true }));
    assert.equal(missing.status, 404);
  });
});

test('lifecycle: deleting tasks', async () => {
  await withServer(async (base) => {
    const deleted = await request(base, '/tasks/1', { method: 'DELETE' });
    assert.equal(deleted.status, 204);
    assert.equal(deleted.text, '');

    const gone = await request(base, '/tasks/1');
    assert.equal(gone.status, 404);

    const again = await request(base, '/tasks/1', { method: 'DELETE' });
    assert.equal(again.status, 404);

    const invalidId = await request(base, '/tasks/abc', { method: 'DELETE' });
    assert.equal(invalidId.status, 400);
  });
});

test('lifecycle: unknown routes return a JSON 404, never an HTML error page', async () => {
  await withServer(async (base) => {
    const res = await request(base, '/does-not-exist');
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.equal(res.body.error.code, 'not_found');
  });
});

test('lifecycle: an uncaught exception becomes a generic 500, never a raw stack', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const brokenStore = {
      list() {
        throw new Error('secret internal detail');
      },
    };
    await withServer(
      async (base) => {
        const res = await request(base, '/tasks');
        assert.equal(res.status, 500);
        assert.equal(res.body.error.code, 'internal_error');
        assert.equal(res.body.error.message, 'Internal server error');
        assert.ok(!res.text.includes('secret internal detail'));
        assert.ok(!res.text.includes('at '));
      },
      { store: brokenStore },
    );
  } finally {
    console.error = originalError;
  }
});

test('seed: the persisted seed defines exactly three tasks with unique ids', async () => {
  const { taskStore } = await import('../../src/stores/taskStore.js');
  const tasks = taskStore.list();
  assert.equal(tasks.length, 3);
  assert.equal(new Set(tasks.map((t) => t.id)).size, 3);
  for (const task of tasks) {
    assert.equal(typeof task.title, 'string');
    assert.equal(typeof task.done, 'boolean');
    assert.ok(Number.isInteger(task.id));
  }
});
