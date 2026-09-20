import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({
  website: vi.fn(),
  client: vi.fn(),
  bucket: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/lib/server/public-websites", () => ({
  getPublicWebsite: m.website,
}));
vi.mock("@/lib/server/supabase/public-client", () => ({
  createPublicClient: m.client,
}));
import { GET } from "@/app/(public)/s/[siteSlug]/logo/route";
const request = () =>
  GET(new Request("https://example.test/s/my-site/logo"), {
    params: Promise.resolve({ siteSlug: "my-site" }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.website.mockResolvedValue({ branding: { logo_path: "owned/logo.webp" } });
  m.client.mockReturnValue({ storage: { from: m.bucket } });
  m.bucket.mockReturnValue({ download: m.download });
  m.download.mockResolvedValue({
    data: new Blob(["image"], { type: "image/webp" }),
    error: null,
  });
});
test("serves current published logo bytes without a signed redirect or caching", async () => {
  const response = await request();
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("image");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Location")).toBeNull();
  expect(response.headers.get("Content-Type")).toBe("image/webp");
  expect(m.bucket).toHaveBeenCalledWith("website-logos");
  expect(m.download).toHaveBeenCalledWith("owned/logo.webp");
});
test.each([null, { branding: { logo_path: null } }])(
  "unpublished or absent logo %j never downloads",
  async (website) => {
    m.website.mockResolvedValue(website);
    expect((await request()).status).toBe(404);
    expect(m.download).not.toHaveBeenCalled();
  },
);
test("storage denial after unpublishing returns no bytes", async () => {
  m.download.mockResolvedValue({ data: null, error: { message: "denied" } });
  expect((await request()).status).toBe(404);
});
test("connection errors fail closed without caching", async () => {
  m.website.mockRejectedValue(new Error("offline"));
  const response = await request();
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});
