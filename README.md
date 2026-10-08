> This is the fully AI-generated, one-shot version of Task API.
> The exact prompt used can be found in `prompt.md`.

# Task API

A small, test-driven CRUD API for tasks, built with **JavaScript + Express (ESM)**.
All runtime data lives **in memory**; the only persisted data is the seed file.

> Branch: `ai-version` — a clean, modular reimplementation written test-first.

---

## Quick start

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # same, with --watch
npm test           # 60 unit + integration tests (node:test)
```

Requirements: Node.js >= 20 (developed on Node 26). Runtime dependencies are only
`express` and `swagger-ui-express`.

- Interactive API docs: <http://localhost:3000/docs>
- Route index (JSON): <http://localhost:3000/>
- Health probe: <http://localhost:3000/health>

---

## Table of contents

- [Quick start](#quick-start)
- [Endpoints](#endpoints)
- [Data model & rules](#data-model--rules)
- [Error format](#error-format)
- [Project structure](#project-structure)
- [Architecture & request lifecycle](#architecture--request-lifecycle)
- [Validation rules](#validation-rules)
- [Testing](#testing)
- [Design decisions](#design-decisions)
- [Recovering the pre-branch work](#recovering-the-pre-branch-work)

---

## Endpoints

Eight routes: three meta and five task operations.

| Method   | Path            | Purpose                                             | Success     |
| -------- | --------------- | --------------------------------------------------- | ----------- |
| `GET`    | `/`             | List all available routes                           | `200` JSON  |
| `GET`    | `/health`       | Health probe, returns the literal `ok`              | `200` text  |
| `GET`    | `/docs`         | Interactive Swagger UI (redirects to `/docs/`)      | `200` HTML  |
| `GET`    | `/tasks`        | List tasks, optionally filtered                     | `200` JSON  |
| `GET`    | `/tasks/:id`    | Fetch one task                                      | `200` JSON  |
| `POST`   | `/tasks`        | Create a task                                       | `201` JSON  |
| `PATCH`  | `/tasks/:id`    | Update `title` and/or `done`                        | `200` JSON  |
| `DELETE` | `/tasks/:id`    | Delete a task                                       | `204` empty |

### Examples

```bash
# List with filters (done and/or search)
curl -s "http://localhost:3000/tasks?done=false&search=Design"

# Create — only `title` is read; `done` always starts false
curl -i -X POST http://localhost:3000/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"Write the README"}'

# Update title, done, or both
curl -s -X PATCH http://localhost:3000/tasks/1 \
  -H 'content-type: application/json' \
  -d '{"done":true}'

# Delete
curl -i -X DELETE http://localhost:3000/tasks/1
```

---

## Data model & rules

A task is a flat record with exactly three fields:

```json
{ "id": 1, "title": "Read the assignment brief", "done": true }
```

| Field   | Type      | Rules                                                        |
| ------- | --------- | ------------------------------------------------------------ |
| `id`    | integer   | Server-owned. Assigned by the server, never accepted from the client, never reused. |
| `title` | string    | Non-empty (whitespace is trimmed).                           |
| `done`  | boolean   | Always `false` on creation; toggled only via `PATCH`.        |

- **Seed data**: `src/data/seed.json` ships with **3 tasks** (ids `1..3`, mixed `done`).
- **IDs**: allocated by a monotonic counter starting above the highest seed id.
  Deleting a task does **not** free its id.
- **Persistence**: none at runtime. Restarting the server restores the seed.

---

## Error format

Every error response uses the same JSON envelope:

```json
{ "error": { "code": "bad_request", "message": "Invalid id \"abc\": expected a positive integer" } }
```

| Status | `code`                   | When                                                        |
| ------ | ------------------------ | ----------------------------------------------------------- |
| `400`  | `bad_request`            | Failed validation (bad id, bad query, invalid/empty body)   |
| `400`  | `invalid_json`           | Malformed JSON in the request body                          |
| `404`  | `not_found`              | Missing task or unknown route                               |
| `415`  | `unsupported_media_type` | A non-empty body was sent without `application/json`        |
| `500`  | `internal_error`         | Unexpected failure — generic message, real cause logged only |

Unknown routes and uncaught exceptions never render an HTML error page or leak a
stack trace; the final error middleware guarantees a JSON envelope.

---

## Project structure

```
index.js                        # entry point -> startServer()
openapi.json                    # OpenAPI 3.0.3 document behind /docs
package.json
src/
  app.js                        # createApp({ store }) — builds Express, no listen
  listeners/
    server.js                   # binds the port, graceful shutdown
  routes/
    metaRouter.js               # GET / , /health , /docs
    tasksRouter.js              # /tasks CRUD wiring
  handlers/
    metaHandler.js              # route index + health
    tasksHandler.js             # createTaskHandlers(store)
  middleware/
    validate.js                 # strict per-route validation
    errorHandler.js             # JSON 404 + terminal error handler
  stores/
    taskStore.js                # in-memory store, seed loader, id allocator
  utils/
    errors.js                   # AppError + factories
    id.js                       # monotonic id allocator
    validation.js               # primitives (ids, booleans, titles, keys)
  data/
    seed.json                   # the only persisted data
  docs/
    swagger.js                  # swagger-ui-express wiring
