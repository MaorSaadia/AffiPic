import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, afterAll, expect, test } from "vitest";

// Opt-in only: run against a dedicated test project with two pre-created, confirmed users.
// Uses publishable credentials and user sessions, never a service-role key.
const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "E2E_EMAIL",
  "E2E_PASSWORD",
  "E2E_OTHER_EMAIL",
  "E2E_OTHER_PASSWORD",
] as const;
const missing = keys.filter((key) => !process.env[key]);
let alice: SupabaseClient;
let bob: SupabaseClient;
let anon: SupabaseClient;
let aliceId: string;
let bobId: string;
let aliceSite: { id: string; name: string; slug: string };
let bobSite: { id: string; name: string; slug: string };
beforeAll(async () => {
  if (missing.length)
    throw new Error(
      `Configure the dedicated test project first. Missing: ${missing.join(", ")}`,
    );
  const makeClient = () =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  alice = makeClient();
  bob = makeClient();
  anon = makeClient();
  const first = await alice.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_PASSWORD!,
  });
  const second = await bob.auth.signInWithPassword({
    email: process.env.E2E_OTHER_EMAIL!,
    password: process.env.E2E_OTHER_PASSWORD!,
  });
  expect(first.error?.message).toBeUndefined();
  expect(second.error?.message).toBeUndefined();
  expect(first.data.user?.email_confirmed_at).toBeTruthy();
  expect(second.data.user?.email_confirmed_at).toBeTruthy();
  aliceId = first.data.user!.id;
  bobId = second.data.user!.id;
  expect(aliceId).not.toBe(bobId);
  async function ensureWebsite(client: SupabaseClient, id: string) {
    const existing = await client
      .from("websites")
      .select("id, name, slug, status")
      .maybeSingle();
    expect(existing.error).toBeNull();
    if (existing.data) {
      expect(
        existing.data.status,
        "Use unpublished dedicated fixture websites",
      ).toBe("draft");
      return existing.data;
    }
    const created = await client
      .from("websites")
      .insert({
        name: "Integration fixture",
        slug: `test-${id.replaceAll("-", "")}`,
        description: "Dedicated test account fixture",
      })
      .select("id, name, slug")
      .single();
    expect(created.error).toBeNull();
    return created.data!;
  }
  aliceSite = await ensureWebsite(alice, aliceId);
  bobSite = await ensureWebsite(bob, bobId);
});
afterAll(async () => {
  await Promise.all([
    alice?.auth.signOut({ scope: "local" }),
    bob?.auth.signOut({ scope: "local" }),
  ]);
});
test("real Supabase sessions see only their own account", async () => {
  const first = await alice.from("accounts").select("id");
  const second = await bob.from("accounts").select("id");
  expect(first.error).toBeNull();
  expect(second.error).toBeNull();
  expect(first.data).toEqual([{ id: aliceId }]);
  expect(second.data).toEqual([{ id: bobId }]);
});
test("direct foreign-account reads and updates are denied by RLS", async () => {
  const foreign = await alice.from("accounts").select("id").eq("id", bobId);
  expect(foreign.error).toBeNull();
  expect(foreign.data).toEqual([]);
  const own = await bob
    .from("accounts")
    .select("display_name")
    .eq("id", bobId)
    .single();
  expect(own.error).toBeNull();
  // Same-value update avoids changing the other fixture even if the policy is broken.
  const update = await alice
    .from("accounts")
    .update({ display_name: own.data!.display_name })
    .eq("id", bobId)
    .select("id");
  expect(update.error).toBeNull();
  expect(update.data).toEqual([]);
});
test("owners can update their own permitted column", async () => {
  const own = await alice
    .from("accounts")
    .select("display_name")
    .eq("id", aliceId)
    .single();
  expect(own.error).toBeNull();
  const update = await alice
    .from("accounts")
    .update({ display_name: own.data!.display_name })
    .eq("id", aliceId)
    .select("id");
  expect(update.error).toBeNull();
  expect(update.data).toEqual([{ id: aliceId }]);
});
test("anonymous API calls cannot read accounts", async () => {
  const result = await anon.from("accounts").select("id");
  expect(result.error).not.toBeNull();
  expect(result.data).toBeNull();
});

