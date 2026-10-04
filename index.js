import express from "express";

const app = express();
const port = 3000;
// using Map for O(1) search time
const tasks = new Map([
  [1, { id: 1, title: "Sample Task A", done: false }],
  [2, { id: 2, title: "Sample Task B", done: true }],
  [3, { id: 3, title: "Sample Task C", done: false }],
]);
let nextId = 4;

// JSON parsing middleware
app.use(express.json());

/**
 * Express middleware; res.status 415 on invalid Content-Type.
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {NextFunction} next - Express next() callback
 * @returns {void}
 */
function requireJson(req, res, next) {
  if (!req.is("application/json"))
    return res.status(415).send({ error: "Expected application/json" });
  next();
}

/**
 * Express middleware; res.status 400 on invalid parameter ID;
 * res.status 404 on missing task; attaches task to req if found and calls next().
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {NextFunction} next - Express next() callback
 * @returns {void}
 */
function getTaskById(req, res, next) {
  const id = Number(req.params.id); // empty string becomes 0
  if (!Number.isInteger(id) || id == 0)
    return res.status(400).send({ error: "Invalid ID" });
  const task = tasks.get(id);
  if (!task) return res.status(404).send({ error: `Task ${id} not found` });
  req.task = task;
  next();
}

/**
 * Helper function; true if title is non-empty string, else false.
 * @param {string} title - task title to validate
 * @returns {boolean}
 */
function isValidTitle(title) {
  if (typeof title == "string" && title.trim() !== "") return true;
  return false;
}

/**
 * Helper function; true if done is boolean, else false.
 * @param {boolean} done - task done flag to validate
 * @returns {boolean}
 */
function isValidDone(done) {
  if (typeof done == "boolean") return true;
  return false;
}

// show list of all routes
app.get("/", (_req, res) => {
  res.send({
    name: "Task API",
    version: "stage-4",
    endpoints: [
      "/tasks",
      "/health",
      "/tasks/{id}",
      "POST /tasks",
      "PUT /tasks/{id}",
      "DELETE /tasks/{id}",
    ],
  });
});

// check if server is ok
app.get("/health", (_req, res) => {
  res.send({ status: "ok" });
});

// show list of all tasks
app.get("/tasks", (_req, res) => {
  res.send([...tasks.values()]);
});

// show specific task by ID
app.get("/tasks/:id", getTaskById, (req, res) => {
  res.send(req.task);
});

// create new task given title
app.post("/tasks", requireJson, (req, res) => {
  const title = req.body.title;
  if ("done" in req.body)
    return res.status(400).send({ error: "done is not supported on POST" });
  if (!isValidTitle(title))
    return res.status(400).send({ error: "Missing or invalid title" });
  const task = { id: nextId++, title, done: false };
  tasks.set(task.id, task);
  res.status(201).send(task);
});

/**
 * update existing task by ID given title and/or done
 * accepts partial updates
 * probably should be using PATCH instead
 */
app.put("/tasks/:id", requireJson, getTaskById, (req, res) => {
  const { title, done } = req.body;
  const validTitle = isValidTitle(title);
  const validDone = isValidDone(done);
  // use Object.hasOwn to eliminate ambiguity
  const hasTitle = "title" in req.body;
  const hasDone = "done" in req.body;
  if (hasTitle && !validTitle)
    return res.status(400).send({ error: "Invalid title" });
  if (hasDone && !validDone)
    return res.status(400).send({ error: "Invalid done" });
  let task = { ...req.task };
  if (validTitle) task.title = title;
  if (validDone) task.done = done;
  tasks.set(task.id, task);
  return res.status(200).send(task);
});

// delete existing task by ID
app.delete("/tasks/:id", getTaskById, (req, res) => {
  const id = req.task.id;
  tasks.delete(id);
  res.status(204).end();
});

// Express error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ error: err.message });
});

// start server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