test/
  helpers/http.js               # request/response doubles
  unit/                         # per-unit tests
  integration/lifecycle.test.js # end-to-end HTTP lifecycle
```

---

## Architecture & request lifecycle

Each concern has one home, and dependencies point inward:

```
HTTP request
  -> express.json()            # body parsing only for application/json
  -> route + validation        # validate.js normalizes input onto req.validated
  -> handler                   # reads req.validated, orchestrates the store, writes response
  -> (throw | next(err))       # AppError or unexpected error
  -> errorHandler              # uniform JSON envelope
```

- **Stores** own data; they never import Express. They return **copies**, so
  callers cannot mutate internal state by accident. `reset()` restores the seed,
  which keeps tests isolated.
- **Handlers** are pure HTTP orchestration. They never re-validate; they trust
  `req.validated` because validation already ran.
- **Middleware** does all input coercion and rejection, so handlers stay small.
- **`createApp({ store })`** takes an injectable store, so tests mount the real
  app on an ephemeral port with an isolated dataset.
- **Express 5** catches thrown errors in synchronous and async handlers and
  forwards them to `errorHandler`; no wrapper is needed.

---

## Validation rules

Validation is strict — unknown input fails loudly with `400` rather than being
silently ignored.

**`GET /tasks` query**
- Allowed keys: `done`, `search` only. Anything else → `400`.
- `done` must be exactly `"true"` or `"false"` (repeated/array values → `400`).
- `search` must be a single string (case-sensitive substring match on `title`).

**`/:id` path parameter**
- Canonical positive integer only: `/^[1-9]\d*$/`, safe integer.
  Rejects `abc`, `0`, `-1`, `1.5`, and `01`.

**`POST /tasks` body**
- Must be `application/json`; a non-empty body of another type → `415`; no body → `400`.
- `title` is required, non-empty after trimming. Additional fields are ignored.
- `done` is always forced to `false`; `id` is always server-assigned.

**`PATCH /tasks/:id` body**
- Must be `application/json` (same media-type rules as `POST`).
- Must contain at least one of `title` or `done`; `{}` or unknown-only → `400`.
- `title` non-empty string; `done` a boolean. Additional fields are ignored.

---

## Testing

Tests use the Node built-ins `node:test` and `fetch` — no test framework or dev
dependencies. They were written to assert best-practice behavior **before** the
implementation, and were not edited afterwards.

```bash
npm test
# 60 tests: pass 60, fail 0
```

Coverage by file:

| File                                   | Focus                                                        |
| -------------------------------------- | ------------------------------------------------------------ |
| `test/unit/utils.test.js`              | `AppError`, id allocator, validation primitives              |
| `test/unit/store.test.js`              | CRUD, filters, id non-reuse, copy semantics, `reset()`       |
| `test/unit/middleware.test.js`         | every validator + `notFoundHandler` + `errorHandler`         |
| `test/unit/handlers.test.js`           | meta handlers and every task handler                         |
| `test/integration/lifecycle.test.js`   | full HTTP create → list → filter → get → patch → delete, all error branches, generic `500`, and the seed file |

The test script is `node --test "test/**/*.test.js"`.

---

## Design decisions

- **No database.** In-memory store is intentional for this exercise; the seed is
  the only on-disk data.
- **Hand-rolled validation** instead of a schema library — the surface is small
  and explicit.
- **Uniform error envelope** with a stable `code` so clients can branch on it.
- **`GET /health` returns plain text `ok`**, not JSON, matching the requirement.
- **Unknown body fields are ignored** (per the assignment's POST rule) but
  **unknown query params are rejected** — query filters are a closed set.
- **`GET /docs` returns `301` → `/docs/`**, which is standard
  `swagger-ui-express` behavior; browsers and `fetch` follow it.

---

## Recovering the pre-branch work

The uncommitted edits to `index.js` and `openapi.json` that existed on `main`
before this branch were **stashed, not discarded**:

```bash
git switch main
git stash list        # stash@{0}: wip: main index/openapi
git stash pop
```

A backup of the previous root files and test files was also taken to
`/tmp/opencode/be-01-prebackup/` for safety.
