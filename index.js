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


app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user });
});


app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
});

// AUTH MIDDLEWARE - reusable guard for protected routes
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user; // attach user to request
  next(); // move to the route
};

app.get('/public/info', (req, res) => {
  res.json({ message: "Welcome stranger! This info is public." });
});

app.get('/protected/profile', requireAuth, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at
  });
});

app.get('/protected/dashboard', requireAuth, async (req, res) => {
  res.json({
    message: `Welcome to your dashboard, ${req.user.email}`,
    userId: req.user.id
  });
});

app.post('/auth/logout', requireAuth, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(204).send();
});

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
   console.log('Connected to Supabase');
});