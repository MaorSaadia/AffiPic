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
let site: string, foreignSite: string;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of [
    "202609180001_accounts.sql",
    "202609200001_websites.sql",
    "202609200002_catalog.sql",
  ])
    await db.exec(
      readFileSync(
        new URL("../../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  await db.query("insert into auth.users(id) values ($1), ($2)", [alice, bob]);
  const rows = (
    await db.query<{ id: string }>(
      "insert into websites(account_id,name,slug) values ($1,'Alice','alice-site'),($2,'Bob','bob-site') returning id",
      [alice, bob],
    )
  ).rows;
  site = rows[0].id;
  foreignSite = rows[1].id;
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
async function asAlice() {
  await db.exec(
    `set local role authenticated; set local "request.jwt.claim.sub" = '${alice}';`,
  );
}
for (const table of ["categories", "merchants"]) {
  test(
    table + ": owner CRUD and case-insensitive scoped uniqueness",
    async () => {
      await db.query(
        `insert into ${table}(website_id,name) values ($1,'Home')`,
        [foreignSite],
      );
      await asAlice();
      const row = (
        await db.query<{ id: string }>(
          `insert into ${table}(website_id,name) values ($1,'Home') returning id`,
          [site],
        )
      ).rows[0];
      expect((await db.query(`select * from ${table}`)).rows).toHaveLength(1);
      expect(
        (
          await db.query(
            `update ${table} set name='Living' where id=$1 returning name`,
            [row.id],
          )
        ).rows,
      ).toEqual([{ name: "Living" }]);
      expect(
        (
          await db.query(`delete from ${table} where id=$1 returning id`, [
            row.id,
          ])
        ).rows,
      ).toHaveLength(1);
      expect((await db.query(`select * from ${table}`)).rows).toEqual([]);
    },
  );
  test(table + ": duplicate names rejected", async () => {
    await asAlice();
    await db.query(`insert into ${table}(website_id,name) values ($1,'Home')`, [
      site,
    ]);
    await expect(
      db.query(`insert into ${table}(website_id,name) values ($1,'HOME')`, [
        site,
      ]),
    ).rejects.toThrow(/unique/);
  });
  test(
    table + ": foreign reads, updates and deletes affect no rows",
    async () => {
      await db.query(
        `insert into ${table}(website_id,name) values ($1,'Private')`,
        [foreignSite],
      );
      await asAlice();
      expect((await db.query(`select * from ${table}`)).rows).toEqual([]);
      expect(
        (await db.query(`update ${table} set name='Stolen' returning id`)).rows,
      ).toEqual([]);
      expect(
        (await db.query(`delete from ${table} returning id`)).rows,
      ).toEqual([]);
    },
  );
  test(table + ": cannot insert into another website", async () => {
    await asAlice();
    await expect(
      db.query(`insert into ${table}(website_id,name) values ($1,'Stolen')`, [
        foreignSite,
      ]),
    ).rejects.toThrow(/row-level security/);
  });
  for (const column of ["website_id", "id", "created_at", "updated_at"])
    test(table + ": cannot update " + column, async () => {
      await asAlice();
      await expect(
        db.exec(`update ${table} set ${column}=default`),
      ).rejects.toThrow(/permission denied/);
    });
  for (const name of ["", "   ", " padded ", "a".repeat(81)])
    test(
      table +
        ": invalid name " +
        name.length +
        JSON.stringify(name.slice(0, 8)),
      async () => {
        await asAlice();
        await expect(
          db.query(`insert into ${table}(website_id,name) values ($1,$2)`, [
            site,
            name,
          ]),
        ).rejects.toThrow(/check constraint/);
      },
    );
  for (const sql of [
    `select * from ${table}`,
    `delete from ${table}`,
    `update ${table} set name='No'`,
    `insert into ${table}(website_id,name) values ('${alice}','No')`,
  ])
    test("anonymous denial: " + sql, async () => {
      await db.exec("set local role anon;");
      await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
    });
  test(table + ": deleting a website cascades only its content", async () => {
    await db.query(
      `insert into ${table}(website_id,name) values ($1,'Own'),($2,'Other')`,
      [site, foreignSite],
    );
    await db.query("delete from websites where id=$1", [site]);
    expect((await db.query(`select name from ${table}`)).rows).toEqual([
      { name: "Other" },
    ]);
  });
}
