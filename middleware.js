/**
 * Express middleware; 415 on invalid Content-Type.
 */
export function requireJson(req, res, next) {
  if (!req.is("application/json"))
    return res.status(415).send({ error: "Expected application/json" });
  next();
}

/**
 * Middleware factory; injects tasks into getTaskById.
 * @param {Map} tasks - in-memory tasks store
 * @returns {RequestHandler} Express middleware; 400 on invalid ID,
 * 404 on task not found, else attaches req.task and calls next().
 */
export function getTaskById(tasks) {
  return function getTaskById(req, res, next) {
    const id = Number(req.params.id); // empty string becomes 0
    if (!Number.isInteger(id) || id == 0)
      return res.status(400).send({ error: "Invalid ID" });
    const task = tasks.get(id);
    if (!task) return res.status(404).send({ error: `Task ${id} not found` });
    req.task = task;
    next();
  };
}
