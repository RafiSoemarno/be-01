import express from "express";
import swaggerUi from "swagger-ui-express";
import openapi from "./openapi.json" with { type: "json" };
import { isValidTitle, isValidDone } from "./utilities.js";
import { requireJson, getTaskById, validateQuery } from "./middleware.js";

const app = express();
const port = 3000;

// using Map for O(1) search time
const tasks = new Map([
  [1, { id: 1, title: "Sample Task A", done: false }],
  [2, { id: 2, title: "Sample Task B", done: true }],
  [3, { id: 3, title: "Sample Task C", done: false }],
]);
let nextId = 4;

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.get("/", (_req, res) => {
  res.send({
    name: "Task API",
    version: "Stage 6.2",
    endpoints: [
      "/docs",
      "/tasks",
      "/health",
      "/tasks/{id}",
      "POST /tasks",
      "PUT /tasks/{id}",
      "DELETE /tasks/{id}",
    ],
  });
});

app.get("/health", (_req, res) => {
  res.send({ status: "ok" });
});

app.get("/tasks", validateQuery, (req, res) => {
  const { done, search } = req.query;
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

// accepts partial updates - should probably use PATCH instead
app.put("/tasks/:id", requireJson, getTaskById(tasks), (req, res) => {
  const { title, done } = req.body;
  const validTitle = isValidTitle(title);
  const validDone = isValidDone(done);
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
