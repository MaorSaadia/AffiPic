import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("storefront filters, pagination, disclosure, external links and accessible layouts", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:3101/?scenario=public");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Everyday Edit",
  );
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(page.getByText(/creator may earn a commission/)).toBeVisible();
  await expect(page.locator(".storefront-card")).toHaveCount(12);
  const shop = page
    .getByRole("link", { name: /Shop at Favorite Store/ })
    .first();
  await expect(shop).toHaveAttribute("rel", "sponsored noopener noreferrer");
  await expect(shop).toHaveAttribute(
    "href",
    "https://shop.example/item?tag=creator",
  );
  await page.getByText("About this find", { exact: true }).first().click();
  await expect(page.locator("details[open]")).toContainText(
    "Thoughtfully chosen",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("public-storefront.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.locator(".storefront-card")).toHaveCount(3);
  await page.getByRole("link", { name: "Outdoors", exact: true }).click();
  await expect(page.locator(".storefront-card")).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Outdoors", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Coming finds", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No finds in this category yet." }),
  ).toBeVisible();
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("publication requires confirmation and supports cancellation, errors and unpublishing", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3101/?scenario=publishing");
  await expect(
    page.getByRole("link", { name: /Open public website/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Publish website", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish website", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm publish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to share your website?" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Simulate empty catalog" }).click();
  await page
    .getByRole("button", { name: "Confirm publish", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("at least one product");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm publish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your website is live" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open public website/ }),
  ).toHaveAttribute("href", "/s/the-everyday-edit");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "Unpublish website", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirm unpublish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready to share your website?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open public website/ }),
  ).toHaveCount(0);
});
test("invalid public routes return no-index unavailable pages without the creator shell", async ({
  page,
}) => {
  const response = await page.goto("/s/invalid--slug");
  expect(response?.status()).toBe(404);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  const image = await page.request.get("/s/invalid--slug/images/invalid");
  expect(image.status()).toBe(404);
  expect(image.headers()["cache-control"]).toContain("no-store");
});
