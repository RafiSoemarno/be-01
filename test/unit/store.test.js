import test from 'node:test';
import assert from 'node:assert/strict';

import { createTaskStore } from '../../src/stores/taskStore.js';

const SEED = [
  { id: 1, title: 'Alpha task', done: true },
  { id: 2, title: 'Beta task', done: false },
  { id: 3, title: 'Gamma task', done: false },
];

function freshStore() {
  return createTaskStore(SEED);
}

test('store: lists seeded tasks ordered by id', () => {
  const store = freshStore();
  assert.deepEqual(
    store.list().map((t) => t.id),
    [1, 2, 3],
  );
  assert.equal(store.size, 3);
});

test('store: get returns a task or undefined', () => {
  const store = freshStore();
  assert.deepEqual(store.get(2), { id: 2, title: 'Beta task', done: false });
  assert.equal(store.get(999), undefined);
});

test('store: list filters by done', () => {
  const store = freshStore();
  assert.deepEqual(
    store.list({ done: true }).map((t) => t.id),
    [1],
  );
  assert.deepEqual(
    store.list({ done: false }).map((t) => t.id),
    [2, 3],
  );
});

test('store: list filters by case-sensitive substring search', () => {
  const store = freshStore();
  assert.deepEqual(
    store.list({ search: 'task' }).map((t) => t.id),
    [1, 2, 3],
  );
  assert.deepEqual(
    store.list({ search: 'Beta' }).map((t) => t.id),
    [2],
  );
  assert.deepEqual(store.list({ search: 'beta' }), []);
  assert.deepEqual(store.list({ search: 'nope' }), []);
});

test('store: list combines done and search filters', () => {
  const store = freshStore();
  assert.deepEqual(
    store.list({ done: false, search: 'Gamma' }).map((t) => t.id),
    [3],
  );
});

test('store: create assigns the next free id and done=false', () => {
  const store = freshStore();
  const created = store.create({ title: 'Delta task' });
  assert.deepEqual(created, { id: 4, title: 'Delta task', done: false });
  assert.equal(store.size, 4);
});

test('store: create returns a copy, not the internal record', () => {
  const store = freshStore();
  const created = store.create({ title: 'Delta task' });
  created.title = 'mutated';
  assert.equal(store.get(4).title, 'Delta task');
});

test('store: update patches title and/or done', () => {
  const store = freshStore();
  assert.deepEqual(store.update(2, { title: 'Beta v2' }), {
    id: 2,
    title: 'Beta v2',
    done: false,
  });
  assert.deepEqual(store.update(2, { done: true }), { id: 2, title: 'Beta v2', done: true });
  assert.deepEqual(store.update(2, { title: 'Beta v3', done: false }), {
    id: 2,
    title: 'Beta v3',
    done: false,
  });
});

test('store: update returns undefined for a missing id', () => {
  const store = freshStore();
  assert.equal(store.update(999, { done: true }), undefined);
});

test('store: remove deletes and reports success', () => {
  const store = freshStore();
  assert.equal(store.remove(2), true);
  assert.equal(store.get(2), undefined);
  assert.equal(store.remove(2), false);
  assert.equal(store.size, 2);
});

test('store: ids are never reused after deletion', () => {
  const store = freshStore();
  store.remove(3);
  const created = store.create({ title: 'Delta task' });
  assert.equal(created.id, 4);
});

test('store: reset restores the seed exactly', () => {
  const store = freshStore();
  store.create({ title: 'Delta task' });
  store.remove(1);
  store.update(2, { title: 'changed' });
  store.reset();
  assert.deepEqual(
    store.list(),
    SEED.map((t) => ({ ...t })),
  );
  assert.equal(store.create({ title: 'Delta task' }).id, 4);
});
