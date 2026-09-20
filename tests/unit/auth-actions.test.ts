import { beforeEach, afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  updateUser: vi.fn(),
  from: vi.fn(),
  requireUser: vi.fn(),
  redirect: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/server/supabase/client", () => ({
  createClient: async () => ({ auth: mocks, from: mocks.from }),
}));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.requireUser }));
import {
  login,
  signup,
  forgotPassword,
  resetPassword,
  signout,
  updateAccount,
} from "@/app/auth/actions";
function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.requireUser.mockResolvedValue({
    supabase: { auth: mocks, from: mocks.from },
    user: { id: "verified-user-id" },
  });
});
afterEach(() => vi.unstubAllEnvs());
test("unconfigured login never contacts Supabase", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect(
    (await login({}, form({ email: "a@example.com", password: "password" })))
      .error,
  ).toBeTruthy();
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
});
test("invalid signup is rejected before contacting Auth", async () => {
  expect(
    (
      await signup(
        {},
        form({ name: "", email: "a@example.com", password: "short" }),
      )
    ).error,
  ).toBeTruthy();
  expect(mocks.signUp).not.toHaveBeenCalled();
});
test("login failure exposes neither provider errors nor account existence", async () => {
  mocks.signInWithPassword.mockResolvedValue({
    data: {},
    error: { message: "sensitive provider details" },
  });
  const result = await login(
    {},
    form({ email: "a@example.com", password: "incorrect" }),
  );
  expect(result.error).not.toContain("sensitive");
  expect(mocks.redirect).not.toHaveBeenCalled();
});
test("unconfirmed sessions cannot enter the dashboard", async () => {
  mocks.signInWithPassword.mockResolvedValue({
    data: { user: { email_confirmed_at: null }, session: {} },
    error: null,
  });
  expect(
    (await login({}, form({ email: "a@example.com", password: "password" })))
      .error,
  ).toBeTruthy();
  expect(mocks.signOut).toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
test("verified login redirects only to the allowlist", async () => {
  mocks.signInWithPassword.mockResolvedValue({
    data: { user: { email_confirmed_at: "date" }, session: {} },
    error: null,
  });
  await expect(
    login(
      {},
      form({
        email: "a@example.com",
        password: "password",
        next: "https://evil.test",
      }),
    ),
  ).rejects.toThrow("redirect:/dashboard");
});
test("signup uses configured email origin and stores display-only metadata", async () => {
  mocks.signUp.mockResolvedValue({ data: {}, error: null });
  const result = await signup(
    {},
    form({
      name: " Alice ",
      email: "a@example.com",
      password: "a long passphrase",
      account_id: "another-account",
    }),
  );
  expect(result.success).toBeTruthy();
  expect(mocks.signUp).toHaveBeenCalledWith({
    email: "a@example.com",
    password: "a long passphrase",
    options: {
      data: { display_name: "Alice" },
      emailRedirectTo: "http://localhost:3000/auth/confirm",
    },
  });
});
test("reset request returns the same message for unknown and existing emails", async () => {
  mocks.resetPasswordForEmail
    .mockResolvedValueOnce({ error: null })
    .mockResolvedValueOnce({ error: { code: "user_not_found" } });
  const first = await forgotPassword({}, form({ email: "a@example.com" }));
  const second = await forgotPassword({}, form({ email: "b@example.com" }));
  expect(first).toEqual(second);
});
test("password reset requires verified identity and matching passwords", async () => {
  expect(
    (
      await resetPassword(
        {},
        form({
          password: "a long passphrase",
          confirmPassword: "different value",
        }),
      )
    ).error,
  ).toBeTruthy();
  expect(mocks.requireUser).toHaveBeenCalled();
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
test("account mutation ignores submitted ownership", async () => {
  const single = vi
    .fn()
    .mockResolvedValue({ data: { id: "verified-user-id" }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ update });
  expect(
    (
      await updateAccount(
        {},
        form({ name: "Alice", id: "victim", account_id: "victim" }),
      )
    ).success,
  ).toBeTruthy();
  expect(eq).toHaveBeenCalledWith("id", "verified-user-id");
  expect(update).toHaveBeenCalledWith({ display_name: "Alice" });
});
test("failed signout does not claim success", async () => {
  mocks.signOut.mockResolvedValue({ error: { message: "offline" } });
  expect((await signout()).error).toBeTruthy();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
test("successful signout invalidates the router and returns to login", async () => {
  await expect(signout()).rejects.toThrow("redirect:/login");
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
