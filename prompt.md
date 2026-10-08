# Task API

You will create a new branch called `ai-version` and create an HTTP server/CRUD API for demonstrative purposes. You will not read existing code from other branches.

## General Requirements

- The API will be called `Task API`. It will be written in JavaScript using the Express framework. It will be documented using Swagger UI in an `openapi.json` file and JSDocs.
- Separate concerns: use a modular ESM architecture to separate stores, listeners, handlers, middleware, data, docs, and utilities.
- Test-driven: create tests that assert best-practice behavior before writing any code. These test must not be edited after writing unless it deviates from spec. Every handler and middleware should pass its own unit test and later pass an integration/lifecycle test.
- Ensure all routes are validated. Prefer strict validaion rather than allowing silent failures. Server should never return a raw 500 output for uncaught exceptions.
- No persistent storage: all data used by the server will be in-memory. This is intended. The only persisted data should be a seed file that contains initial values.
- The data itself are called `tasks`, each task has a `title` string and a `done` flag. Every task has a unique integer ID that is handled entirely by the server. Generate three such tasks for the seed.
- Five main and three meta endpoints, described below.

## Endpoints

1. `GET /` returns a list of all routes.
2. `GET /health` returns `ok`.
3. `GET /docs` returns the interactive Swagger UI.
4. `GET /tasks` returns a list of all tasks (application/json). Allow `?done={true || false}` and `?search={title}` query parameters to filter the list. All optional. `search` is for substring in `task.title`.
5. `GET /tasks/:id` returns a task with the given ID. 404 if missing, 400 for failed validation.
6. `POST /tasks` creates a new task to be added to the in-memory store. Do not persist this task. It accepts an `application/json` body with one field: `title`. Ignore additional fields. `done` always starts `false`. Automatically assign a free ID. Returns a 201 with the new task if successful.
7. `PATCH /tasks/:id` updates an existing task with the given ID. 404 if missing, 400 for failed validation or incorrect body payload. Accepts either `title`, `done`, or both. Empty payload is a 400. Returns the updated task if successful.
8. `DELETE /tasks/:id` deletes an existing task with the given ID. 404 if missing, 204 if successful.

Plan the full execution cycle before implementing. Ensure all writes happen on the new branch, not main. Do not read any files on the main branch.
