import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateListQuery,
  validateIdParam,
  requireJsonBody,
  validateCreateBody,
  validateUpdateBody,
} from '../../src/middleware/validate.js';
import { notFoundHandler, errorHandler } from '../../src/middleware/errorHandler.js';
import { AppError, badRequest, notFound } from '../../src/utils/errors.js';
import { createMockRes, invoke } from '../helpers/http.js';

test('validateListQuery: absent filters leave validated empty', async () => {
  const req = { query: {} };
  const { error } = await invoke(validateListQuery, req);
  assert.equal(error, undefined);
  assert.deepEqual(req.validated, { done: undefined, search: undefined });
});

test('validateListQuery: normalizes done to a boolean and keeps search', async () => {
  const req = { query: { done: 'true', search: 'alp' } };
  const { error } = await invoke(validateListQuery, req);
  assert.equal(error, undefined);
  assert.deepEqual(req.validated, { done: true, search: 'alp' });
});

test('validateListQuery: rejects an invalid done value', async () => {
  const req = { query: { done: 'yes' } };
  const { error } = await invoke(validateListQuery, req);
  assert.ok(error instanceof AppError);
  assert.equal(error.status, 400);
});

test('validateListQuery: rejects a non-string search (repeated params)', async () => {
  const req = { query: { search: ['a', 'b'] } };
  const { error } = await invoke(validateListQuery, req);
  assert.ok(error instanceof AppError);
  assert.equal(error.status, 400);
});

test('validateListQuery: rejects unknown query parameters', async () => {
  const req = { query: { bogus: '1' } };
  const { error } = await invoke(validateListQuery, req);
  assert.ok(error instanceof AppError);
  assert.equal(error.status, 400);
});

test('validateIdParam: accepts a canonical positive integer', async () => {
  const req = { params: { id: '7' } };
  const { error } = await invoke(validateIdParam, req);
  assert.equal(error, undefined);
  assert.deepEqual(req.validated, { id: 7 });
});

test('validateIdParam: rejects malformed ids with 400', async () => {
  for (const bad of ['abc', '0', '-2', '1.2', '01']) {
    const req = { params: { id: bad } };
    const { error } = await invoke(validateIdParam, req);
    assert.ok(error instanceof AppError, `expected "${bad}" to fail`);
    assert.equal(error.status, 400);
  }
});

test('requireJsonBody: passes when content-type is application/json', async () => {
  const req = { is: () => 'application/json', headers: { 'content-length': '12' } };
  const { error } = await invoke(requireJsonBody, req);
  assert.equal(error, undefined);
});

test('requireJsonBody: rejects a non-empty non-JSON body with 415', async () => {
  const req = { is: () => false, headers: { 'content-length': '12' } };
  const { error } = await invoke(requireJsonBody, req);
  assert.ok(error instanceof AppError);
  assert.equal(error.status, 415);
});

test('requireJsonBody: rejects a missing body with 400', async () => {
  for (const headers of [{}, { 'content-length': '0' }]) {
    const req = { is: () => null, headers };
    const { error } = await invoke(requireJsonBody, req);
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 400);
  }
});

test('validateCreateBody: accepts a title and ignores extra fields', async () => {
  const req = { body: { title: '  New task  ', done: true, extra: 1 } };
  const { error } = await invoke(validateCreateBody, req);
  assert.equal(error, undefined);
  assert.deepEqual(req.validated, { title: 'New task' });
});

test('validateCreateBody: rejects missing, empty, or non-string titles', async () => {
  for (const body of [{}, { title: '' }, { title: '   ' }, { title: 5 }, null, []]) {
    const req = { body };
    const { error } = await invoke(validateCreateBody, req);
    assert.ok(error instanceof AppError, `expected ${JSON.stringify(body)} to fail`);
    assert.equal(error.status, 400);
  }
});

test('validateUpdateBody: accepts title, done, or both', async () => {
  const a = { body: { title: ' New ' } };
  await invoke(validateUpdateBody, a);
  assert.deepEqual(a.validated, { title: 'New' });

  const b = { body: { done: true } };
  await invoke(validateUpdateBody, b);
  assert.deepEqual(b.validated, { done: true });

  const c = { body: { title: 'New', done: false, extra: 1 } };
  await invoke(validateUpdateBody, c);
  assert.deepEqual(c.validated, { title: 'New', done: false });
});

test('validateUpdateBody: rejects empty payloads and payloads with no known field', async () => {
  for (const body of [{}, { extra: 1 }, { other: 'x' }, null, []]) {
    const req = { body };
    const { error } = await invoke(validateUpdateBody, req);
    assert.ok(error instanceof AppError, `expected ${JSON.stringify(body)} to fail`);
    assert.equal(error.status, 400);
  }
});

test('validateUpdateBody: rejects invalid field types', async () => {
  for (const body of [{ title: '' }, { title: 5 }, { done: 'yes' }, { done: 1 }]) {
    const req = { body };
    const { error } = await invoke(validateUpdateBody, req);
    assert.ok(error instanceof AppError, `expected ${JSON.stringify(body)} to fail`);
    assert.equal(error.status, 400);
  }
});

test('notFoundHandler: responds with a 404 JSON envelope', async () => {
  const req = { method: 'GET', path: '/nope' };
  const res = createMockRes();
  await invoke(notFoundHandler, req, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, 'not_found');
});

test('errorHandler: renders AppError with its status and code', async () => {
  const res = createMockRes();
  errorHandler(notFound('Task 9 not found'), { method: 'GET', path: '/tasks/9' }, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: { code: 'not_found', message: 'Task 9 not found' } });
});

test('errorHandler: maps malformed JSON to 400', async () => {
  const res = createMockRes();
  const err = new SyntaxError('Unexpected token');
  err.type = 'entity.parse.failed';
  errorHandler(err, { method: 'POST', path: '/tasks' }, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'invalid_json');
});

test('errorHandler: maps unknown errors to a generic 500 without leaking details', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const res = createMockRes();
    const secret = new Error('database password is hunter2');
    errorHandler(secret, { method: 'GET', path: '/tasks' }, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'internal_error');
    assert.equal(res.body.error.message, 'Internal server error');
    assert.ok(!JSON.stringify(res.body).includes('hunter2'));
  } finally {
    console.error = originalError;
  }
});

test('errorHandler: delegates when headers are already sent', async () => {
  let nextCalled = false;
  const res = createMockRes();
  res.headersSent = true;
  errorHandler(badRequest('late'), {}, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
