const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory data store
// ---------------------------------------------------------------------------
let tasks = [
  { id: 1, title: 'Set up Node.js and Express project', done: true },
  { id: 2, title: 'Build CRUD endpoints for tasks', done: false },
  { id: 3, title: 'Add request validation', done: false },
  { id: 4, title: 'Document API with Swagger UI', done: false },
];
let nextId = tasks.length + 1;

// ---------------------------------------------------------------------------
// Root: health check + API description
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Task CRUD API is running',
    status: 'healthy',
    description: 'A simple in-memory CRUD API for managing todo tasks, built with Node.js and Express.',
    docs: '/api-docs',
    endpoints: {
      'GET /tasks': 'Get all tasks',
      'GET /tasks/:id': 'Get a single task by id',
      'POST /tasks': 'Create a new task',
      'PUT /tasks/:id': 'Update an existing task',
      'DELETE /tasks/:id': 'Delete a task',
    },
  });
});

// ---------------------------------------------------------------------------
// GET all tasks
// ---------------------------------------------------------------------------
app.get('/tasks', (req, res) => {
  res.status(200).json({
    message: 'Tasks retrieved successfully',
    count: tasks.length,
    data: tasks,
  });
});

// ---------------------------------------------------------------------------
// GET task by id
// ---------------------------------------------------------------------------
app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ message: `Task with id ${id} not found` });
  }

  res.status(200).json({ message: 'Task retrieved successfully', data: task });
});

// ---------------------------------------------------------------------------
// POST new task
// ---------------------------------------------------------------------------
app.post('/tasks', (req, res) => {
  const { title, done } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required and cannot be empty' });
  }

  const newTask = {
    id: nextId++,
    title: title.trim(),
    done: typeof done === 'boolean' ? done : false,
  };

  tasks.push(newTask);
  res.status(201).json({ message: 'Task created successfully', data: newTask });
});

// ---------------------------------------------------------------------------
// PUT update task
// ---------------------------------------------------------------------------
app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};

  if (Object.keys(body).length === 0) {
    return res.status(400).json({ message: 'Request body cannot be empty' });
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ message: `Task with id ${id} not found` });
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }
    task.title = body.title.trim();
  }

  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') {
      return res.status(400).json({ message: 'done must be a boolean' });
    }
    task.done = body.done;
  }

  res.status(200).json({ message: 'Task updated successfully', data: task });
});

// ---------------------------------------------------------------------------
// DELETE task
// ---------------------------------------------------------------------------
app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ message: `Task with id ${id} not found` });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Swagger UI
// ---------------------------------------------------------------------------
const openapiDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
