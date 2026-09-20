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
  ).toHaveAttribute("aria-valuenow", /^[01]$/);
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

test("product preview traps focus, disables saving, closes and restores focus", async ({
  page,
}) => {
  await page.goto("/dashboard/products");
  const trigger = page.getByRole("button", {
    name: "Add product",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add a product" });
  await expect(dialog).toBeVisible();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("My favorite find");
  await page
    .getByLabel("Affiliate URL", { exact: true })
    .fill("https://example.com/ref=test");
  await expect(
    page.getByRole("button", { name: "Save product" }),
  ).toBeDisabled();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);
  }
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Your next favorite find belongs here."),
  ).toBeVisible();
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
