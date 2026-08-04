import express from 'express';
import { fileURLToPath } from 'node:url';

const app = express();
const port = 3000;

app.use(express.json());

const tasks = new Map([
  [1, {id: 1, title: 'Sample Task A', done: false}],
  [2, {id: 2, title: 'Sample Task B', done: true}],
  [3, {id: 3, title: 'Sample Task C', done: false}]
]);

let nextId = 4;

function isValidTitle(title) {
  return typeof title === 'string' && title.trim() !== '';
}

const isBoolean = (v) => typeof v === 'boolean';

const createRules = { title: isValidTitle };
const updateRules = { title: isValidTitle, done: isBoolean };

function validateBody(body, rules, { required = [], requireOne = false } = {}) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body' };
  }
  const keys = Object.keys(body);
  if (keys.some((k) => !(k in rules))) return { error: 'Invalid request body' };
  if (requireOne && keys.length === 0) return { error: 'Invalid request body' };
  if (required.some((k) => !(k in body))) return { error: 'Missing title' };
  if (required.some((k) => !rules[k](body[k]))) return { error: 'Missing title' };
  if (!keys.every((k) => rules[k](body[k]))) return { error: 'Invalid request body' };
  return { body };
}

function requireTask(req, res, next) {
  const raw = req.params.id;
  if (!/^[1-9][0-9]*$/.test(raw)) {
    return res.status(400).send({ error: `Invalid ID ${raw}` });
  }
  const id = Number(raw);
  const task = tasks.get(id);
  if (!task) return res.status(404).send({ error: `Task ${id} not found` });
  req.task = task;
  next();
}

app.get('/', (req, res) => {
  res.send({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

app.get('/tasks', (req, res) => {
  res.send([...tasks.values()]);
});

app.get('/tasks/:id', requireTask, (req, res) => {
  res.send(req.task);
});

app.post('/tasks', (req, res) => {
  const result = validateBody(req.body ?? {}, createRules, { required: ['title'] });
  if (result.error) return res.status(400).send({ error: result.error });
  const task = { id: nextId++, title: result.body.title, done: false };
  tasks.set(task.id, task);
  res.status(201).send(task);
});

app.put('/tasks/:id', requireTask, (req, res) => {
  const result = validateBody(req.body ?? {}, updateRules, { requireOne: true });
  if (result.error) return res.status(400).send({ error: result.error });
  for (const k of Object.keys(result.body)) req.task[k] = result.body[k];
  res.send(req.task);
});

app.delete('/tasks/:id', requireTask, (req, res) => {
  tasks.delete(req.task.id);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).send({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).send({ error: 'Invalid JSON body' });
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
    return res.status(500).send({ error: 'Internal server error' });
  }
  res.status(status).send({ error: 'Invalid request body' });
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

export default app;
