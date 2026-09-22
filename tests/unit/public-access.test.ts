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
import { defaultBranding } from "@/lib/branding/schema";
import { initialDesign } from "@/lib/designer/schema";
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
test("migrated default design retains the default appearance", async () => {
  m.maybeSingle
    .mockResolvedValueOnce({
      data: { id: "site-id", slug: "my-site" },
    })
    .mockResolvedValueOnce({ data: { published: initialDesign() } });
  expect((await getPublicWebsite("my-site"))?.branding).toEqual({
    ...defaultBranding,
    logo_path: null,
  });
  expect(m.select).toHaveBeenCalledWith("published");
  expect(m.eq).toHaveBeenCalledWith("website_id", "site-id");
});
test("public design uses the saved branding", async () => {
  const branding = {
    ...defaultBranding,
    accent_color: "#166534",
    logo_path: null,
  };
  m.maybeSingle
    .mockResolvedValueOnce({ data: { id: "site-id", slug: "my-site" } })
    .mockResolvedValueOnce({ data: { published: initialDesign(branding) } });
  expect((await getPublicWebsite("my-site"))?.branding).toEqual(branding);
});
test("branding query failure is not mistaken for unsaved branding", async () => {
  m.maybeSingle
    .mockResolvedValueOnce({ data: { id: "site-id" } })
    .mockResolvedValueOnce({
      data: null,
      error: { message: "missing migration" },
    });
  await expect(getPublicWebsite("my-site")).rejects.toThrow(
    "branding could not be loaded",
  );
});
test.each(["INVALID", "bad--slug", "a", "a".repeat(49), "../dashboard"])(
  "invalid slug %s avoids queries",
  async (slug) => {
    expect(await getPublicWebsite(slug)).toBeNull();
    expect(m.from).not.toHaveBeenCalled();
  },
);
