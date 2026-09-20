import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Requires a configured Supabase test project and a confirmed E2E account.",
  );
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("navigation reaches every page and keeps an accessible active state", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Good things start here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Website setup" }),
  ).toHaveAttribute("aria-valuenow", /^[0-4]$/);
  for (const title of [
    "Products",
    "Categories",
    "Merchants",
    "Collections",
    "Guides",
    "Website Settings",
    "Analytics",
    "Billing",
    "Overview",
  ]) {
    if (isMobile)
      await page.getByRole("button", { name: "Open navigation" }).click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByRole("link", { name: title, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      title === "Overview" ? "Good things start here." : title,
    );
    if (isMobile) {
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await expect(
      nav.getByRole("link", { name: title, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    if (isMobile) await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("overview accessibility and narrow layouts", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("overview.png"),
    fullPage: true,
  });
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/dashboard/not-a-feature");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