test("website ownership isolates real API reads and edits", async () => {
  const visible = await alice.from("websites").select("id, account_id, status");
  expect(visible.error).toBeNull();
  expect(visible.data).toEqual([
    { id: aliceSite.id, account_id: aliceId, status: "draft" },
  ]);
  const foreign = await alice
    .from("websites")
    .select("id")
    .eq("id", bobSite.id);
  expect(foreign.error).toBeNull();
  expect(foreign.data).toEqual([]);
  const update = await alice
    .from("websites")
    .update({ name: bobSite.name })
    .eq("id", bobSite.id)
    .select("id");
  expect(update.error).toBeNull();
  expect(update.data).toEqual([]);
  const own = await alice
    .from("websites")
    .update({ name: aliceSite.name })
    .eq("id", aliceSite.id)
    .select("id");
  expect(own.error).toBeNull();
  expect(own.data).toEqual([{ id: aliceSite.id }]);
});
test("anonymous API clients cannot read draft websites", async () => {
  const result = await anon.from("websites").select("id");
  expect(result.error).not.toBeNull();
  expect(result.data).toBeNull();
});
test("real API clients cannot transfer ownership or publish", async () => {
  const transfer = await alice
    .from("websites")
    .update({ account_id: bobId })
    .eq("id", aliceSite.id);
  expect(transfer.error?.code).toBe("42501");
  const publish = await alice
    .from("websites")
    .update({ status: "published" })
    .eq("id", bobSite.id)
    .select("id");
  expect(publish.error).toBeNull();
  expect(publish.data).toEqual([]);
});

// Dedicated fixture project only. Cleans up exactly the rows and object created here.
test("products and private images persist and isolate two real accounts", async () => {
  const path = aliceSite.id + "/" + randomUUID() + ".webp";
  const bucket = alice.storage.from("product-images");
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#4466bb" },
  })
    .webp()
    .toBuffer();
  let productId: string | undefined;
  try {
    expect(
      (
        await bucket.upload(path, image, {
          contentType: "image/webp",
          upsert: false,
        })
      ).error,
    ).toBeNull();
    const created = await alice
      .from("products")
      .insert({
        website_id: aliceSite.id,
        name: "Day 5 integration fixture",
        affiliate_url: "https://example.com/?tag=fixture",
        image_path: path,
      })
      .select("id,revision")
      .single();
    expect(created.error).toBeNull();
    productId = created.data!.id;
    expect(
      (
        await alice
          .from("products")
          .select("image_path")
          .eq("id", productId)
          .single()
      ).data?.image_path,
    ).toBe(path);
    expect(
      (await bob.from("products").select("id").eq("id", productId)).data,
    ).toEqual([]);
    expect(
      (
        await bob
          .from("products")
          .update({ name: "Day 5 integration fixture" })
          .eq("id", productId)
          .select("id")
      ).data,
    ).toEqual([]);
    expect(
      (await bob.from("products").delete().eq("id", productId).select("id"))
        .data,
    ).toEqual([]);
    expect(
      (await bob.storage.from("product-images").download(path)).error,
    ).not.toBeNull();
    expect(
      (await anon.storage.from("product-images").download(path)).error,
    ).not.toBeNull();
    expect(
      (await bob.storage.from("product-images").createSignedUrl(path, 60))
        .error,
    ).not.toBeNull();
    expect((await bucket.download(path)).error).toBeNull();
    expect(
      (
        await alice
          .from("websites")
          .update({ status: "published" })
          .eq("id", aliceSite.id)
      ).error,
    ).toBeNull();
    expect(
      (
        await anon
          .from("websites")
          .select("id,name,slug")
          .eq("id", aliceSite.id)
      ).data,
    ).toHaveLength(1);
    expect(
      (await anon.from("products").select("id,name").eq("id", productId)).data,
    ).toHaveLength(1);
    expect(
      (await anon.storage.from("product-images").download(path)).error,
    ).toBeNull();
    expect(
      (await anon.storage.from("product-images").createSignedUrl(path, 60))
        .error,
    ).not.toBeNull();
    expect(
      (
        await alice
          .from("websites")
          .update({ status: "draft" })
          .eq("id", aliceSite.id)
      ).error,
    ).toBeNull();
    expect(
      (await anon.from("products").select("id").eq("id", productId)).data,
    ).toEqual([]);
    expect(
      (await anon.storage.from("product-images").download(path)).error,
    ).not.toBeNull();
    const signed = await bucket.createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    expect((await fetch(signed.data!.signedUrl)).status).toBe(200);
    await bob.storage.from("product-images").remove([path]);
    await bucket.remove([path]); // Referenced images cannot be removed, even by the owner.
    expect((await bucket.download(path)).error).toBeNull();
    const update = await alice
      .from("products")
      .update({ name: "Edited fixture", image_path: null })
      .eq("id", productId)
      .eq("revision", created.data!.revision)
      .select("revision")
      .single();
    expect(update.error).toBeNull();
    expect(update.data?.revision).toBe(2);
    expect((await bucket.remove([path])).error).toBeNull();
    expect((await bucket.download(path)).error).not.toBeNull();
  } finally {
    await alice
      .from("websites")
      .update({ status: "draft" })
      .eq("id", aliceSite.id);
    if (productId) await alice.from("products").delete().eq("id", productId);
    await bucket.remove([path]);
  }
});
