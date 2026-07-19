# Task API

A beginner-friendly CRUD REST API for managing a to-do task list, built with Node.js and Express. 
Data is stored in-memory — no database required. Built as part of the FlyRank Backend AI Engineering Internship Program.

---

## How to Run

Make sure you have Node.js installed, then:

```bash
npm install
node index.js
```

Server starts at: http://localhost:3000  
Swagger UI docs at: http://localhost:3000/docs

---

## Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | / | Server info & intern details | 200 |
| GET | /health | Health check | 200 |
| GET | /tasks | Get all tasks | 200 |
| GET | /tasks/:id | Get a single task by ID | 200, 404 |
| POST | /tasks | Create a new task | 201, 400 |
| PUT | /tasks/:id | Update a task's title or status | 200, 400, 404 |
| DELETE | /tasks/:id | Delete a task | 204, 404 |

---

## Request & Response Examples

### Get all tasks
```bash
curl -i http://localhost:3000/tasks
```
Response:
```json
[
  { "id": 1, "title": "do assignment 1", "done": false },
  { "id": 2, "title": "Read a resource", "done": true },
  { "id": 3, "title": "take a shower", "done": false }
]
```

### Get a single task
```bash
curl -i http://localhost:3000/tasks/1
```
Response:
```json
{ "id": 1, "title": "do assignment 1", "done": false }
```

### Create a task
```bash
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
```
Response `201`:
```json
{ "id": 4, "title": "Buy milk", "done": false }
```

### Update a task
```bash
curl -i -X PUT http://localhost:3000/tasks/1 -H "Content-Type: application/json" -d '{"done":true}'
```
Response `200`:
```json
{ "id": 1, "title": "do assignment 1", "done": true }
```

### Delete a task
```bash
curl -i -X DELETE http://localhost:3000/tasks/1
```
Response: `204 No Content`

### Error — task not found
```bash
curl -i http://localhost:3000/tasks/99
```
Response `404`:
```json
{ "error": "Task 99 not found" }
```

---

## Status Codes Used

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET or PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Missing or invalid input |
| 404 | Not Found | Task ID doesn't exist |

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **API Docs:** Swagger UI (swagger-ui-express)
- **Storage:** In-memory (array) — data resets on server restart

---

## Swagger UI

Interactive API documentation available at http://localhost:3000/docs

![Swagger UI](swagger.png)

---

## The Mortality Experiment

When the server restarts, all tasks created during the previous session are permanently lost. 
This happens because data is stored in-memory (a JavaScript array), not in a database — 
the array resets to its original 3 tasks every time the server starts fresh. 

---
## Stage 7 — AI vs Me

### My Prompt

ok so basically i am a writing my fisrt assignemnt as a part of my flyrank backend ai engeenring internship which is regarding a Crud Api using node.js + express , i want you to write a Api thta has a port number 3000 and  firstly checks if the server runs then ,then i want you to use get to add an endpoint describing my api and its health then i want you to create an in memoey of a array called task that contain my todo tasks and want to add data variable , of id , title and done , do minimum 3 and max how much you want , then i want to use get operation to get all the tasks as well as tasks by id , then i want you to use post to add a new todo task, and then stage 4 use put and delete to update and delete atask use curl to check , validate  post for if title is missing or empty , validate put for  if body is empty delete using 400 and 404 error and retirn 200 along with apporpriate message accoding to the error and and accoridng to the good status for all 4, and 201 (post) and 204 ( delete ), then i want you to use swagger ui to use this index json file and make a new openapi.json to make a  interactive documentation: every endpoint listed, with a Try it out button that sends real requests, then stage 6 publish it on github

### What the AI did better
- Code was cleaner and more structured overall
- Used built-in functions I wasn't aware of as a beginner
- Had well-structured comments throughout
- Swagger UI was more detailed — included specific schemas, task contents, and health descriptions
- Automatically set up a git folder with history

### What it got wrong or ignored
- Named the file `server.js` instead of `index.js` even though I specified it
- Used `tasks` for the array name instead of `task` as I specified
- Served Swagger at `/api-docs` instead of `/docs` since I didn't specify the path

### What my prompt forgot to specify
- The Swagger UI path (`/docs`)
- The error response format (`{ "error": ... }` vs `{ "message": ... }`)
- The exact file name (`index.js`)
- The array name was specified but ignored — more precise prompts needed

---
## About

Built by Murtaza Mustafa — Back-End AI Engineering Intern at FlyRank  
Program: Backend AI Engineering — July 2026