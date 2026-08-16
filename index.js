const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());


async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE
    )
  `);

  const { rows } = await db.query('SELECT COUNT(*) as count FROM tasks');
  if (parseInt(rows[0].count) === 0) {
    await db.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", ['Do assignment 1', false]);
    await db.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", ['Read a resource', true]);
    await db.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", ['Take a shower', false]);
  }
}

initDB();

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


app.get('/tasks', async (req, res) => {
  console.log('Reading tasks from Postgres');
  const { rows } = await db.query('SELECT * FROM tasks');
  res.json(rows);
});


app.get('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(rows[0]);
});

// POST
app.post('/tasks', async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "Title is required" });
  }

  const { rows } = await db.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, false]
  );

  res.status(201).json(rows[0]);
});

// PUT
app.put('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body;

  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: "Provide title or done to update" });
  }

  const task = rows[0];
  const newTitle = title !== undefined ? title : task.title;
  const newDone = done !== undefined ? done : task.done;

  const { rows: updated } = await db.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [newTitle, newDone, id]
  );

  res.json(updated[0]);
});


app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.status(204).send();
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
   console.log('Connected to Supabase');
});