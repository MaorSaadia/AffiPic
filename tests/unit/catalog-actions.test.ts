import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveCatalog } from "@/app/(dashboard)/dashboard/catalog-actions";
function form(extra: Record<string, string> = {}) {
  const values = new FormData();
  Object.entries({
    kind: "categories",
    operation: "create",
    name: "Home",
    ...extra,
  }).forEach(([key, value]) => values.set(key, value));
  return values;
}
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: mocks.select,
    eq: mocks.eq,
    maybeSingle: mocks.maybeSingle,
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.delete,
  };
  for (const method of [
    mocks.from,
    mocks.select,
    mocks.eq,
    mocks.insert,
    mocks.update,
    mocks.delete,
  ])
    method.mockReturnValue(query);
  mocks.requireUser.mockResolvedValue({
    user: { id: "verified-owner" },
    supabase: { from: mocks.from },
  });
  mocks.maybeSingle
    .mockResolvedValueOnce({ data: { id: "owned-site" }, error: null })
    .mockResolvedValue({ data: { id: "saved-item" }, error: null });
});

test("create ignores submitted website ownership", async () => {
  expect((await saveCatalog({}, form({ website_id: "foreign" }))).success).toBe(
    "Saved.",
  );
  expect(mocks.eq).toHaveBeenCalledWith("account_id", "verified-owner");
  expect(mocks.insert).toHaveBeenCalledWith({
    website_id: "owned-site",
    name: "Home",
  });
});
test.each(["update", "delete"])(
  "%s scopes the item to the verified website",
  async (operation) => {
    await saveCatalog(
      {},
      form({
        operation,
        id: "00000000-0000-4000-8000-000000000001",
        website_id: "foreign",
      }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("website_id", "owned-site");
  },
);
test("missing website cannot mutate", async () => {
  mocks.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  expect((await saveCatalog({}, form())).error).toContain(
    "Create your website",
  );
  expect(mocks.insert).not.toHaveBeenCalled();
});
test("foreign or stale item is not reported as success", async () => {
  mocks.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({ data: { id: "owned-site" }, error: null })
    .mockResolvedValue({ data: null, error: null });
  expect(
    (
      await saveCatalog(
        {},
        form({
          operation: "delete",
          id: "00000000-0000-4000-8000-000000000001",
        }),
      )
    ).error,
  ).toContain("unavailable");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
test.each<Record<string, string>>([
  { kind: "accounts" },
  { operation: "invalid" },
  { name: " " },
  { name: "a".repeat(81) },
  { operation: "update", id: "invalid" },
])("rejects invalid input %j", async (input) => {
  expect((await saveCatalog({}, form(input))).error).toBeTruthy();
  expect(mocks.from).not.toHaveBeenCalled();
});
test("duplicate is actionable", async () => {
  mocks.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({ data: { id: "owned-site" }, error: null })
    .mockResolvedValue({ data: null, error: { code: "23505" } });
  expect((await saveCatalog({}, form())).error).toContain("already exists");
});
test("authentication failure prevents writes", async () => {
  mocks.requireUser.mockRejectedValue(new Error("unauthenticated"));
  await expect(saveCatalog({}, form())).rejects.toThrow("unauthenticated");
  expect(mocks.from).not.toHaveBeenCalled();
});
