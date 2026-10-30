import { test } from "node:test";
import assert from "node:assert/strict";
import { createCoachHandler } from "../api/coach.js";

// In-memory transport double. Actual SQL grants and version constraints are
// independently executed against Postgres in focus-database.test.js.
class FakeDatabase {
  tables = { focus_coach_days: [], focus_coach_devices: [] };
  auth = {
    getUser: async (token) =>
      token === "account-token"
        ? { data: { user: { id: "owner", email: "owner@example.test" } } }
        : { data: {}, error: new Error("Invalid session") },
  };
  from(table) {
    const filters = [];
    let operation = "select",
      value;
    const query = {
      select() {
        return query;
      },
      eq(key, item) {
        filters.push([key, item]);
        return query;
      },
      update(data) {
        operation = "update";
        value = data;
        return query;
      },
      insert(data) {
        operation = "insert";
        value = data;
        return query;
      },
      upsert(data) {
        operation = "upsert";
        value = data;
        return query;
      },
      delete() {
        operation = "delete";
        return query;
      },
      maybeSingle: async () => execute(),
      then: (resolve, reject) =>
        Promise.resolve(execute()).then(resolve, reject),
    };
    const execute = () => {
      const rows = this.tables[table];
      const found = rows.find((row) => filters.every(([k, v]) => row[k] === v));
      if (operation === "select")
        return { data: found ? structuredClone(found) : null };
      if (operation === "update") {
        if (found) Object.assign(found, structuredClone(value));
        return { data: found ? structuredClone(found) : null };
      }
      if (operation === "insert") {
        if (
          rows.some(
            (row) =>
              row.user_id === value.user_id && row.day_date === value.day_date,
          )
        )
          return { error: { code: "23505" } };
        const row = {
          id: "day-" + rows.length,
          version: 0,
          ...structuredClone(value),
        };
        rows.push(row);
        return { data: row };
      }
      if (operation === "upsert") {
        const index = rows.findIndex((row) => row.user_id === value.user_id);
        if (index >= 0) rows[index] = value;
        else rows.push(value);
        return { data: value };
      }
      if (operation === "delete") {
        this.tables[table] = rows.filter(
          (row) => !filters.every(([k, v]) => row[k] === v),
        );
        return { data: null };
      }
    };
    return query;
  }
}
const env = {
  SUPABASE_URL: "https://example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-only",
  FOCUS_ALLOWED_EMAILS: "owner@example.test",
  AI_GATEWAY_MODEL: "anthropic/test-model",
  AI_GATEWAY_API_KEY: "test-only",
};
const plan = {
  tasks: [
    {
      title: "Écrire le livrable",
      proof: "Le texte final complet avec ses trois paragraphes.",
      minutes: 30,
    },
  ],
};
function harness(options = {}) {
  const db = new FakeDatabase();
  let calls = 0;
  const handler = createCoachHandler({
    dbFactory: () => db,
    env,
    generate: async () => {
      calls++;
      return {
        output: {
          reply: "Preuve examinée.",
          approvedTaskIds: ["task-1"],
          exceptionGranted: false,
          exceptionMinutes: 0,
        },
      };
    },
    ...options,
  });
  return {
    db,
    get calls() {
      return calls;
    },
    async request(body, authenticated = true) {
      const res = {
        headers: {},
        setHeader(k, v) {
          this.headers[k] = v;
        },
        status(code) {
          this.code = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        },
      };
      await handler(
        {
          method: "POST",
          headers: authenticated
            ? { authorization: "Bearer account-token" }
            : {},
          body,
        },
        res,
      );
      return res;
    },
  };
}
test("account → immutable contract → proof review → device permission → revoke", async () => {
  const h = harness();
  assert.equal((await h.request({ action: "start", plan }, false)).code, 401);
  assert.equal((await h.request({ action: "start", plan })).code, 200);
  assert.equal((await h.request({ action: "start", plan })).code, 409);
  const pair = await h.request({ action: "pair" });
  assert.equal(pair.data.token.length, 43);
  assert.notEqual(
    h.db.tables.focus_coach_devices[0].token_hash,
    pair.data.token,
  );
  const token = pair.data.token;
  let status = await h.request({ action: "device-status", token }, false);
  assert.equal(status.data.allowed, false);
  assert.equal(
    (
      await h.request({
        action: "review",
        kind: "proof",
        taskId: "unknown",
        text: "a".repeat(100),
      })
    ).code,
    400,
  );
  assert.equal(h.calls, 0);
  const reviewed = await h.request({
    action: "review",
    kind: "proof",
    taskId: "task-1",
    text: "Voici le texte final terminé, complet et détaillé en trois paragraphes. ".repeat(
      3,
    ),
  });
  assert.equal(reviewed.code, 200);
  assert.equal(h.calls, 1);
  status = await h.request({ action: "device-status", token }, false);
  assert.equal(status.data.allowed, true);
  assert.equal(status.data.reason, "completed");
  assert.equal(
    (await h.request({ action: "review", kind: "chat", text: "Encore" })).code,
    429,
  );
  await h.request({ action: "revoke" });
  assert.equal(
    (await h.request({ action: "device-status", token }, false)).code,
    401,
  );
});
test("a reader token never authorizes review, pairing or starting a day", async () => {
  const h = harness();
  for (const action of ["review", "pair", "start", "load"])
    assert.equal(
      (await h.request({ action, token: "x".repeat(43), plan }, false)).code,
      401,
    );
  assert.equal(h.calls, 0);
});
test("model failure consumes a reservation but grants no permission", async () => {
  const h = harness({
    generate: async () => {
      throw new Error("Provider failed");
    },
  });
  await h.request({ action: "start", plan });
  const reviewed = await h.request({
    action: "review",
    kind: "proof",
    taskId: "task-1",
    text: "preuve ".repeat(50),
  });
  assert.equal(reviewed.code, 503);
  assert.equal(reviewed.data.allowed, false);
  assert.equal(h.db.tables.focus_coach_days[0].state.requests, 1);
  assert.equal(h.db.tables.focus_coach_days[0].state.tasks[0].approved, false);
});
test("empty allowlist refuses even a valid account", async () => {
  const h = harness({ env: { ...env, FOCUS_ALLOWED_EMAILS: "" } });
  assert.equal((await h.request({ action: "load" })).code, 403);
});
