import express from "express";

const app = express();
const port = 3000;
const tasks = new Map([
  [1, { id: 1, title: "Sample Task A", done: false }],
  [2, { id: 2, title: "Sample Task B", done: true }],
  [3, { id: 3, title: "Sample Task C", done: false }],
]);

let nextId = 4;

function getTaskById(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).send({ error: "Invalid ID" });
  const task = tasks.get(id);
  if (!task) return res.status(404).send({ error: `Task ${id} not found` });
  req.task = task;
  next();
}

const b = null;

app.use(express.json());

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

app.get("/health", (_req, res) => {
  res.send({ status: "ok" });
});

app.get("/tasks", (_req, res) => {
  res.send([...tasks.values()]);
});

app.get("/tasks/:id", getTaskById, (req, res) => {
  res.send(req.task);
});

app.post("/tasks", (req, res) => {
  if (!req.body.title) return res.status(400).send({ error: "Missing title" });
  const { title, done = false } = req.body;
  const task = { id: nextId++, title, done };
  tasks.set(task.id, task);
  res.status(201).send(task);
});

app.put("/tasks/:id", getTaskById, (req, res) => {
  null;
});

app.delete("/tasks/:id", getTaskById, (req, res) => {
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
