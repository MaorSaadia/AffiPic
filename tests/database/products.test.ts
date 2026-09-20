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
let site: string,
  otherSite: string,
  category: string,
  otherCategory: string,
  merchant: string,
  otherMerchant: string;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 -- Minimal storage model for testing policy logic, not the hosted Storage API.
 create schema storage;
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
  [category, otherCategory] = (
    await db.query<{ id: string }>(
      "insert into categories(website_id,name) values ($1,'Own'),($2,'Other') returning id",
      [site, otherSite],
    )
  ).rows.map((r) => r.id);
  [merchant, otherMerchant] = (
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
test("owner CRUD, revision and optional relationships", async () => {
  await asUser();
  const row = (await create()).rows[0];
  expect(row.revision).toBe(1);
  const saved = await db.query(
    "update products set category_id=$1,merchant_id=$2,name='Edited' where id=$3 and revision=1 returning revision",
    [category, merchant, row.id],
  );
  expect(saved.rows).toEqual([{ revision: 2 }]);
  expect(
    (
      await db.query(
        "update products set name='Stale' where id=$1 and revision=1 returning id",
        [row.id],
      )
    ).rows,
  ).toEqual([]);
  expect(
    (await db.query("delete from products where id=$1 returning id", [row.id]))
      .rows,
  ).toHaveLength(1);
});
test("foreign products invisible and cannot be changed/deleted", async () => {
  await create(otherSite);
  await asUser();
  expect((await db.query("select * from products")).rows).toEqual([]);
  expect(
    (await db.query("update products set name='Stolen' returning id")).rows,
  ).toEqual([]);
  expect((await db.query("delete from products returning id")).rows).toEqual(
    [],
  );
});
test("cannot insert into foreign website", async () => {
  await asUser();
  await expect(create(otherSite)).rejects.toThrow(/row-level security/);
});
for (const relation of ["category", "merchant"])
  test("foreign " + relation + " blocked by composite FK", async () => {
    await asUser();
    await create();
    await expect(
      db.query(`update products set ${relation}_id=$1`, [
        relation === "category" ? otherCategory : otherMerchant,
      ]),
    ).rejects.toThrow(/foreign key/);
  });
for (const table of ["categories", "merchants"])
  test("referenced " + table + " cannot be deleted", async () => {
    await asUser();
    await create();
    await db.query("update products set category_id=$1,merchant_id=$2", [
      category,
      merchant,
    ]);
    await expect(
      db.query("delete from " + table + " where website_id=$1", [site]),
    ).rejects.toThrow(/foreign key/);
  });
for (const column of [
  "id",
  "website_id",
  "revision",
  "created_at",
  "updated_at",
])
  test("cannot update protected " + column, async () => {
    await asUser();
    await expect(
      db.exec("update products set " + column + "=default"),
    ).rejects.toThrow(/permission denied/);
  });
for (const url of [
  "javascript:alert(1)",
  "data:text/html,hi",
  "ftp://shop.example",
  "https://has space",
])
  test("invalid URL " + url, async () => {
    await asUser();
    await expect(
      db.query(
        "insert into products(website_id,name,affiliate_url) values ($1,'Find',$2)",
        [site, url],
      ),
    ).rejects.toThrow(/check constraint/);
  });
test("cannot assign foreign image path", async () => {
  await asUser();
  await create();
  await expect(
    db.query("update products set image_path=$1", [path(otherSite)]),
  ).rejects.toThrow(/check constraint/);
});
test("anonymous product reads denied", async () => {
  await db.exec("set local role anon;");
  await expect(db.query("select * from products")).rejects.toThrow(
    /permission denied/,
  );
});
test("private bucket restricts size and stored MIME", async () => {
  expect(
    (
      await db.query(
        "select public,file_size_limit,allowed_mime_types from storage.buckets",
      )
    ).rows,
  ).toEqual([
    {
      public: false,
      file_size_limit: 2097152,
      allowed_mime_types: ["image/webp"],
    },
  ]);
});
test("owner upload/read/delete and referenced-image protection", async () => {
  await asUser();
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(site)],
  );
  expect((await db.query("select * from storage.objects")).rows).toHaveLength(
    1,
  );
  await create();
  await db.query("update products set image_path=$1", [path(site)]);
  expect(
    (await db.query("delete from storage.objects returning name")).rows,
  ).toEqual([]);
  await db.exec("update products set image_path=null");
  expect(
    (await db.query("delete from storage.objects returning name")).rows,
  ).toHaveLength(1);
});
test("foreign images unreadable, unchangeable and undeletable", async () => {
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(otherSite)],
  );
  await asUser();
  expect((await db.query("select * from storage.objects")).rows).toEqual([]);
  expect(
    (await db.query("update storage.objects set name='changed' returning name"))
      .rows,
  ).toEqual([]);
  expect(
    (await db.query("delete from storage.objects returning name")).rows,
  ).toEqual([]);
});
test("cannot upload to foreign folder", async () => {
  await asUser();
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
      [path(otherSite)],
    ),
  ).rejects.toThrow(/row-level security/);
});
test("cannot overwrite own images", async () => {
  await asUser();
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(site)],
  );
  expect(
    (await db.query("update storage.objects set name='renamed' returning name"))
      .rows,
  ).toEqual([]);
});
test("anonymous image reads and writes denied", async () => {
  await db.query(
    "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
    [path(site)],
  );
  await db.exec("set local role anon;");
  expect((await db.query("select * from storage.objects")).rows).toEqual([]);
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
      [path(otherSite)],
    ),
  ).rejects.toThrow(/row-level security/);
});
for (const suffix of [
  "../bad.webp",
  "file.svg",
  "nested/file.webp",
  "file.webp",
  "00000000-0000-4000-8000-000000000003Xwebp",
])
  test("malformed storage path " + suffix, async () => {
    await asUser();
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name) values ('product-images',$1)",
        [site + "/" + suffix],
      ),
    ).rejects.toThrow(/row-level security/);
  });
