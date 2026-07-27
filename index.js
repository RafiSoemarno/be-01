import express from 'express';

const app = express();
const port = 3000;
const tasks = [
  {id: 1, title: 'Sample Task A', done: false},
  {id: 2, title: 'Sample Task B', done: true},
  {id: 3, title: 'Sample Task C', done: false}
];

app.get('/', (req, res) => {
  res.send({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

app.get('/tasks', (req, res) => {
  res.send(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const id = req.params.id;
  const task = tasks.find(task => task.id === Number(id));
  if (task) res.send(task);
  else res.status(404).send({ error: `Task ${id} not found` });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
