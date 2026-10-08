/**
 * Minimal Express-like response double for unit-testing handlers and
 * middleware without starting a real HTTP server.
 */
export function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    type(value) {
      this.headers['content-type'] = value;
      return this;
    },
    location(value) {
      this.headers.location = value;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res;
}

/**
 * Runs an Express-style middleware/handler and settles it into a promise.
 * Resolves with `{ error }` if `next(err)` is called with an error, or
 * `{ res }` once a response is produced.
 */
export function invoke(handler, req, res = createMockRes()) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const next = (err) => done({ error: err, res });
    try {
      const returned = handler(req, res, next);
      if (returned && typeof returned.then === 'function') {
        returned.then(() => done({ res })).catch((err) => done({ error: err, res }));
      } else {
        // Synchronous handler: if it did not call next, consider it settled.
        done({ res });
      }
    } catch (err) {
      // Mirrors Express 5, which catches synchronous throws and forwards them.
      done({ error: err, res });
    }
  });
}
