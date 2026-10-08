import express from "express";
import swaggerUi from "swagger-ui-express";
import openapi from "./openapi.json" with { type: "json" };
import seed from "./seed.json" with { type: "json" };
import { isValidTitle, isValidDone } from "./utilities.js";
import { requireJson, getTaskById, validateQuery } from "./middleware.js";

const app = express();
const port = 3000;

// using Map for O(1) search time
const tasks = new Map(seed.map((task) => [task.id, task]));
// set floor = 0 to avoid errors with empty arrays
const nextSeedId = Math.max(0, ...seed.map((task) => task.id)) + 1;
let nextId = nextSeedId;

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.get("/", (_req, res) => {
  res.send({
    name: "Task API",
    version: "Stage 6.4.1",
    endpoints: [
      "/docs",
      "/tasks",
      "/health",
      "/stats",
      "/tasks/{id}",
      "POST /tasks",
      "POST /reset",
      "PATCH /tasks/{id}",
      "DELETE /tasks/{id}",
    ],
  });
});

app.get("/health", (_req, res) => {
  res.send({ status: "ok" });
});

app.get("/stats", (_req, res) => {
  const total = tasks.size;
  const done = [...tasks.values()].filter((task) => task.done).length;
  const open = total - done;
  res.send({ total, done, open });
});

app.get("/tasks", validateQuery, (req, res) => {
  const { done } = req.query;
  // normalize here: req.query is a read-only getter in Express 5
  const search = req.query.search?.trim().toLowerCase();
  const match = (task) =>
    (done === undefined || task.done === (done === "true")) &&
    (search === undefined || task.title.toLowerCase().includes(search));
  res.send([...tasks.values()].filter(match));
});

app.get("/tasks/:id", getTaskById(tasks), (req, res) => {
  res.send(req.task);
});

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

app.post("/reset", (_req, res) => {
  tasks.clear();
  for (const task of seed) tasks.set(task.id, task);
  nextId = nextSeedId;
  res.send([...tasks.values()]);
});

app.patch("/tasks/:id", requireJson, getTaskById(tasks), (req, res) => {
  const { title, done } = req.body;
  const task = { ...req.task };
  const hasTitle = req.body.title !== undefined;
  const hasDone = req.body.done !== undefined;
  if (!hasTitle && !hasDone)
    return res.status(400).send({ error: "Missing title/done" });
  if (hasTitle) {
    if (!isValidTitle(title))
      return res.status(400).send({ error: "Invalid title" });
    task.title = title;
  }
  if (hasDone) {
    if (!isValidDone(done))
      return res.status(400).send({ error: "Invalid done" });
    task.done = done;
  }
  tasks.set(task.id, task);
  return res.status(200).send(task);
});

app.delete("/tasks/:id", getTaskById(tasks), (req, res) => {
  const id = req.task.id;
  tasks.delete(id);
  res.status(204).end();
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ error: err.message });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
