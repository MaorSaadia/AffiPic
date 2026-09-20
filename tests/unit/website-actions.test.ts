import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import {
  createWebsite,
  updateWebsite,
} from "@/app/(dashboard)/dashboard/settings/actions";
const draft = {
  id: "owned-site",
  name: "My picks",
  slug: "my-picks",
  description: "Favorite finds",
  status: "draft",
  created_at: "date",
  updated_at: "date",
};
function form(extra: Record<string, string> = {}) {
  const values = new FormData();
  Object.entries({
    name: draft.name,
    slug: draft.slug,
    description: draft.description,
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
    single: mocks.single,
    insert: mocks.insert,
    update: mocks.update,
  };
  for (const method of [
    mocks.from,
    mocks.select,
    mocks.eq,
    mocks.insert,
    mocks.update,
  ])
    method.mockReturnValue(query);
  mocks.requireUser.mockResolvedValue({
    user: { id: "verified-owner" },
    supabase: { from: mocks.from },
  });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.single.mockResolvedValue({ data: draft, error: null });
});
test("creation derives ownership and ignores submitted identity/status", async () => {
  const result = await createWebsite(
    {},
    form({ account_id: "victim", id: "victim-site", status: "published" }),
  );
  expect(mocks.requireUser).toHaveBeenCalled();
  expect(mocks.eq).toHaveBeenCalledWith("account_id", "verified-owner");
  expect(mocks.insert).toHaveBeenCalledWith({
    name: draft.name,
    slug: draft.slug,
    description: draft.description,
  });
  expect(result.website).toEqual(draft);
  expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
});
test("editing targets the website loaded for the verified account", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: { id: "owned-site" },
    error: null,
  });
  expect(
    (await updateWebsite({}, form({ id: "victim-site" }))).success,
  ).toBeTruthy();
  expect(mocks.eq).toHaveBeenCalledWith("id", "owned-site");
  expect(mocks.eq).toHaveBeenCalledWith("account_id", "verified-owner");
});
test("unauthenticated requests never query or write data", async () => {
  mocks.requireUser.mockRejectedValue(new Error("redirect:/login"));
  await expect(createWebsite({}, form())).rejects.toThrow("redirect:/login");
  expect(mocks.from).not.toHaveBeenCalled();
});
test("invalid fields do not reach the database", async () => {
  const result = await createWebsite({}, form({ slug: "admin", name: "" }));
  expect(result.fieldErrors?.slug).toBeTruthy();
  expect(result.fieldErrors?.name).toBeTruthy();
  expect(mocks.from).not.toHaveBeenCalled();
});
test("an existing website prevents repeated creation", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: { id: "owned-site" },
    error: null,
  });
  expect((await createWebsite({}, form())).error).toContain("already");
  expect(mocks.insert).not.toHaveBeenCalled();
});
test("missing website cannot be updated", async () => {
  expect((await updateWebsite({}, form())).error).toContain("Create");
  expect(mocks.update).not.toHaveBeenCalled();
});
test("lookup failures never trigger fallback creation", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: "missing table" },
  });
  expect((await createWebsite({}, form())).error).toBeTruthy();
  expect(mocks.insert).not.toHaveBeenCalled();
});
test.each(["23505", "42501", "42P01"])(
  "database error %s is handled without success or raw details",
  async (code) => {
    mocks.single.mockResolvedValue({
      data: null,
      error: { code, message: "sensitive database details" },
    });
    const result = await createWebsite({}, form());
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("sensitive");
    expect(result.success).toBeUndefined();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  },
);
test("zero-row updates cannot report a save", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: { id: "owned-site" },
    error: null,
  });
  mocks.single.mockResolvedValue({ data: null, error: null });
  expect((await updateWebsite({}, form())).error).toBeTruthy();
});
test("network errors keep a retryable message", async () => {
  mocks.single.mockRejectedValue(new Error("offline"));
  expect((await createWebsite({}, form())).error).toContain("try again");
});
