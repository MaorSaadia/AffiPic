import { afterEach, expect, test, vi } from "vitest";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/auth/config";
import { safeNext, passwordSchema, nameSchema } from "@/lib/auth/validation";
afterEach(() => vi.unstubAllEnvs());
test.each([
  "https://evil.test",
  "//evil.test",
  "/\\evil.test",
  "/dashboard/../auth/confirm",
  "/dashboard?next=https://evil.test",
  "/dashboard/%2f%2fevil.test",
  ["/dashboard"],
])("rejects unsafe redirect %s", (value) => {
  expect(safeNext(value)).toBe("/dashboard");
});
test("keeps an allowed destination", () => {
  expect(safeNext("/dashboard/products")).toBe("/dashboard/products");
});
test("passwords are not trimmed or silently truncated", () => {
  expect(passwordSchema.parse("  long passphrase  ")).toBe(
    "  long passphrase  ",
  );
  expect(passwordSchema.safeParse("short").success).toBe(false);
  expect(passwordSchema.safeParse("a".repeat(7)).success).toBe(false);
  expect(passwordSchema.safeParse("a".repeat(8)).success).toBe(true);
  expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  expect(nameSchema.safeParse("  ").success).toBe(false);
});
test("no configuration fails closed", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  expect(getSupabaseConfig()).toBeNull();
});
test.each(["sb_secret_private", "eyJhbGciOi.service_role", "anything"])(
  "rejects non-publishable key %s",
  (key) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    expect(getSupabaseConfig()).toBeNull();
  },
);
test("accepts publishable HTTPS configuration", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
  expect(getSupabaseConfig()).toEqual({
    url: "https://project.supabase.co",
    key: "sb_publishable_example",
  });
});
test.each([
  "http://external.test",
  "https://user:password@example.com",
  "https://example.com/path",
  "https://example.com?query=value",
  "invalid",
])("rejects unsafe email origin %s", (value) => {
  vi.stubEnv("SITE_URL", value);
  expect(getSiteOrigin()).toBeNull();
});
test("allows explicit local email origin", () => {
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  expect(getSiteOrigin()).toBe("http://localhost:3000");
});
