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

/**
 * Express middleware; 400 on invalid `done` or `search` query param.
 * Absent params pass. Normalization of `search` is left to the route handler,
 * since `req.query` is a read-only getter in Express 5.
 */
export function validateQuery(req, res, next) {
  const { done, search } = req.query;
  if (done !== undefined && done !== "true" && done !== "false")
    return res.status(400).send({ error: "Invalid done query" });
  if (search !== undefined && typeof search !== "string")
    return res.status(400).send({ error: "Invalid search query" });
  next();
}
