# Task API — Behavior Case Table

## Global

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| App boot | `createApp({ store })` | App builds without binding a port; store injectable; `x-powered-by` disabled. |
| JSON body parser | `express.json({ limit: '100kb' })` | JSON bodies parsed; over limit rejected. |
| Unmatched route | 404 JSON `{ error: { code: "not_found", message: "Route <METHOD> <PATH> not found" } }` | Never HTML. |
| Uncaught exception in handler | 500 JSON `{ error: { code: "internal_error", message: "Internal server error" } }` | Real cause logged server-side only; stack/secret not leaked. |
| Thrown `AppError` | Its `status`, `code`, `message`; `details` included when defined. | Envelope is `{ error: { code, message, details? } }`. |
| Malformed JSON (`entity.parse.failed` / `SyntaxError`) | 400 JSON `{ error: { code: "invalid_json", message: "Malformed JSON in request body" } }`. | Parses-error mapped. |
| Non-`AppError` with integer 4xx `status` | That status; `code: "bad_request"`; message or `"Bad request"`. | 4xx status preserved. |
| Error after headers sent | `next(err)` delegated | No second response written. |

## Meta routes

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| `GET /` | 200 JSON `{ name: "Task API", version: "1.0.0", routes: [...] }` | `routes.length === 8`; each entry has string `method` and `path`. |
| `GET /` route list membership | Contains `GET /`, `GET /health`, `GET /docs`, `GET /tasks`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`. | Full advertised surface. |
| `GET /health` | 200 `text/plain` body `ok` | Exactly `ok`. |
| `GET /docs` | 200 `text/html` | Swagger UI served. |

## `GET /tasks`

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| No query | 200 JSON array, all tasks ordered by ascending `id` | Seed ids `[1,2,3]`. |
| `?done=true` | 200 array of tasks with `done === true` | Ids `[1]` for seed. |
| `?done=false` | 200 array of tasks with `done === false` | Ids `[2,3]` for seed. |
| `?search=Beta` | 200 array, `title.includes(search)`, case-sensitive | Ids `[2]`. |
| `?done=false&search=Gamma` | 200 array, both filters applied | Ids `[3]`. |
| `?search=beta` | 200 `[]` | Case-sensitive, no match. |
| `?search=nope` | 200 `[]` | No match. |
| `?done=maybe` | 400 `bad_request` | `parseBooleanString` rejects. |
| `?done=1`, `?done=0`, `?done=yes`, `?done=TRUE`, `?done=true `, `?done=` | 400 `bad_request` | Only literal `true`/`false`. |
| `?bogus=1` (unknown key) | 400 `bad_request`, `details.unknown` lists offending keys | Unknown query keys rejected. |
| `?search=a&search=b` | 400 `bad_request` | `search` must be a single string. |
| `?done=true&search=alp` | 200, `validated = { done: true, search: "alp" }` | Normalized before handler. |
| No filters | `validated = { done: undefined, search: undefined }` | Absent filters left undefined. |

## `POST /tasks`

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| `{ "title": "Delta task" }` | 201 JSON `{ id, title, done: false }`; `Location: /tasks/<id>` | Created task returned. |
| Body with extra fields `{ title, done: true, id: 99, extra }` | 201; server-assigned `id`; `done: false`; extras ignored | Only `title` read. |
| `{ "title": "  New task  " }` | 201; title trimmed to `"New task"` | Title normalized. |
| Missing `title` `{ "done": true }` | 400 `bad_request` | Title required. |
| `{ "title": "" }` / `{ "title": "   " }` | 400 `bad_request` | Non-empty string required. |
| `{ "title": 5 }` / `{ "title": null }` | 400 `bad_request` | Must be string. |
| Body not an object (`null`, `[]`) | 400 `bad_request` | Must be JSON object. |
| Non-empty body with `Content-Type: text/plain` | 415 `unsupported_media_type` | Content-Type must be `application/json`. |
| No body (no `content-length` or `0`) | 400 `bad_request` | Body required. |
| `Content-Type: application/json`, body `{not json` | 400 `invalid_json` | Malformed JSON. |

## `GET /tasks/:id`

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| Existing id e.g. `/tasks/1` | 200 JSON `{ id, title, done }` | Task fetched. |
| Valid but absent e.g. `/tasks/999` | 404 `{ error: { code: "not_found", message: "Task 999 not found" } }` | Not found. |
| `id` not canonical positive int: `abc`, `0`, `-1`, `1.5`, `1a`, `01`, `` , ` 1`, `1 `, `NaN`, `Infinity` | 400 `bad_request` | `/^[1-9]\d*$/` enforced. |
| `id` out of safe-integer range | 400 `bad_request` (`... out of range`) | Safe integer required. |

## `PATCH /tasks/:id`

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| `{ "title": "Beta v2" }` | 200 JSON with updated title, `done` unchanged | Partial update. |
| `{ "done": true }` | 200 JSON with updated `done`, `title` unchanged | Partial update. |
| `{ "title": "Beta v3", "done": false }` | 200 JSON with both updated | Partial update. |
| `{ "title": " New ", "done": false, "extra": 1 }` | 200; title trimmed; extras ignored | Known fields only. |
| `{}` | 400 `bad_request` | At least one field required. |
| `{ "extra": 1 }` / `{ "other": "x" }` | 400 `bad_request` | No known field present. |
| `{ "title": "" }` / `{ "title": 5 }` | 400 `bad_request` | Non-empty string required. |
| `{ "done": "yes" }` / `{ "done": 1 }` | 400 `bad_request` (`Field "done" must be a boolean`) | Boolean required. |
| Body not an object (`null`, `[]`) | 400 `bad_request` | Must be JSON object. |
| Valid but absent e.g. `/tasks/999` | 404 `not_found` | Not found. |
| Invalid `id` e.g. `/tasks/abc` | 400 `bad_request` | Id validated first. |
| Non-empty non-JSON body | 415 `unsupported_media_type` | Content-Type must be `application/json`. |
| No body | 400 `bad_request` | Body required. |
| Malformed JSON | 400 `invalid_json` | Parse error mapped. |

## `DELETE /tasks/:id`

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| Existing id | 204, empty body | Deleted. |
| Deleted id fetched after | 404 `not_found` | Removed. |
| Same id deleted twice | Second call 404 `not_found` | Not found. |
| Invalid `id` e.g. `/tasks/abc` | 400 `bad_request` | Id validated first. |
| Valid but absent id | 404 `not_found` | Not found. |

## Store and data invariants

| Condition | Result | Asserted behavior |
| --- | --- | --- |
| `list()` | Tasks ordered by ascending `id` | Stable ordering. |
| `get(id)` present / absent | Copy / `undefined` | No internal mutation leak. |
| `list({ search })` | Case-sensitive `title.includes`. | No case folding. |
| `create({ title })` | `{ id: nextFree, title, done: false }`; returned copy | id server-owned; `done` defaults false. |
| `update(id, patch)` | Merged `title`/`done` or `undefined` when absent | Only provided fields applied. |
| `remove(id)` | `true` when removed, `false` otherwise | Reports success. |
| Delete then create | New id above highest ever allocated | Ids never reused. |
| `reset()` | Restores seed exactly; allocator resets above max seed id | Deterministic test state. |
| Seed load | Array required; each entry needs string `title`; missing `id` defaults to `index + 1`; `done` coerced boolean | Seed validated. |
| Persisted seed (`src/data/seed.json`) | 3 tasks, unique integer ids, string titles, boolean done | Seed contract. |
