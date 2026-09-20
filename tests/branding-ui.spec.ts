import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
test("branding preview, save retry, defaults, discard and logo removal", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:3101/?scenario=branding");
  const preview = page.getByRole("complementary", { name: "Branding preview" });
  await page.getByLabel("Accent color", { exact: true }).fill("#166534");
  await page
    .getByLabel("Page background", { exact: true })
    .selectOption("mist");
  await page.getByLabel("Heading style", { exact: true }).selectOption("serif");
  await page
    .getByLabel("Hero headline (optional)", { exact: true })
    .fill("Good finds for slow living");
  await page
    .getByLabel("Hero introduction (optional)", { exact: true })
    .fill("Our favorite things, chosen with care.");
  await expect(
    preview.getByRole("heading", { name: "Good finds for slow living" }),
  ).toBeVisible();
  await expect(preview.locator(".storefront-browse")).toHaveCSS(
    "background-color",
    "rgb(22, 101, 52)",
  );
  await expect(preview.locator(".storefront-surface")).toHaveCSS(
    "background-color",
    "rgb(241, 245, 249)",
  );
  const logo = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#166534" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Website logo (optional)", { exact: true })
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logo });
  await expect(preview.locator(".storefront-logo")).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate next save failure" })
    .click();
  await page
    .getByRole("button", { name: "Save branding", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("upload failed");
  await expect(page.getByLabel("Page background", { exact: true })).toHaveValue(
    "mist",
  );
  await expect(page.getByLabel("Heading style", { exact: true })).toHaveValue(
    "serif",
  );
  await expect(preview.locator(".storefront-logo")).toBeVisible();
  await page
    .getByRole("button", { name: "Save branding", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Branding saved");
  await expect(page.getByTestId("saved-branding")).toContainText(
    '"heading_font":"serif"',
  );
  await page.getByRole("button", { name: "Use defaults", exact: true }).click();
  await expect(page.getByLabel("Accent color", { exact: true })).toHaveValue(
    "#2449c4",
  );
  await expect(preview.locator(".storefront-logo")).toHaveCount(0);
  await expect(page.getByTestId("saved-branding")).toContainText(
    '"accent_color":"#166534"',
  );
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByLabel("Accent color", { exact: true })).toHaveValue(
    "#166534",
  );
  await expect(preview.locator(".storefront-logo")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("branding-preview.png"),
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
  await page.getByLabel("Remove saved logo when saving").check();
  await page
    .getByRole("button", { name: "Save branding", exact: true })
    .click();
  await expect(page.getByTestId("saved-branding")).toContainText(
    '"logo_path":null',
  );
  await expect(preview.locator(".storefront-logo")).toHaveCount(0);
});
test("unreadable color and oversized logo are recoverable", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3101/?scenario=branding");
  await page.getByLabel("Accent color", { exact: true }).fill("#ffffff");
  await expect(page.getByRole("alert")).toContainText("darker accent");
  await expect(
    page.getByRole("button", { name: "Save branding", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Accent color", { exact: true }).fill("#9f1239");
  await page
    .getByLabel("Website logo (optional)", { exact: true })
    .setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(1024 * 1024 + 1),
    });
  await expect(page.getByRole("alert")).toContainText("1 MB");
  await page.getByRole("button", { name: "Clear selected logo" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save branding", exact: true }),
  ).toBeEnabled();
});
