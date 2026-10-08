import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError, badRequest, notFound, unsupportedMediaType } from '../../src/utils/errors.js';
import { createIdAllocator } from '../../src/utils/id.js';
import {
  isPlainObject,
  parsePositiveInt,
  parseBooleanString,
  assertNoUnknownKeys,
  normalizeTitle,
} from '../../src/utils/validation.js';

test('errors: AppError carries status, code and message', () => {
  const err = new AppError(418, 'teapot', 'I am a teapot');
  assert.ok(err instanceof Error);
  assert.equal(err.status, 418);
  assert.equal(err.code, 'teapot');
  assert.equal(err.message, 'I am a teapot');
  assert.equal(err.name, 'AppError');
});

test('errors: factories produce the documented status codes', () => {
  assert.equal(badRequest('x').status, 400);
  assert.equal(badRequest('x').code, 'bad_request');
  assert.equal(notFound('x').status, 404);
  assert.equal(notFound('x').code, 'not_found');
  assert.equal(unsupportedMediaType('x').status, 415);
  assert.equal(unsupportedMediaType('x').code, 'unsupported_media_type');
});

test('id allocator: assigns monotonically increasing free ids', () => {
  const alloc = createIdAllocator(3);
  assert.equal(alloc.peek(), 3);
  assert.equal(alloc.next(), 4);
  assert.equal(alloc.next(), 5);
  assert.equal(alloc.peek(), 5);
});

test('id allocator: starts above the highest seed id and never reuses ids', () => {
  const alloc = createIdAllocator(0);
  assert.equal(alloc.next(), 1);
  assert.equal(alloc.next(), 2);
  assert.equal(alloc.next(), 3);
});

test('validation: isPlainObject distinguishes objects from arrays/null', () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject({ a: 1 }), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject('x'), false);
  assert.equal(isPlainObject(3), false);
});

test('validation: parsePositiveInt accepts canonical positive integers', () => {
  assert.equal(parsePositiveInt('1'), 1);
  assert.equal(parsePositiveInt('42'), 42);
});

test('validation: parsePositiveInt rejects non-canonical or non-numeric ids', () => {
  for (const bad of ['0', '-1', '1.5', 'abc', '1a', '', ' 1', '01', '1 ', 'NaN', 'Infinity']) {
    assert.throws(() => parsePositiveInt(bad), AppError, `expected "${bad}" to be rejected`);
  }
});

test('validation: parseBooleanString only accepts true/false', () => {
  assert.equal(parseBooleanString('true'), true);
  assert.equal(parseBooleanString('false'), false);
  for (const bad of ['1', '0', 'yes', 'TRUE', '', 'true ', 'null']) {
    assert.throws(() => parseBooleanString(bad), AppError, `expected "${bad}" to be rejected`);
  }
});

test('validation: assertNoUnknownKeys rejects unrecognized query keys', () => {
  assert.doesNotThrow(() => assertNoUnknownKeys({ done: 'true' }, ['done', 'search']));
  assert.doesNotThrow(() => assertNoUnknownKeys({}, ['done', 'search']));
  assert.throws(() => assertNoUnknownKeys({ done: 'true', bogus: '1' }, ['done', 'search']), AppError);
});

test('validation: normalizeTitle trims and rejects empty/whitespace/non-string', () => {
  assert.equal(normalizeTitle('  Write docs  '), 'Write docs');
  assert.throws(() => normalizeTitle(''), AppError);
  assert.throws(() => normalizeTitle('   '), AppError);
  assert.throws(() => normalizeTitle(42), AppError);
  assert.throws(() => normalizeTitle(null), AppError);
});
