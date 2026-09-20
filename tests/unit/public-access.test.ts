import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/supabase/public-client", () => ({
  createPublicClient: m.client,
}));
import { getPublicWebsite } from "@/lib/server/public-websites";
beforeEach(() => {
  vi.resetAllMocks();
  const q = { select: m.select, eq: m.eq, maybeSingle: m.maybeSingle };
  for (const f of [m.from, m.select, m.eq]) f.mockReturnValue(q);
  m.client.mockReturnValue({ from: m.from });
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
});
test("public reads require published state and select display columns only", async () => {
  expect(await getPublicWebsite("my-site")).toBeNull();
  expect(m.eq).toHaveBeenCalledWith("status", "published");
  expect(m.eq).toHaveBeenCalledWith("slug", "my-site");
  expect(m.select).toHaveBeenCalledWith("id,name,slug,description,status");
});
test("unconfigured public read returns unavailable without opening a draft", async () => {
  m.client.mockReturnValue(null);
  expect(await getPublicWebsite("my-site")).toBeNull();
});
test("database failures are not false empty sites", async () => {
  m.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: "missing table" },
  });
  await expect(getPublicWebsite("my-site")).rejects.toThrow(
    "could not be loaded",
  );
});
test.each(["INVALID", "bad--slug", "a", "a".repeat(49), "../dashboard"])(
  "invalid slug %s avoids queries",
  async (slug) => {
    expect(await getPublicWebsite(slug)).toBeNull();
    expect(m.from).not.toHaveBeenCalled();
  },
);
