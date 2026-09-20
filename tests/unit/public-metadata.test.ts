import { afterEach, beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ website: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-websites", () => ({
  getPublicWebsite: m.website,
  getPublicCatalog: vi.fn(),
}));
import { generateMetadata } from "@/app/(public)/s/[siteSlug]/page";
beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://affipic.example");
  m.website.mockResolvedValue({
    name: "My recommendations",
    slug: "my-site",
    description: "My selected finds.",
  });
});
afterEach(() => vi.unstubAllEnvs());
test("published metadata overrides dashboard noindex and branding", async () => {
  const metadata = await generateMetadata({
    params: Promise.resolve({ siteSlug: "my-site" }),
    searchParams: Promise.resolve({ page: "2" }),
  });
  expect(metadata.title).toEqual({ absolute: "My recommendations" });
  expect(metadata.robots).toEqual({ index: true, follow: true });
  expect(metadata.alternates?.canonical).toBe(
    "https://affipic.example/s/my-site?page=2",
  );
});
test("missing public website has noindex without a draft title", async () => {
  m.website.mockResolvedValue(null);
  const metadata = await generateMetadata({
    params: Promise.resolve({ siteSlug: "my-site" }),
    searchParams: Promise.resolve({}),
  });
  expect(metadata.robots).toEqual({ index: false, follow: false });
  expect(metadata.title).toEqual({ absolute: "Website not found" });
});
