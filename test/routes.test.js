import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

const BASE = 'http://localhost:3000';
let server;

before(async () => {
  server = app.listen(3000);
  await new Promise((resolve) => server.once('listening', resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test('GET / returns API info', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.equal(body.name, 'Task API');
  assert.deepEqual(body.endpoints, ['/tasks']);
});

test('GET /health returns ok', async () => {
  const { status, body } = await req('GET', '/health');
  assert.equal(status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('GET /tasks returns seeded tasks', async () => {
  const { status, body } = await req('GET', '/tasks');
  assert.equal(status, 200);
  assert.equal(body.length, 3);
  assert.equal(body[0].title, 'Sample Task A');
});

test('GET /tasks/:id returns task', async () => {
  const { status, body } = await req('GET', '/tasks/2');
  assert.equal(status, 200);
  assert.equal(body.id, 2);
  assert.equal(body.done, true);
});

test('GET /tasks/:id 404 for missing task', async () => {
  const { status, body } = await req('GET', '/tasks/999');
  assert.equal(status, 404);
  assert.equal(body.error, 'Task 999 not found');
});

test('GET /tasks/:id 400 for non-numeric id', async () => {
  const { status, body } = await req('GET', '/tasks/abc');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID abc');
});

test('GET /tasks/:id 400 for zero id', async () => {
  const { status, body } = await req('GET', '/tasks/0');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID 0');
});

test('GET /tasks/:id 400 for negative id', async () => {
  const { status, body } = await req('GET', '/tasks/-1');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID -1');
});

test('GET /tasks/:id 400 for float id', async () => {
  const { status, body } = await req('GET', '/tasks/1.5');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID 1.5');
});

test('GET /tasks/:id 400 for Infinity id', async () => {
  const { status, body } = await req('GET', '/tasks/Infinity');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID Infinity');
});

test('GET /tasks/:id 400 for hex id', async () => {
  const { status, body } = await req('GET', '/tasks/0x1');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID 0x1');
});

test('GET /tasks/:id 400 for leading-zero id', async () => {
  const { status, body } = await req('GET', '/tasks/01');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID 01');
});

test('GET /tasks/:id 400 for float-string id', async () => {
  const { status, body } = await req('GET', '/tasks/1.0');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID 1.0');
});

test('GET /tasks/:id 400 for signed id', async () => {
  const { status, body } = await req('GET', '/tasks/%2B2');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID +2');
});

test('GET /tasks/:id 400 for whitespace id', async () => {
  const { status, body } = await req('GET', '/tasks/%201%20');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID  1 ');
});

test('unknown route returns 404 for all methods', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    const { status, body } = await req(method, '/nope');
    assert.equal(status, 404);
    assert.equal(body.error, `Route ${method} /nope not found`);
  }
});

test('POST /tasks creates task', async () => {
  const { status, body } = await req('POST', '/tasks', { title: 'New Task' });
  assert.equal(status, 201);
  assert.equal(body.title, 'New Task');
  assert.equal(body.done, false);
  assert.ok(body.id >= 4);
});

test('POST /tasks trims title but stores raw', async () => {
  const { status, body } = await req('POST', '/tasks', { title: '  Padded  ' });
  assert.equal(status, 201);
  assert.equal(body.title, '  Padded  ');
});

test('POST /tasks 400 without body', async () => {
  const { status, body } = await req('POST', '/tasks');
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with empty body object', async () => {
  const { status, body } = await req('POST', '/tasks', {});
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with null title', async () => {
  const { status, body } = await req('POST', '/tasks', { title: null });
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with empty string title', async () => {
  const { status, body } = await req('POST', '/tasks', { title: '' });
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with whitespace-only title', async () => {
  const { status, body } = await req('POST', '/tasks', { title: '   ' });
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with numeric title', async () => {
  const { status, body } = await req('POST', '/tasks', { title: 42 });
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with boolean title', async () => {
  const { status, body } = await req('POST', '/tasks', { title: true });
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with object title', async () => {
  const { status, body } = await req('POST', '/tasks', { title: { a: 1 } });
  assert.equal(status, 400);
  assert.equal(body.error, 'Missing title');
});

test('POST /tasks 400 with malformed JSON', async () => {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"title": "oops"'
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Invalid JSON body');
});

test('POST /tasks 400 with extra fields', async () => {
  const { status, body } = await req('POST', '/tasks', { title: 'Extra', done: true, bogus: 1 });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('POST /tasks 400 with done even when valid', async () => {
  const { status, body } = await req('POST', '/tasks', { title: 'Extra', done: false });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('POST /tasks 400 with garbage done', async () => {
  const { status, body } = await req('POST', '/tasks', { title: 'Extra', done: 'garbage' });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('POST /tasks 400 with only extra field', async () => {
  const { status, body } = await req('POST', '/tasks', { done: true });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id updates title only', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { title: 'Renamed A' });
  assert.equal(status, 200);
  assert.equal(body.title, 'Renamed A');
  assert.equal(body.done, false);
});

test('PUT /tasks/:id updates done only', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { done: true });
  assert.equal(status, 200);
  assert.equal(body.title, 'Renamed A');
  assert.equal(body.done, true);
});

test('PUT /tasks/:id updates both fields', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { title: 'Final A', done: false });
  assert.equal(status, 200);
  assert.equal(body.title, 'Final A');
  assert.equal(body.done, false);
});

test('PUT /tasks/:id 400 with empty body', async () => {
  const { status, body } = await req('PUT', '/tasks/1', {});
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 without body', async () => {
  const { status, body } = await req('PUT', '/tasks/1');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 with numeric title', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { title: 7 });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 with string done', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { done: 'true' });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 with numeric done', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { done: 1 });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 with null done', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { done: null });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 when valid title paired with null done', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { title: 'X', done: null });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 when valid title paired with string done', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { title: 'X', done: 'garbage' });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 400 when numeric title paired with valid done', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { title: 7, done: true });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid request body');
});

test('PUT /tasks/:id 200 with done only', async () => {
  const { status, body } = await req('PUT', '/tasks/1', { done: false });
  assert.equal(status, 200);
  assert.equal(body.title, 'Final A');
  assert.equal(body.done, false);
});

test('PUT /tasks/:id 404 for missing task', async () => {
  const { status, body } = await req('PUT', '/tasks/7777', { title: 'X' });
  assert.equal(status, 404);
  assert.equal(body.error, 'Task 7777 not found');
});

test('PUT /tasks/:id 400 for invalid id', async () => {
  const { status, body } = await req('PUT', '/tasks/zzz', { title: 'X' });
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID zzz');
});

test('DELETE /tasks/:id deletes task', async () => {
  const { status } = await req('DELETE', '/tasks/2');
  assert.equal(status, 204);
  const check = await req('GET', '/tasks/2');
  assert.equal(check.status, 404);
});

test('DELETE /tasks/:id 404 for already-deleted task', async () => {
  const { status, body } = await req('DELETE', '/tasks/2');
  assert.equal(status, 404);
  assert.equal(body.error, 'Task 2 not found');
});

test('DELETE /tasks/:id 404 for missing task', async () => {
  const { status, body } = await req('DELETE', '/tasks/424242');
  assert.equal(status, 404);
  assert.equal(body.error, 'Task 424242 not found');
});

test('DELETE /tasks/:id 400 for invalid id', async () => {
  const { status, body } = await req('DELETE', '/tasks/abc');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID abc');
});

test('DELETE /tasks/:id 400 for zero id', async () => {
  const { status, body } = await req('DELETE', '/tasks/0');
  assert.equal(status, 400);
  assert.equal(body.error, 'Invalid ID 0');
});
