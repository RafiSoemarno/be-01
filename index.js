import express from 'express';

const app = express();
const port = 3000;

app.use(express.json());

const tasks = new Map([
  [1, {id: 1, title: 'Sample Task A', done: false}],
  [2, {id: 2, title: 'Sample Task B', done: true}],
  [3, {id: 3, title: 'Sample Task C', done: false}]
]);

let nextId = 4;

app.get('/', (req, res) => {
  res.send({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

app.get('/tasks', (req, res) => {
  res.send([...tasks.values()]);
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.get(id);
  if (task) res.send(task);
  else res.status(404).send({ error: `Task ${id} not found` });
});

app.post('/tasks', (req, res) => {
  if (!req.body.title) return res.status(400).send({ error: 'Missing title' });
  const { title, done = false } = req.body;
  const task = { id: nextId++, title, done };
  tasks.set(task.id, task);
  res.status(201).send(task);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ error: err.message });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
