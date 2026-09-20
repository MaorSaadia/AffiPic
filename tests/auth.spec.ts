import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("every dashboard destination denies unauthenticated access", async ({
  page,
}) => {
  for (const path of [
    "/dashboard",
    "/dashboard/products",
    "/dashboard/categories",
    "/dashboard/merchants",
    "/dashboard/collections",
    "/dashboard/guides",
    "/dashboard/settings",
    "/dashboard/analytics",
    "/dashboard/billing",
    "/dashboard/account",
    "/reset-password",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toHaveCount(0);
  }
});
test("login, signup, recovery, and confirmation screens work on desktop and mobile", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await expect(page).toHaveTitle("Sign in | AffiPic");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Forgot your password?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await page.getByRole("link", { name: "Resend confirmation email" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("bad confirmation links have a recoverable error and do not redirect externally", async ({
  page,
}) => {
  for (const url of [
    "/auth/confirm",
    "/auth/confirm?token_hash=invalid&type=admin&next=https://evil.test",
  ]) {
    const response = await page.goto(url);
    await expect(page).toHaveURL(/\/auth\/error$/);
    await expect(
      page.getByRole("heading", { name: "This link is no longer available." }),
    ).toBeVisible();
    expect(response?.headers()["cache-control"]).toContain("no-store");
  }
});
test("forged browser cookies do not grant dashboard access", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "sb-fake-auth-token",
      value: "base64-forged-session",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/dashboard/account");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Your account" })).toHaveCount(
    0,
  );
});
test("unconfigured build explains unavailable account access", async ({
  page,
}) => {
  test.skip(
    !!process.env.E2E_EMAIL,
    "The configured integration suite verifies real sign in instead.",
  );
  await page.goto("/login");
  const notice = page.getByText(
    "Account access is being set up. Please check back soon.",
  );
  if ((await notice.count()) === 0)
    test.skip(
      true,
      "Supabase is configured; no-configuration branch does not apply.",
    );
  await expect(notice).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
});
test("configured account persists through reload and signs out", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Requires confirmed Supabase test-account credentials.",
  );
  await page.goto("/login?next=/dashboard/account");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/account$/);
  await expect(
    page.getByText(process.env.E2E_EMAIL!, { exact: true }).last(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your account", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard/account");
  await expect(page).toHaveURL(/\/login/);
});
