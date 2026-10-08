import { taskStore as defaultStore } from '../stores/taskStore.js';
import { notFound } from '../utils/errors.js';

/**
 * Task handlers. Validation has already run, so handlers read normalized input
 * from `req.validated` and only orchestrate the store plus the HTTP response.
 *
 * @param {ReturnType<import('../stores/taskStore.js').createTaskStore>} store
 */
export function createTaskHandlers(store) {
  function listTasks(req, res) {
    const { done, search } = req.validated ?? {};
    res.json(store.list({ done, search }));
  }

  function getTask(req, res) {
    const { id } = req.validated;
    const task = store.get(id);
    if (!task) {
      throw notFound(`Task ${id} not found`);
    }
    res.json(task);
  }

  function createTask(req, res) {
    const { title } = req.validated;
    const task = store.create({ title });
    res.status(201).location(`/tasks/${task.id}`).json(task);
  }

  function updateTask(req, res) {
    const { id } = req.validated;
    const patch = { ...req.validated };
    delete patch.id;
    const task = store.update(id, patch);
    if (!task) {
      throw notFound(`Task ${id} not found`);
    }
    res.json(task);
  }

  function deleteTask(req, res) {
    const { id } = req.validated;
    const removed = store.remove(id);
    if (!removed) {
      throw notFound(`Task ${id} not found`);
    }
    res.status(204).end();
  }

  return { listTasks, getTask, createTask, updateTask, deleteTask };
}
