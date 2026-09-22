import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: unknown[]) => void } },
  ) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          {
            name: "refreshed",
            value: "session-cookie",
            options: { path: "/", httpOnly: true },
          },
        ]);
        return mocks.getUser();
      },
    },
  }),
}));
import { proxy } from "@/proxy";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
});
afterEach(() => vi.unstubAllEnvs());
test.each(["/dashboard/account", "/designer"])(
  "preserves cookies and private cache headers on redirect from %s",
  async (path) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await proxy(
      new NextRequest("https://affipic.test" + path),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://affipic.test/login?next=" + encodeURIComponent(path),
    );
    expect(response.cookies.get("refreshed")?.value).toBe("session-cookie");
    expect(response.headers.get("cache-control")).toContain("no-store");
  },
);
test("confirmed users continue with refreshed cookies", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { email_confirmed_at: "date", is_anonymous: false } },
    error: null,
  });
  const response = await proxy(
    new NextRequest("https://affipic.test/dashboard"),
  );
  expect(response.status).toBe(200);
  expect(response.cookies.get("refreshed")?.value).toBe("session-cookie");
  expect(response.headers.get("cache-control")).toContain("private");
});
test("Auth network failures deny access", async () => {
  mocks.getUser.mockRejectedValue(new Error("offline"));
  expect(
    (await proxy(new NextRequest("https://affipic.test/dashboard"))).status,
  ).toBe(307);
});
test("anonymous Auth identities cannot enter the creator dashboard", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { email_confirmed_at: "date", is_anonymous: true } },
    error: null,
  });
  expect(
    (await proxy(new NextRequest("https://affipic.test/dashboard"))).status,
  ).toBe(307);
});

test("public routes never inspect or refresh creator sessions", async () => {
  mocks.getUser.mockClear();
  const response = await proxy(
    new NextRequest("https://affipic.test/s/my-site"),
  );
  expect(mocks.getUser).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.cookies.getAll()).toEqual([]);
});
