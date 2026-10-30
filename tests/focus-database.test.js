import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Postgres setup enforces isolated server-only access and optimistic locking", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users (id uuid primary key);`);
    await db.exec(
      await readFile(
        new URL("../supabase/focus-coach-setup.sql", import.meta.url),
        "utf8",
      ),
    );
    const uid = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users values ($1)", [uid]);
    await db.exec("set role service_role");
    await db.query(
      `insert into public.focus_coach_days (user_id, day_date, state) values ($1, '2026-10-30', '{}')`,
      [uid],
    );
    assert.equal(
      (
        await db.query(
          `update public.focus_coach_days set version=version+1 where version=0 returning id`,
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          `update public.focus_coach_days set version=version+1 where version=0 returning id`,
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        `insert into public.focus_coach_days (user_id, day_date, state) values ($1, '2026-10-30', '{}')`,
        [uid],
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(
        db.query("select * from public.focus_coach_days"),
        /permission denied/,
      );
      await assert.rejects(
        db.query(`update public.focus_coach_days set state='{}'`),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.focus_coach_devices"),
        /permission denied/,
      );
    }
    await db.exec("reset role");
    const policies = await db.query(
      `select relrowsecurity from pg_class where relname in ('focus_coach_days','focus_coach_devices')`,
    );
    assert.ok(policies.rows.every((r) => r.relrowsecurity));
    await db.query("delete from auth.users where id=$1", [uid]);
    assert.equal(
      (await db.query("select * from public.focus_coach_days")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
