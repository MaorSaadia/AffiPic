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
const alice = "00000000-0000-4000-8000-000000000001",
  bob = "00000000-0000-4000-8000-000000000002";
let site: string, otherSite: string;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 -- Minimal storage model for testing policy logic, not the hosted Storage API.
 create schema storage;
 create function storage.allow_only_operation(operation text) returns boolean language sql stable as $$ select coalesce(current_setting('test.storage_operation', true), '') = operation $$;

 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;
 grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const name of [
    "202609180001_accounts.sql",
    "202609200001_websites.sql",
    "202609200002_catalog.sql",
    "202609200003_products.sql",
    "202609200004_product_images.sql",
    "202609200005_publishing.sql",
    "202609200006_branding.sql",
  ])
    await db.exec(
      readFileSync(
        new URL("../../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
  [site, otherSite] = (
    await db.query<{ id: string }>(
      "insert into websites(account_id,name,slug) values ($1,'Alice','alice-site'),($2,'Bob','bob-site') returning id",
      [alice, bob],
    )
  ).rows.map((r) => r.id);
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
    `set local role authenticated;set local "request.jwt.claim.sub"='${id}';`,
  );
}
async function create(website = site) {
  return db.query<{ id: string; revision: number }>(
    "insert into products(website_id,name,affiliate_url) values ($1,'Find','https://shop.example/?tag=mine') returning id,revision",
    [website],
  );
}
const path = (website: string) =>
  website + "/00000000-0000-4000-8000-000000000003.webp";

async function branding(website = site) {
  return db.query(
    "insert into website_branding(website_id) values ($1) returning revision,accent_color",
    [website],
  );
}
async function anon(operation = "object.get_authenticated") {
  await db.exec("set local role anon");
  await db.query("select set_config('test.storage_operation',$1,true)", [
    operation,
  ]);
}
test("owner creates and edits branding with managed revision", async () => {
  await asUser();
  expect((await branding()).rows).toEqual([
    { revision: 1, accent_color: "#2449c4" },
  ]);
  expect(
    (
      await db.query(
        "update website_branding set accent_color='#166534',heading_font='serif',background='mist' where revision=1 returning revision",
      )
    ).rows,
  ).toEqual([{ revision: 2 }]);
  expect(
    (
      await db.query(
        "update website_branding set hero_title='Stale' where revision=1 returning website_id",
      )
    ).rows,
  ).toEqual([]);
});
test("foreign branding is private and unmodifiable", async () => {
  await branding(otherSite);
  await asUser();
  expect((await db.query("select * from website_branding")).rows).toEqual([]);
  expect(
    (
      await db.query(
        "update website_branding set hero_title='Stolen' returning website_id",
      )
    ).rows,
  ).toEqual([]);
});
test("cannot create branding for another website", async () => {
  await asUser();
  await expect(branding(otherSite)).rejects.toThrow(/row-level security/);
});
test("one branding record per website", async () => {
  await asUser();
  await branding();
  await expect(branding()).rejects.toThrow(/unique/);
});
for (const color of [
  "#ffffff",
  "#ffff00",
  "#777777",
  "red",
  "#123",
  "#2449c4;display:none",
])
  test("rejects unsafe color " + color, async () => {
    await asUser();
    await expect(
      db.query(
        "insert into website_branding(website_id,accent_color) values ($1,$2)",
        [site, color],
      ),
    ).rejects.toThrow(/check constraint/);
  });
for (const color of ["#2449c4", "#166534", "#9f1239", "#000000"])
  test("accepts readable color " + color, async () => {
    await asUser();
    expect(
      (
        await db.query(
          "insert into website_branding(website_id,accent_color) values ($1,$2) returning accent_color",
          [site, color],
        )
      ).rows,
    ).toEqual([{ accent_color: color }]);
  });
for (const [field, value] of [
  ["background", "url(evil)"],
  ["heading_font", "Comic Sans"],
  ["hero_title", "a".repeat(121)],
  ["hero_subtitle", "a".repeat(501)],
])
  test("bounds " + field, async () => {
    await asUser();
    await branding();
    await expect(
      db.query("update website_branding set " + field + "=$1", [value]),
    ).rejects.toThrow(/check constraint/);
  });
for (const field of ["website_id", "revision", "created_at", "updated_at"])
  test("protects " + field, async () => {
    await asUser();
    await expect(
      db.exec("update website_branding set " + field + "=default"),
    ).rejects.toThrow(/permission denied/);
  });
test("foreign logo path rejected", async () => {
  await asUser();
  await branding();
  await expect(
    db.query("update website_branding set logo_path=$1", [path(otherSite)]),
  ).rejects.toThrow(/check constraint/);
});
test("anonymous reads follow publish state and omit revision", async () => {
  await branding();
  await anon();
  expect(
    (await db.query("select hero_title from website_branding")).rows,
  ).toEqual([]);
  await asUser();
  await create();
  await db.exec("update websites set status='published'");
  await anon();
  expect(
    (await db.query("select hero_title,accent_color from website_branding"))
      .rows,
  ).toEqual([{ hero_title: "", accent_color: "#2449c4" }]);
  await asUser();
  await db.exec("update websites set status='draft'");
  await anon();
  expect(
    (await db.query("select hero_title from website_branding")).rows,
  ).toEqual([]);
});
test("anonymous cannot read management fields", async () => {
  await anon();
  await expect(
    db.query("select revision from website_branding"),
  ).rejects.toThrow(/permission denied/);
});
test("anonymous cannot write branding", async () => {
  await anon();
  await expect(branding()).rejects.toThrow(/permission denied/);
});
test("owner cannot delete branding", async () => {
  await asUser();
  await expect(db.exec("delete from website_branding")).rejects.toThrow(
    /permission denied/,
  );
});
test("logos are owned, immutable and protected while referenced", async () => {
  await asUser();
  await branding();
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('website-logos',$1)",
    [path(site)],
  );
  await db.query("update website_branding set logo_path=$1", [path(site)]);
  expect(
    (await db.query("delete from storage.objects returning name")).rows,
  ).toEqual([]);
  expect(
    (await db.query("update storage.objects set name='changed' returning name"))
      .rows,
  ).toEqual([]);
  await db.exec("update website_branding set logo_path=null");
  expect(
    (await db.query("delete from storage.objects returning name")).rows,
  ).toHaveLength(1);
});
test("foreign upload denied", async () => {
  await asUser();
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values ('website-logos',$1)",
      [path(otherSite)],
    ),
  ).rejects.toThrow(/row-level security/);
});
test("public logo download requires publication and cannot be signed or listed", async () => {
  await asUser();
  await branding();
  await create();
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('website-logos',$1)",
    [path(site)],
  );
  await db.query("update website_branding set logo_path=$1", [path(site)]);
  await anon();
  expect((await db.query("select name from storage.objects")).rows).toEqual([]);
  await asUser();
  await db.exec("update websites set status='published'");
  await anon();
  expect(
    (await db.query("select name from storage.objects")).rows,
  ).toHaveLength(1);
  for (const operation of ["object.sign", "object.list", ""]) {
    await anon(operation);
    expect((await db.query("select name from storage.objects")).rows).toEqual(
      [],
    );
  }
  await asUser();
  await db.exec("update websites set status='draft'");
  await anon();
  expect((await db.query("select name from storage.objects")).rows).toEqual([]);
});
test("unreferenced published-site logo stays private", async () => {
  await asUser();
  await create();
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('website-logos',$1)",
    [path(site)],
  );
  await db.exec("update websites set status='published'");
  await anon();
  expect((await db.query("select name from storage.objects")).rows).toEqual([]);
});
