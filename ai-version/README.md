# task-crud-api

A CRUD API for managing todo tasks, built with Node.js and Express. In-memory data store, request validation, and interactive Swagger UI documentation.

## Stack

- Node.js / Express
- In-memory array as the data store (no database)
- swagger-ui-express for interactive API docs, driven by `openapi.json`

## Setup

```bash
npm install
node server.js
```

Server runs at `http://localhost:3000`.
Interactive docs (Try it out) at `http://localhost:3000/api-docs`.

## Data model

```json
{ "id": 1, "title": "Set up Node.js and Express project", "done": true }
```

## Endpoints

| Method | Path         | Description              | Success | Errors |
|--------|--------------|---------------------------|---------|--------|
| GET    | `/`          | Health check + API info   | 200     | -      |
| GET    | `/tasks`     | Get all tasks             | 200     | -      |
| GET    | `/tasks/:id` | Get a task by id          | 200     | 404    |
| POST   | `/tasks`     | Create a task              | 201     | 400    |
| PUT    | `/tasks/:id` | Update a task              | 200     | 400, 404 |
| DELETE | `/tasks/:id` | Delete a task              | 204     | 404    |

Validation rules:
- `POST /tasks` → 400 if `title` is missing or empty.
- `PUT /tasks/:id` → 400 if the request body is empty; 404 if the task id doesn't exist.
- `GET/PUT/DELETE /tasks/:id` → 404 if the task id doesn't exist.

## curl examples

```bash
# Health check
curl http://localhost:3000/

# Get all tasks
curl http://localhost:3000/tasks

# Get a single task
curl http://localhost:3000/tasks/1

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write internship report"}'

# Missing title -> 400
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"done":false}'

# Update a task
curl -X PUT http://localhost:3000/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

# Empty body -> 400
curl -X PUT http://localhost:3000/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{}'

# Delete a task
curl -X DELETE http://localhost:3000/tasks/3
```
