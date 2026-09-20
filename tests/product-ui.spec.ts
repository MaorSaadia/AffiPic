import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
test("product creation, upload retry, editing, image removal and deletion", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:3101/?scenario=products");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("A favorite lamp");
  await page
    .getByLabel("Description (optional)", { exact: true })
    .fill("A warm light for reading.");
  await page
    .getByLabel("Affiliate URL", { exact: true })
    .fill("https://shop.example/lamp?tag=mine");
  await page
    .getByLabel("Category (optional)", { exact: true })
    .selectOption({ label: "Home" });
  await page
    .getByLabel("Merchant (optional)", { exact: true })
    .selectOption({ label: "Home" });
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#3455cc" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Product image (optional)", { exact: true })
    .setInputFiles({ name: "lamp.png", mimeType: "image/png", buffer: image });
  await expect(page.getByAltText("Product image preview")).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate next save failure" })
    .click();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("upload failed");
  await expect(
    page.getByLabel("Category (optional)", { exact: true }),
  ).toHaveValue("00000000-0000-4000-8000-000000000001");
  await expect(
    page.getByLabel("Merchant (optional)", { exact: true }),
  ).toHaveValue("00000000-0000-4000-8000-000000000001");
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(
    "A favorite lamp",
  );
  await expect(page.getByAltText("Product image preview")).toBeVisible();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Product saved");
  await expect(
    page.getByRole("heading", { name: "Edit product", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "A favorite lamp", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Visit merchant/ }),
  ).toHaveAttribute("href", "https://shop.example/lamp?tag=mine");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("My reading lamp");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My reading lamp", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Category (optional)", { exact: true }),
  ).toHaveValue("00000000-0000-4000-8000-000000000001");
  await expect(
    page.getByLabel("Merchant (optional)", { exact: true }),
  ).toHaveValue("00000000-0000-4000-8000-000000000001");
  await page
    .getByRole("button", { name: "Delete product", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm delete" }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("product-editor.png"),
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
  await page.getByLabel("Remove saved image when saving").check();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "My reading lamp", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Product name", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Delete product", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(
    page.getByRole("heading", { name: "Product deleted", exact: true }),
  ).toBeVisible();
});
test("oversized image can be cleared without losing product inputs", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3101/?scenario=products");
  await page.getByLabel("Product name", { exact: true }).fill("Saved input");
  await page
    .getByLabel("Product image (optional)", { exact: true })
    .setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
  await expect(page.getByRole("alert")).toContainText("2 MB");
  await page.getByRole("button", { name: "Clear selected image" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(
    "Saved input",
  );
});
