import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({
  website: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  download: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-websites", () => ({
  getPublicWebsite: m.website,
}));
vi.mock("@/lib/server/supabase/public-client", () => ({
  createPublicClient: m.client,
}));
import { GET } from "@/app/(public)/s/[siteSlug]/images/[productId]/route";
const id = "00000000-0000-4000-8000-000000000001";
function get(productId = id) {
  return GET(new Request("https://app.test/s/my-site/images/" + productId), {
    params: Promise.resolve({ siteSlug: "my-site", productId }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  const q = { select: m.select, eq: m.eq, maybeSingle: m.maybeSingle };
  for (const fn of [m.from, m.select, m.eq]) fn.mockReturnValue(q);
  m.client.mockReturnValue({
    from: m.from,
    storage: { from: () => ({ download: m.download }) },
  });
  m.website.mockResolvedValue({ id: "site" });
  m.maybeSingle.mockResolvedValue({
    data: { image_path: "site/file.webp" },
    error: null,
  });
  m.download.mockResolvedValue({ data: new Blob(["image"]), error: null });
});
test("public image is scoped to resolved site and sent without caching", async () => {
  const result = await get();
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  expect(result.headers.get("Content-Type")).toBe("image/webp");
  expect(m.eq).toHaveBeenCalledWith("website_id", "site");
  expect(m.eq).toHaveBeenCalledWith("id", id);
});
test("draft or unpublished site cannot serve an image", async () => {
  m.website.mockResolvedValue(null);
  expect((await get()).status).toBe(404);
  expect(m.download).not.toHaveBeenCalled();
});
test("foreign or missing product cannot download", async () => {
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await get()).status).toBe(404);
  expect(m.download).not.toHaveBeenCalled();
});
test("storage denial does not redirect to a signed URL", async () => {
  m.download.mockResolvedValue({ data: null, error: { message: "denied" } });
  const result = await get();
  expect(result.status).toBe(404);
  expect(result.headers.get("Location")).toBeNull();
});
test("invalid product avoids database access", async () => {
  expect((await get("invalid")).status).toBe(404);
  expect(m.website).not.toHaveBeenCalled();
});
test("query failure is an uncached service failure", async () => {
  m.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: "offline" },
  });
  expect((await get()).status).toBe(503);
});
