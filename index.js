const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('tasks.db');

app.use(express.json());


db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);


const count = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
if (count.count === 0) {
  db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)").run('Do assignment 1', 0);
  db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)").run('Read a resource', 1);
  db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)").run('Take a shower', 0);
}


app.get('/', (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks", "/health", "/docs"]
  });
});


app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

app.get('/tasks', (req, res) => {
  const { done, search } = req.query;

  let query = 'SELECT * FROM tasks';
  const params = [];

  if (done !== undefined && search !== undefined) {
    query += ' WHERE done = ? AND title LIKE ?';
    params.push(done === 'true' ? 1 : 0, `%${search}%`);
  } else if (done !== undefined) {
    query += ' WHERE done = ?';
    params.push(done === 'true' ? 1 : 0);
  } else if (search !== undefined) {
    query += ' WHERE title LIKE ?';
    params.push(`%${search}%`);
  }

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});


app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(task);
});


app.post('/tasks', (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "Title is required" });
  }

  const result = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(title, 0);
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(newTask);
});


app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body;

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: "Provide title or done to update" });
  }

  const newTitle = title !== undefined ? title : task.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updatedTask);
});


app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});


app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
  console.log(`Docs at http://localhost:3000/docs`);
});