import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ requireUser: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { setPublication } from "@/app/(dashboard)/dashboard/settings/publishing-actions";
function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({
    status: "published",
    expected_status: "draft",
    confirm: "on",
    ...extra,
  }).forEach(([k, v]) => data.set(k, v));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: m.select,
    eq: m.eq,
    update: m.update,
    maybeSingle: m.maybeSingle,
  };
  for (const fn of [m.from, m.select, m.eq, m.update])
    fn.mockReturnValue(query);
  m.auth.mockResolvedValue({
    user: { id: "owner" },
    supabase: { from: m.from },
  });
  m.maybeSingle
    .mockResolvedValueOnce({
      data: { id: "owned-site", slug: "my-site", status: "draft" },
      error: null,
    })
    .mockResolvedValue({ data: { status: "published" }, error: null });
});
test("publication derives identity and ignores submitted ownership", async () => {
  expect(
    (await setPublication({}, form({ id: "victim", account_id: "victim" })))
      .status,
  ).toBe("published");
  expect(m.eq).toHaveBeenCalledWith("account_id", "owner");
  expect(m.eq).toHaveBeenCalledWith("id", "owned-site");
  expect(m.eq).toHaveBeenCalledWith("status", "draft");
  expect(m.update).toHaveBeenCalledWith({ status: "published" });
  expect(m.revalidate).toHaveBeenCalledWith("/s/my-site");
});
test.each<Record<string, string>>([
  { confirm: "" },
  { status: "invalid" },
  { expected_status: "invalid" },
  { expected_status: "published" },
])("invalid confirmation %j", async (extra) => {
  expect((await setPublication({}, form(extra))).error).toBeTruthy();
  expect(m.from).not.toHaveBeenCalled();
});
test("stale tab cannot change status", async () => {
  m.maybeSingle.mockReset().mockResolvedValue({
    data: { id: "owned", slug: "site", status: "published" },
    error: null,
  });
  expect((await setPublication({}, form())).error).toContain("another tab");
  expect(m.update).not.toHaveBeenCalled();
});
test("empty catalog rejection is actionable", async () => {
  m.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({
      data: { id: "owned", slug: "site", status: "draft" },
      error: null,
    })
    .mockResolvedValue({ data: null, error: { code: "23514" } });
  expect((await setPublication({}, form())).error).toContain(
    "at least one product",
  );
  expect(m.revalidate).not.toHaveBeenCalled();
});
test("missing site does not mutate", async () => {
  m.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  expect((await setPublication({}, form())).error).toContain(
    "Create your website",
  );
  expect(m.update).not.toHaveBeenCalled();
});
test("authentication failure prevents writes", async () => {
  m.auth.mockRejectedValue(new Error("login"));
  await expect(setPublication({}, form())).rejects.toThrow("login");
  expect(m.from).not.toHaveBeenCalled();
});
test("unpublish uses the same ownership boundary", async () => {
  m.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({
      data: { id: "owned-site", slug: "site", status: "published" },
      error: null,
    })
    .mockResolvedValue({ data: { status: "draft" }, error: null });
  expect(
    (
      await setPublication(
        {},
        form({ status: "draft", expected_status: "published" }),
      )
    ).status,
  ).toBe("draft");
  expect(m.update).toHaveBeenCalledWith({ status: "draft" });
});
test("no-match mutation is not success", async () => {
  m.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({
      data: { id: "owned", slug: "site", status: "draft" },
      error: null,
    })
    .mockResolvedValue({ data: null, error: null });
  expect((await setPublication({}, form())).error).toContain(
    "could not be confirmed",
  );
});
