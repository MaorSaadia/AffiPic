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
test("designer draft persists, stays off live output, and publishes the preview", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:3101/?scenario=designer");
  const preview = page.frameLocator('iframe[title="Website design preview"]');
  await preview
    .getByRole("button", { name: "Edit Introduction", exact: true })
    .click();
  await page.getByLabel("Heading", { exact: true }).fill("My new homepage");
  await expect(
    preview.locator(".storefront-hero-title", { hasText: "My new homepage" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Add section", exact: true })
    .selectOption("text");
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await page.getByLabel("Heading", { exact: true }).fill("Chosen with care");
  await page
    .getByLabel("Text", { exact: true })
    .fill("Our favorite everyday finds.");
  await page.getByRole("button", { name: "Move Text up", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "live website is unchanged",
  );
  await page.reload();
  await expect(
    preview.locator("h2", { hasText: "Chosen with care" }),
  ).toBeVisible();
  const live = await context.newPage();
  await live.goto("http://127.0.0.1:3101/?scenario=designer-live");
  await expect(
    live.getByRole("heading", { name: "The Everyday Edit", exact: true }),
  ).toBeVisible();
  await expect(live.getByText("Chosen with care")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Design published");
  await live.reload();
  await expect(
    live.getByRole("heading", { name: "My new homepage" }),
  ).toBeVisible();
  await expect(
    live.getByRole("heading", { name: "Chosen with care" }),
  ).toBeVisible();
  await expect(live.locator(".designer-selection")).toHaveCount(0);
  await expect(
    live.getByRole("link", { name: /Shop with merchant/ }),
  ).toHaveAttribute("rel", "sponsored noopener noreferrer");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  expect(
    await preview
      .locator("body")
      .evaluate(
        (body) =>
          body.scrollWidth <= body.ownerDocument.documentElement.clientWidth,
      ),
  ).toBe(true);
});
