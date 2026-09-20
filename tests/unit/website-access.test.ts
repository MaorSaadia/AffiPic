import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  eq: vi.fn(),
  result: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
import { getWebsite } from "@/lib/server/websites";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.eq.mockReturnValue({ maybeSingle: mocks.result });
  mocks.requireUser.mockResolvedValue({
    user: { id: "owner" },
    supabase: { from: () => ({ select: () => ({ eq: mocks.eq }) }) },
  });
});
test("an empty owned query means no website", async () => {
  mocks.result.mockResolvedValue({ data: null, error: null });
  expect(await getWebsite()).toBeNull();
  expect(mocks.eq).toHaveBeenCalledWith("account_id", "owner");
});
test("database failures never become a false empty state", async () => {
  mocks.result.mockResolvedValue({
    data: null,
    error: { message: "missing migration" },
  });
  await expect(getWebsite()).rejects.toThrow("could not be loaded");
});
test("the query cannot run without verified identity", async () => {
  mocks.requireUser.mockRejectedValue(new Error("unauthorized"));
  await expect(getWebsite()).rejects.toThrow("unauthorized");
  expect(mocks.result).not.toHaveBeenCalled();
});
