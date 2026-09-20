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
