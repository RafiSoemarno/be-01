import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createIdAllocator } from '../utils/id.js';

const SEED_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'seed.json');

/**
 * Reads and validates the persisted seed file. The seed is the only data that
 * survives a restart; everything else lives in memory.
 * @returns {{id: number, title: string, done: boolean}[]}
 */
function loadSeed() {
  const parsed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new TypeError('seed.json must contain an array of tasks');
  }
  return parsed.map((task, index) => {
    if (!task || typeof task.title !== 'string') {
      throw new TypeError(`seed.json entry ${index} is missing a string title`);
    }
    return {
      id: Number.isInteger(task.id) ? task.id : index + 1,
      title: task.title,
      done: Boolean(task.done),
    };
  });
}

/**
 * Creates an isolated in-memory task store seeded with `seed`.
 *
 * Records are always handed out as copies so callers can never mutate internal
 * state by accident. `reset()` restores the store to its seed, which keeps
 * tests independent.
 *
 * @param {{id: number, title: string, done: boolean}[]} [seed]
 */
export function createTaskStore(seed = []) {
  const initial = seed.map((task) => ({ ...task }));
  /** @type {Map<number, {id:number,title:string,done:boolean}>} */
  let tasks = new Map();
  let allocator = createIdAllocator(0);

  function reset() {
    tasks = new Map();
    let maxId = 0;
    for (const task of initial) {
      tasks.set(task.id, { ...task });
      if (task.id > maxId) maxId = task.id;
    }
    allocator = createIdAllocator(maxId);
  }

  reset();

  return {
    /**
     * @param {{done?: boolean, search?: string}} [filters]
     * @returns {{id:number,title:string,done:boolean}[]}
     */
    list({ done, search } = {}) {
      let result = [...tasks.values()].sort((a, b) => a.id - b.id);
      if (done !== undefined) {
        result = result.filter((task) => task.done === done);
      }
      if (search !== undefined) {
        result = result.filter((task) => task.title.includes(search));
      }
      return result.map((task) => ({ ...task }));
    },

    /** @returns {{id:number,title:string,done:boolean}|undefined} */
    get(id) {
      const task = tasks.get(id);
      return task ? { ...task } : undefined;
    },

    /** @returns {{id:number,title:string,done:boolean}} the created task. */
    create({ title }) {
      const id = allocator.next();
      const task = { id, title, done: false };
      tasks.set(id, task);
      return { ...task };
    },

    /** @returns {{id:number,title:string,done:boolean}|undefined} updated or undefined when absent. */
    update(id, patch) {
      const current = tasks.get(id);
      if (!current) return undefined;
      const next = { ...current };
      if (patch.title !== undefined) next.title = patch.title;
      if (patch.done !== undefined) next.done = patch.done;
      tasks.set(id, next);
      return { ...next };
    },

    /** @returns {boolean} true when a task was removed. */
    remove(id) {
      return tasks.delete(id);
    },

    reset,

    get size() {
      return tasks.size;
    },
  };
}

/** Application-wide singleton store, seeded from `src/data/seed.json`. */
export const taskStore = createTaskStore(loadSeed());
