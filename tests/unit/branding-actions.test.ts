import { beforeEach, expect, test, vi } from "vitest";
import sharp from "sharp";
import { defaultBranding } from "@/lib/branding/schema";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  preview: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ requireUser: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("@/lib/server/branding", () => ({
  LOGO_BUCKET: "website-logos",
  removeLogo: m.remove,
  logoPreview: m.preview,
}));
import { saveBranding } from "@/app/(dashboard)/dashboard/settings/branding-actions";
const site = { id: "owned-site", slug: "my-site" };
const old = {
  ...defaultBranding,
  revision: 2,
  logo_path: "owned-site/old.webp",
};
function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({ ...defaultBranding, revision: "2", ...extra }).forEach(
    ([k, v]) => data.set(k, v),
  );
  return data;
}
async function withLogo() {
  const data = form();
  const bytes = await sharp({
    create: { width: 800, height: 600, channels: 4, background: "#166534" },
  })
    .png()
    .toBuffer();
  data.set(
    "logo",
    new File([new Uint8Array(bytes)], "logo.png", { type: "image/png" }),
  );
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  const q = {
    select: m.select,
    eq: m.eq,
    update: m.update,
    insert: m.insert,
    maybeSingle: m.maybeSingle,
  };
  for (const fn of [m.from, m.select, m.eq, m.update, m.insert])
    fn.mockReturnValue(q);
  m.auth.mockResolvedValue({
    user: { id: "owner" },
    supabase: { from: m.from, storage: { from: () => ({ upload: m.upload }) } },
  });
  m.maybeSingle
    .mockResolvedValueOnce({ data: site, error: null })
    .mockResolvedValueOnce({ data: old, error: null })
    .mockResolvedValue({ data: { ...old, revision: 3 }, error: null });
  m.upload.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue(true);
  m.preview.mockResolvedValue({ logoUrl: "preview" });
});
test("ownership and logo path come from the session and saved row", async () => {
  expect(
    (
      await saveBranding(
        {},
        form({ website_id: "victim", logo_path: "victim/logo.webp" }),
      )
    ).success,
  ).toBeTruthy();
  expect(m.eq).toHaveBeenCalledWith("account_id", "owner");
  expect(m.eq).toHaveBeenCalledWith("website_id", site.id);
  expect(m.eq).toHaveBeenCalledWith("revision", 2);
  expect(m.update).toHaveBeenCalledWith({
    ...defaultBranding,
    logo_path: old.logo_path,
  });
  expect(m.remove).not.toHaveBeenCalled();
  expect(m.revalidate).toHaveBeenCalledWith("/s/my-site");
});
test("first save inserts with the derived website identity", async () => {
  m.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({ data: site })
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValue({ data: { ...old, revision: 1, logo_path: null } });
  expect(
    (await saveBranding({}, form({ revision: "0" }))).success,
  ).toBeTruthy();
  expect(m.insert).toHaveBeenCalledWith({
    ...defaultBranding,
    website_id: site.id,
    logo_path: null,
  });
});
test("stale revision does not upload or mutate", async () => {
  expect((await saveBranding({}, form({ revision: "1" }))).error).toContain(
    "another tab",
  );
  expect(m.upload).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
});
test("unreadable accent is rejected before queries", async () => {
  expect(
    (await saveBranding({}, form({ accent_color: "#ffffff" }))).error,
  ).toBeTruthy();
  expect(m.from).not.toHaveBeenCalled();
});
test("real image is decoded, resized, and uploaded before old logo cleanup", async () => {
  expect((await saveBranding({}, await withLogo())).success).toBeTruthy();
  const [path, buffer, options] = m.upload.mock.calls[0];
  expect(path).toMatch(/^owned-site\/[0-9a-f-]+\.webp$/);
  expect(await sharp(buffer).metadata()).toMatchObject({
    format: "webp",
    width: 512,
    height: 384,
  });
  expect(options.upsert).toBe(false);
  expect(m.update).toHaveBeenCalledWith({
    ...defaultBranding,
    logo_path: path,
  });
  expect(m.remove).toHaveBeenCalledWith(expect.anything(), old.logo_path);
  expect(m.remove.mock.invocationCallOrder[0]).toBeGreaterThan(
    m.update.mock.invocationCallOrder[0],
  );
});
test("upload failure preserves the saved row and logo", async () => {
  m.upload.mockResolvedValue({ error: { message: "offline" } });
  expect((await saveBranding({}, await withLogo())).error).toContain(
    "upload failed",
  );
  expect(m.update).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
test.each([null, { code: "23505" }, { code: "42501" }])(
  "confirmed rejection cleans only the new upload: %j",
  async (error) => {
    m.maybeSingle
      .mockReset()
      .mockResolvedValueOnce({ data: site })
      .mockResolvedValueOnce({ data: old })
      .mockResolvedValue({ data: null, error });
    expect((await saveBranding({}, await withLogo())).error).toContain(
      "could not be confirmed",
    );
    expect(m.remove).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      m.upload.mock.calls[0][0],
    );
  },
);
test("unknown commit outcome retains both logos", async () => {
  m.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({ data: site })
    .mockResolvedValueOnce({ data: old })
    .mockRejectedValue(new Error("connection lost"));
  expect((await saveBranding({}, await withLogo())).error).toContain(
    "interrupted",
  );
  expect(m.remove).not.toHaveBeenCalled();
});
test("removal saves first and reports cleanup failure without losing success", async () => {
  m.remove.mockResolvedValue(false);
  const result = await saveBranding({}, form({ remove_logo: "on" }));
  expect(m.update).toHaveBeenCalledWith({
    ...defaultBranding,
    logo_path: null,
  });
  expect(result.success).toBeTruthy();
  expect(result.warning).toContain("cleanup");
});
test("fake PNG is rejected without storage writes", async () => {
  const data = form();
  data.set(
    "logo",
    new File(["not an image"], "fake.png", { type: "image/png" }),
  );
  expect((await saveBranding({}, data)).error).toBeTruthy();
  expect(m.upload).not.toHaveBeenCalled();
});
