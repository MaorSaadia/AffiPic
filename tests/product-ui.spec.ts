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

test("AI review, failure and apply preserve manual edits without saving", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/__fixture/ai-allowance", (route) =>
    route.fulfill({
      json: { enabled: true, remaining: 10, resetAt: "2026-09-25T00:00:00Z" },
    }),
  );
  await page.route("**/__fixture/ai-generate", async (route) => {
    calls++;
    expect(route.request().postDataJSON().productId).toBeNull();
    expect(route.request().postDataJSON()).not.toHaveProperty("affiliate_url");
    await route.fulfill({
      json:
        calls === 1
          ? {
              description:
                "An adjustable reading lamp with three brightness settings.",
              remaining: 9,
            }
          : {
              error:
                "The AI provider is rate limited. Your allowance was not used.",
              remaining: 9,
            },
    });
  });
  await page.goto("http://127.0.0.1:3101/?scenario=products-ai");
  await page.getByLabel("Product name", { exact: true }).fill("Reading lamp");
  const original = "Adjustable arm with three brightness settings.";
  await page
    .getByLabel("Description (optional)", { exact: true })
    .fill(original);
  const dialog = page.getByRole("region", { name: "AI writing assistant" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(dialog.getByLabel("Product facts and features")).toHaveValue("");
  await dialog.getByLabel("Product facts and features").fill(original);
  await expect(dialog).toContainText("10 successful generations remaining");
  await dialog.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(dialog.getByLabel("Edit suggestion")).toContainText(
    "adjustable reading lamp",
  );
  await expect(
    page.getByLabel("Description (optional)", { exact: true }),
  ).toHaveValue(original);
  await dialog.getByRole("button", { name: "Regenerate", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("rate limited");
  await expect(dialog).toContainText("9 successful generations remaining");
  await expect(
    page.getByLabel("Description (optional)", { exact: true }),
  ).toHaveValue(original);
  await dialog.getByLabel("Edit suggestion").fill("My reviewed description.");
  await dialog
    .getByRole("button", { name: "Apply to description", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await expect(
    page.getByLabel("Description (optional)", { exact: true }),
  ).toHaveValue("My reviewed description.");
  await expect(
    page.getByRole("heading", { name: "Add a product", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Product saved.", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Undo AI replacement" }).click();
  await expect(
    page.getByLabel("Description (optional)", { exact: true }),
  ).toHaveValue(original);
  await dialog
    .getByRole("button", { name: "Apply to description", exact: true })
    .click();
  await dialog
    .getByLabel("Product facts and features")
    .fill("Discard these local edits to the facts.");
  await dialog.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(
    page.getByLabel("Description (optional)", { exact: true }),
  ).toHaveValue("My reviewed description.");
  expect(calls).toBe(2);
});

test("AI image assistance is opt-in, formatting saves and preferences persist", async ({
  page,
}, testInfo) => {
  let calls = 0;
  await page.route("**/__fixture/ai-allowance", (route) =>
    route.fulfill({ json: { enabled: true, remaining: 10 } }),
  );
  await page.route("**/__fixture/ai-generate", async (route) => {
    calls++;
    const input = route.request().postDataJSON();
    expect(input.name).toBe("Blue tray");
    expect(input.useImage).toBe(true);
    expect(input.hasUploadedImage).toBe(true);
    expect(input.format).toBe("Bullet points");
    expect(input.length).toBe("Detailed");
    await route.fulfill({
      json: {
        remaining: 9,
        description:
          "## A blue tray\n\nA **blue** design with a *round* shape.\n\n- Blue color\n- Round shape\n\n1. View the details\n2. Explore this product",
      },
    });
  });
  await page.goto("http://127.0.0.1:3101/?scenario=products-ai");
  await page.getByLabel("Product name", { exact: true }).fill("Blue tray");
  await page
    .getByLabel("Affiliate URL", { exact: true })
    .fill("https://shop.example/tray?tag=mine");
  const bytes = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#304080" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Product image (optional)", { exact: true })
    .setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: bytes });
  const ai = page.getByRole("region", { name: "AI writing assistant" });
  await expect(
    ai.getByRole("checkbox", { name: "Use this image" }),
  ).not.toBeChecked();
  expect(calls).toBe(0);
  await ai.getByRole("checkbox", { name: "Use this image" }).check();
  await ai.getByLabel("Style preset").selectOption("detailed");
  await ai.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(ai.getByLabel("Edit suggestion")).toContainText(
    "## A blue tray",
  );
  await ai.getByRole("button", { name: "Apply to description" }).click();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  const saved = page.getByRole("region", { name: "Saved public description" });
  await expect(
    saved.getByRole("heading", { name: "A blue tray" }),
  ).toBeVisible();
  await expect(saved.locator("strong")).toHaveText("blue");
  await expect(saved.locator("em")).toHaveText("round");
  await expect(saved.locator("ul li")).toHaveCount(2);
  await expect(saved.locator("ol li")).toHaveCount(2);
  await expect(page.locator(".product-card-description")).not.toContainText(
    "affipic:",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("inline-product-workspace.png"),
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByLabel("Length", { exact: true })).toHaveValue(
    "Detailed",
  );
  await expect(
    page.getByRole("checkbox", { name: "Use this image" }),
  ).not.toBeChecked();
  expect(calls).toBe(1);
});
