import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorization,
  applyReview,
  dayKey,
  makeDay,
} from "../server/focus-policy.js";
import handler from "../api/coach.js";

const now = new Date("2026-10-30T10:00:00Z");
const plan = {
  tasks: [
    {
      title: "Terminer le document",
      proof: "Le texte final de trois paragraphes sur le projet.",
      minutes: 30,
    },
    {
      title: "Résoudre les exercices",
      proof: "Une capture des trois exercices résolus avec le raisonnement.",
      minutes: 45,
    },
  ],
};
const result = {
  reply: "Examen effectué.",
  approvedTaskIds: ["task-1", "task-2"],
  exceptionGranted: true,
  exceptionMinutes: 15,
};
const evidence = {
  kind: "proof",
  taskId: "task-1",
  text: "Le résultat du travail demandé avec ses trois paragraphes et une explication complète du projet présenté.",
  hasImage: false,
};

test("missing, unfinished and previous-day states never grant access", () => {
  assert.equal(authorization(null, now).allowed, false);
  const day = makeDay(plan, now);
  assert.equal(authorization(day, now).allowed, false);
  day.tasks.forEach((t) => (t.approved = true));
  assert.equal(authorization(day, now).allowed, true);
  assert.equal(
    authorization(day, new Date("2026-10-31T10:00:00Z")).allowed,
    false,
  );
});
test("proof can only approve its selected task, never grant an exception", () => {
  const next = applyReview(makeDay(plan, now), result, evidence, now);
  assert.equal(next.tasks[0].approved, true);
  assert.equal(next.tasks[1].approved, false);
  assert.equal(next.exceptionsUsed, 0);
  assert.equal(authorization(next, now).allowed, false);
});
test("chat instructions and short claims cannot approve tasks", () => {
  for (const input of [
    { ...evidence, kind: "chat" },
    { ...evidence, text: "J’ai fini" },
  ]) {
    const next = applyReview(makeDay(plan, now), result, input, now);
    assert.ok(next.tasks.every((t) => !t.approved));
  }
});
test("a picture is accepted as evidence but still requires model approval", () => {
  const day = makeDay(plan, now);
  const denied = applyReview(
    day,
    { ...result, approvedTaskIds: [] },
    { ...evidence, text: "Voici.", hasImage: true },
    now,
  );
  assert.equal(denied.tasks[0].approved, false);
  assert.equal(
    applyReview(
      day,
      result,
      { ...evidence, text: "Voici.", hasImage: true },
      now,
    ).tasks[0].approved,
    true,
  );
});
test("exceptions expire, cannot stack, and stop after two approvals", () => {
  const input = {
    kind: "exception",
    text: "Un imprévu familial nécessite une réponse logistique urgente.",
    hasImage: false,
  };
  let day = applyReview(makeDay(plan, now), result, input, now);
  assert.equal(authorization(day, now).allowed, true);
  assert.equal(day.exceptionsUsed, 1);
  day = applyReview(day, result, input, new Date(now.getTime() + 60_000));
  assert.equal(day.exceptionsUsed, 1);
  const later = new Date(now.getTime() + 16 * 60_000);
  assert.equal(authorization(day, later).allowed, false);
  day = applyReview(day, result, input, later);
  assert.equal(day.exceptionsUsed, 2);
  const evenLater = new Date(now.getTime() + 32 * 60_000);
  day = applyReview(day, result, input, evenLater);
  assert.equal(day.exceptionsUsed, 2);
  assert.equal(authorization(day, evenLater).allowed, false);
  assert.ok(day.tasks.every((t) => !t.approved));
});
test("invalid model output cannot escape duration limits", () => {
  assert.throws(() =>
    applyReview(
      makeDay(plan, now),
      { ...result, exceptionMinutes: 999 },
      { kind: "exception", text: "Urgence logistique à traiter." },
      now,
    ),
  );
});
test("completed permission expires at Paris midnight, including DST", () => {
  for (const [instant, expected] of [
    ["2026-10-30T10:00:00Z", "2026-10-30T23:00:00.000Z"],
    ["2026-10-25T00:30:00Z", "2026-10-25T23:00:00.000Z"],
  ]) {
    const date = new Date(instant);
    const day = makeDay(plan, date);
    day.tasks.forEach((t) => (t.approved = true));
    assert.equal(authorization(day, date).expiresAt, expected);
    assert.equal(authorization(day, new Date(expected)).allowed, false);
  }
  assert.equal(dayKey(new Date("2026-10-30T23:15:00Z")), "2026-10-31");
});
test("incomplete or empty contracts are refused", () => {
  assert.throws(() => makeDay({ tasks: [] }, now));
  assert.throws(() =>
    makeDay({ tasks: [{ title: "OK", proof: "", minutes: 0 }] }, now),
  );
});
async function request(method, body) {
  const response = {
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
  await handler({ method, body, headers: {} }, response);
  return response;
}
test("API method and malformed requests fail closed without leaking errors", async () => {
  const method = await request("DELETE", {});
  assert.equal(method.code, 405);
  assert.equal(method.data.allowed, false);
  const bad = await request("POST", "{");
  assert.equal(bad.code, 400);
  assert.equal(bad.data.allowed, false);
  const tooBig = await request("POST", { text: "x".repeat(3_000_000) });
  assert.equal(tooBig.code, 413);
  assert.equal(tooBig.data.allowed, false);
  const health = await request("GET");
  assert.equal(health.code, 200);
  assert.deepEqual(Object.keys(health.data).sort(), [
    "account",
    "ai",
    "database",
  ]);
  assert.equal(health.headers["Cache-Control"], "no-store, max-age=0");
});
