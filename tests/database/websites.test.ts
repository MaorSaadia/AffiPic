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
let bobSite: string;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const migration of [
    "202609180001_accounts.sql",
    "202609200001_websites.sql",
  ])
    await db.exec(
      readFileSync(
        new URL(`../../supabase/migrations/${migration}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(`insert into auth.users(id) values ('${alice}'), ('${bob}');`);
  bobSite = (
    await db.query<{ id: string }>(
      "insert into public.websites(account_id, name, slug) values ($1, 'Bob’s picks', 'bobs-picks') returning id",
      [bob],
    )
  ).rows[0].id;
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
async function create(slug = "alices-picks") {
  return db.query<{
    id: string;
    created_at: string;
    account_id: string;
    status: string;
    name: string;
    slug: string;
  }>(
    "insert into public.websites(name, slug, description) values ('Alice’s picks', $1, 'Thoughtful finds') returning *",
    [slug],
  );
}
test("creates a private draft owned by the verified account using database defaults", async () => {
  await asUser();
  const site = (await create()).rows[0];
  expect(site).toMatchObject({
    account_id: alice,
    status: "draft",
    name: "Alice’s picks",
    slug: "alices-picks",
  });
  expect(site.id).toBeTruthy();
  expect(site.created_at).toBeTruthy();
});
test("each account sees only its own website", async () => {
  await asUser();
  await create();
  expect(
    (await db.query("select account_id from public.websites")).rows,
  ).toEqual([{ account_id: alice }]);
  await db.exec(`set local "request.jwt.claim.sub" = '${bob}';`);
  expect(
    (await db.query("select account_id from public.websites")).rows,
  ).toEqual([{ account_id: bob }]);
});
test("foreign website ID cannot reveal a draft", async () => {
  await asUser();
  expect(
    (await db.query("select * from public.websites where id = $1", [bobSite]))
      .rows,
  ).toEqual([]);
});
test("foreign website updates affect zero rows", async () => {
  await asUser();
  expect(
    (
      await db.query(
        "update public.websites set name = 'Stolen' where id = $1 returning id",
        [bobSite],
      )
    ).rows,
  ).toEqual([]);
});
test("allows editing own details and preserves ownership", async () => {
  await asUser();
  await create();
  expect(
    (
      await db.query(
        "update public.websites set name = 'My edit', slug = 'my-edit', description = '' returning name, slug, account_id",
      )
    ).rows,
  ).toEqual([{ name: "My edit", slug: "my-edit", account_id: alice }]);
});
test("a second creation cannot duplicate an account's website", async () => {
  await asUser();
  await create();
  await expect(create("another-address")).rejects.toThrow(
    /websites_one_per_account/,
  );
});
test("globally unique slugs reject collisions even when the other row is hidden", async () => {
  await asUser();
  await expect(create("bobs-picks")).rejects.toThrow(/websites_slug_unique/);
});
test.each([
  "UPPER",
  "aa",
  "-bad",
  "bad-",
  "two--hyphens",
  "slash/path",
  "has space",
  "admin",
  "a".repeat(49),
])("rejects invalid or reserved address %s at the database", async (slug) => {
  await asUser();
  await expect(create(slug)).rejects.toThrow(/websites_slug_format/);
});
test.each(["account_id", "id", "status", "created_at", "updated_at"])(
  "cannot set protected column %s on creation",
  async (column) => {
    await asUser();
    await expect(
      db.exec(
        `insert into public.websites(name, slug, ${column}) values ('Website', 'test-address', default)`,
      ),
    ).rejects.toThrow(/permission denied/);
  },
);
test.each(["account_id", "id", "status", "created_at", "updated_at"])(
  "cannot update protected column %s",
  async (column) => {
    await asUser();
    await create();
    await expect(
      db.exec(`update public.websites set ${column} = default`),
    ).rejects.toThrow(/permission denied/);
  },
);
test("anonymous callers cannot read drafts", async () => {
  await db.exec("set local role anon;");
  await expect(db.query("select * from public.websites")).rejects.toThrow(
    /permission denied/,
  );
});
test("anonymous callers cannot create websites", async () => {
  await db.exec("set local role anon;");
  await expect(create()).rejects.toThrow(/permission denied/);
});
test("anonymous callers cannot edit websites", async () => {
  await db.exec("set local role anon;");
  await expect(
    db.query("update public.websites set name = 'Stolen'"),
  ).rejects.toThrow(/permission denied/);
});
test("deletion is not available to the owner", async () => {
  await asUser();
  await create();
  await expect(db.query("delete from public.websites")).rejects.toThrow(
    /permission denied/,
  );
});
test("RLS denies insertion without an identity", async () => {
  await db.exec(
    "set local role authenticated; set local \"request.jwt.claim.sub\" = '';",
  );
  await expect(create()).rejects.toThrow(/row-level security/);
});
test("a user without an account record cannot create a website", async () => {
  await asUser("00000000-0000-4000-8000-000000000009");
  await expect(create()).rejects.toThrow(/foreign key/);
});
test("name and description limits apply to direct database writes", async () => {
  await asUser();
  await expect(
    db.query(
      "insert into public.websites(name, slug) values ('   ', 'valid-address')",
    ),
  ).rejects.toThrow(/check constraint/);
});
test("overlong descriptions cannot bypass the application", async () => {
  await asUser();
  await create();
  await expect(
    db.query("update public.websites set description = $1", ["a".repeat(501)]),
  ).rejects.toThrow(/check constraint/);
});
test("even administrative writes cannot publish in this milestone", async () => {
  await expect(
    db.query("update public.websites set status = 'published'"),
  ).rejects.toThrow(/check constraint/);
});
test("account deletion cascades only the owned website", async () => {
  await asUser();
  await create();
  await db.exec("reset role;");
  await db.query("delete from auth.users where id = $1", [alice]);
  expect(
    (await db.query("select account_id from public.websites")).rows,
  ).toEqual([{ account_id: bob }]);
});
