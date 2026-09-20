import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect,
  test,
} from "vitest";
const db = new PGlite();
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  // Real Postgres RLS/privileges/triggers, with a minimal Supabase auth-schema fixture.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${alice}', '{"display_name":"Alice"}');`);
  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/202609180001_accounts.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    `insert into auth.users values ('${bob}', '{"display_name":"Bob","role":"admin","account_id":"${alice}"}');`,
  );
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec("begin;");
});
afterEach(async () => {
  await db.exec("rollback;");
});
async function asUser(id = alice) {
  await db.exec(
    `set local role authenticated; set local "request.jwt.claim.sub" = '${id}';`,
  );
}

test("backfills existing users and creates new accounts without trusting ownership metadata", async () => {
  const result = await db.query(
    "select id, display_name from public.accounts order by id",
  );
  expect(result.rows).toEqual([
    { id: alice, display_name: "Alice" },
    { id: bob, display_name: "Bob" },
  ]);
});
test("Alice sees only Alice; Bob sees only Bob", async () => {
  await asUser();
  expect((await db.query("select id from public.accounts")).rows).toEqual([
    { id: alice },
  ]);
  await db.exec(`set local "request.jwt.claim.sub" = '${bob}';`);
  expect((await db.query("select id from public.accounts")).rows).toEqual([
    { id: bob },
  ]);
});
test("an explicit foreign-account filter cannot bypass RLS", async () => {
  await asUser();
  expect(
    (await db.query("select * from public.accounts where id = $1", [bob])).rows,
  ).toEqual([]);
});
test("allows changing only the owner's display name", async () => {
  await asUser();
  expect(
    (
      await db.query(
        "update public.accounts set display_name = 'New name' where id = $1 returning display_name",
        [alice],
      )
    ).rows,
  ).toEqual([{ display_name: "New name" }]);
});
test("foreign-account updates affect zero rows", async () => {
  await asUser();
  expect(
    (
      await db.query(
        "update public.accounts set display_name = 'Intruder' where id = $1 returning id",
        [bob],
      )
    ).rows,
  ).toEqual([]);
});
test("forbids ownership reassignment even on the caller's own row", async () => {
  await asUser();
  await expect(
    db.query("update public.accounts set id = $1 where id = $2", [bob, alice]),
  ).rejects.toThrow(/permission denied/);
});
test("forbids rewriting account creation timestamps", async () => {
  await asUser();
  await expect(
    db.query("update public.accounts set created_at = now()"),
  ).rejects.toThrow(/permission denied/);
});
test("forbids client-created accounts", async () => {
  await asUser();
  await expect(
    db.query("insert into public.accounts (id) values ($1)", [alice]),
  ).rejects.toThrow(/permission denied/);
});
test("forbids client deletion of accounts", async () => {
  await asUser();
  await expect(db.query("delete from public.accounts")).rejects.toThrow(
    /permission denied/,
  );
});
test("anonymous callers cannot read accounts", async () => {
  await db.exec("set local role anon;");
  await expect(db.query("select * from public.accounts")).rejects.toThrow(
    /permission denied/,
  );
});
test("anonymous callers cannot write accounts", async () => {
  await db.exec("set local role anon;");
  await expect(
    db.query("update public.accounts set display_name = 'Intruder'"),
  ).rejects.toThrow(/permission denied/);
});
test("authenticated role without a user claim sees no accounts", async () => {
  await db.exec(
    "set local role authenticated; set local \"request.jwt.claim.sub\" = '';",
  );
  expect((await db.query("select * from public.accounts")).rows).toEqual([]);
});
test("enforces name length at the database boundary", async () => {
  await asUser();
  await expect(
    db.query("update public.accounts set display_name = $1", ["a".repeat(81)]),
  ).rejects.toThrow(/check constraint/);
});
test("account creation function cannot be invoked by application roles", async () => {
  const result = await db.query(
    "select has_function_privilege('anon', 'public.handle_new_account()', 'execute') as anon, has_function_privilege('authenticated', 'public.handle_new_account()', 'execute') as authenticated",
  );
  expect(result.rows).toEqual([{ anon: false, authenticated: false }]);
});
test("deleting an auth user cascades only that user's account", async () => {
  await db.query("delete from auth.users where id = $1", [alice]);
  expect((await db.query("select id from public.accounts")).rows).toEqual([
    { id: bob },
  ]);
});
