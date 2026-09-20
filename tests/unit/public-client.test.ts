import { afterEach, beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: m.create }));
import { createPublicClient } from "@/lib/server/supabase/public-client";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
test("public client has no session persistence or cookie adapter and always disables caching", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response());
  vi.stubGlobal("fetch", fetcher);
  createPublicClient();
  const options = m.create.mock.calls[0][2];
  expect(options.auth).toEqual({
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  });
  expect(options.cookies).toBeUndefined();
  await options.global.fetch("https://example.supabase.co/rest/v1/websites", {
    cache: "force-cache",
  });
  expect(fetcher).toHaveBeenCalledWith(
    "https://example.supabase.co/rest/v1/websites",
    { cache: "no-store" },
  );
});
