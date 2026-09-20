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
let site: string, otherSite: string, category: string, merchant: string;
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
  [category] = (
    await db.query<{ id: string }>(
      "insert into categories(website_id,name) values ($1,'Own'),($2,'Other') returning id",
      [site, otherSite],
    )
  ).rows.map((r) => r.id);
  [merchant] = (
    await db.query<{ id: string }>(
      "insert into merchants(website_id,name) values ($1,'Own'),($2,'Other') returning id",
      [site, otherSite],
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

async function publish() {
  await asUser();
  await create();
  await db.query("update websites set status='published' where id=$1", [site]);
}
async function anonymous(operation = "object.get_authenticated") {
  await db.exec("set local role anon;");
  await db.query("select set_config('test.storage_operation',$1,true)", [
    operation,
  ]);
}
test("draft content invisible even with known IDs", async () => {
  await create();
  await anonymous();
  for (const table of ["websites", "products", "categories", "merchants"])
    expect((await db.query("select id,name from " + table)).rows).toEqual([]);
});
test("owner publishes and unpublishes; new anonymous reads disappear", async () => {
  await publish();
  await anonymous();
  expect(
    (await db.query("select id,name,slug,description,status from websites"))
      .rows,
  ).toHaveLength(1);
  expect((await db.query("select id,name from products")).rows).toHaveLength(1);
  expect((await db.query("select id,name from categories")).rows).toEqual([
    { id: category, name: "Own" },
  ]);
  expect((await db.query("select id,name from merchants")).rows).toEqual([
    { id: merchant, name: "Own" },
  ]);
  await asUser();
  await db.query("update websites set status='draft' where id=$1", [site]);
  await anonymous();
  for (const table of ["websites", "products", "categories", "merchants"])
    expect((await db.query("select id from " + table)).rows).toEqual([]);
});
test("cannot publish without a product", async () => {
  await asUser();
  await expect(
    db.query("update websites set status='published' where id=$1", [site]),
  ).rejects.toThrow(/at least one product/);
});
test("cannot change another account publication", async () => {
  await publish();
  await asUser(bob);
  expect(
    (
      await db.query(
        "update websites set status='draft' where id=$1 returning id",
        [site],
      )
    ).rows,
  ).toEqual([]);
});
test("authenticated management remains owner-only after publishing", async () => {
  await publish();
  await asUser(bob);
  expect((await db.query("select id from products")).rows).toEqual([]);
  expect((await db.query("select id from websites")).rows).toEqual([
    { id: otherSite },
  ]);
});
for (const column of ["account_id", "created_at", "updated_at"])
  test("anonymous cannot read website " + column, async () => {
    await publish();
    await anonymous();
    await expect(
      db.query("select " + column + " from websites"),
    ).rejects.toThrow(/permission denied/);
  });
for (const table of ["websites", "categories", "merchants", "products"])
  for (const operation of ["update", "delete"])
    test("anonymous cannot " + operation + " " + table, async () => {
      await publish();
      await anonymous();
      await expect(
        db.query(
          operation === "update"
            ? "update " + table + " set name='Changed'"
            : "delete from " + table,
        ),
      ).rejects.toThrow(/permission denied/);
    });
test("anonymous cannot publish or insert", async () => {
  await anonymous();
  await expect(
    db.exec("insert into websites(name,slug) values ('Public','public-site')"),
  ).rejects.toThrow(/permission denied/);
});
test("referenced images downloadable only while published", async () => {
  await publish();
  await db.query("update products set image_path=$1", [path(site)]);
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(site)],
  );
  await anonymous();
  expect((await db.query("select name from storage.objects")).rows).toEqual([
    { name: path(site) },
  ]);
  await asUser();
  await db.exec("update websites set status='draft'");
  await anonymous();
  expect((await db.query("select name from storage.objects")).rows).toEqual([]);
});
for (const operation of [
  "object.list",
  "object.sign",
  "",
  "object.upload_signed",
])
  test("anonymous image operation blocked: " + operation, async () => {
    await publish();
    await db.query("update products set image_path=$1", [path(site)]);
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
      [path(site)],
    );
    await anonymous(operation);
    expect((await db.query("select name from storage.objects")).rows).toEqual(
      [],
    );
  });
test("unattached uploads stay private on a published site", async () => {
  await publish();
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(site)],
  );
  await anonymous();
  expect((await db.query("select name from storage.objects")).rows).toEqual([]);
});
test("draft website images stay hidden beside another published website", async () => {
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(otherSite)],
  );
  await publish();
  await anonymous();
  expect((await db.query("select name from storage.objects")).rows).toEqual([]);
});
test("renaming a published slug retires old address", async () => {
  await publish();
  await db.exec("update websites set slug='new-address'");
  await anonymous();
  expect(
    (await db.query("select id from websites where slug='alice-site'")).rows,
  ).toEqual([]);
  expect(
    (await db.query("select id from websites where slug='new-address'")).rows,
  ).toEqual([{ id: site }]);
});
