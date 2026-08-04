import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBody, createRules, updateRules } from '../src/validation.js';

test('create valid title passes', () => {
  const { body } = validateBody({ title: 'Task' }, createRules, { required: ['title'] });
  assert.deepEqual(body, { title: 'Task' });
});

test('create rejects missing title', () => {
  const { error } = validateBody({}, createRules, { required: ['title'] });
  assert.equal(error, 'Missing title');
});

test('create rejects invalid title types', () => {
  for (const title of [null, undefined, '', '   ', 42, true, {}, []]) {
    const { error } = validateBody({ title }, createRules, { required: ['title'] });
    assert.equal(error, 'Missing title');
  }
});

test('create rejects unknown keys', () => {
  const { error } = validateBody({ title: 'Task', done: false }, createRules, { required: ['title'] });
  assert.equal(error, 'Invalid request body');
});

test('create rejects non-object bodies', () => {
  for (const body of [null, undefined, 42, 'x', true, [1, 2]]) {
    const { error } = validateBody(body, createRules, { required: ['title'] });
    assert.equal(error, 'Invalid request body');
  }
});

test('update accepts partial valid fields', () => {
  const { body } = validateBody({ title: 'Renamed' }, updateRules, { requireOne: true });
  assert.deepEqual(body, { title: 'Renamed' });
  const { body: body2 } = validateBody({ done: true }, updateRules, { requireOne: true });
  assert.deepEqual(body2, { done: true });
});

test('update rejects empty body', () => {
  const { error } = validateBody({}, updateRules, { requireOne: true });
  assert.equal(error, 'Invalid request body');
});

test('update rejects type violations', () => {
  const bad = [
    { title: 7 },
    { done: 'true' },
    { done: 1 },
    { done: null },
    { title: 'X', done: 'garbage' },
    { bogus: 1 }
  ];
  for (const body of bad) {
    const { error } = validateBody(body, updateRules, { requireOne: true });
    assert.equal(error, 'Invalid request body');
  }
});
