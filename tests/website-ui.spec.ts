import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const fixture = "http://127.0.0.1:3101";
test("website form suggests a slug, keeps a custom address, and shows draft success", async ({
  page,
}, testInfo) => {
  await page.goto(fixture);
  await page
    .getByLabel("Website name", { exact: true })
    .fill("The Everyday Edit");
  await expect(page.getByLabel("Website address", { exact: true })).toHaveValue(
    "the-everyday-edit",
  );
  await page
    .getByLabel("Website address", { exact: true })
    .fill("my-custom-picks");
  await page
    .getByLabel("Website name", { exact: true })
    .fill("My favorite finds");
  await expect(page.getByLabel("Website address", { exact: true })).toHaveValue(
    "my-custom-picks",
  );
  await page
    .getByLabel("Description", { exact: false })
    .fill("Useful things, thoughtfully chosen.");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("website-create.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create website", exact: true })
    .click();
  await expect(
    page.getByText("Your website has been created as a private draft.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Draft · Not published", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /\/s\// })).toHaveCount(0);
});
test("duplicate slug errors preserve entered fields", async ({ page }) => {
  await page.goto(`${fixture}?scenario=duplicate`);
  await page.getByLabel("Website name", { exact: true }).fill("Still my draft");
  await page
    .getByLabel("Description", { exact: false })
    .fill("Keep these words.");
  await page
    .getByRole("button", { name: "Create website", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.getByLabel("Website name", { exact: true })).toHaveValue(
    "Still my draft",
  );
  await expect(page.getByLabel("Description", { exact: false })).toHaveValue(
    "Keep these words.",
  );
  await expect(page.getByText("Not created", { exact: true })).toBeVisible();
});
test("existing draft supports keyboard editing and responsive accessible layout", async ({
  page,
}, testInfo) => {
  await page.goto(`${fixture}?scenario=existing`);
  await page.getByLabel("Website name", { exact: true }).fill("Updated edit");
  await page.getByRole("button", { name: "Save changes", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Your website details have been saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Website address", { exact: true })).toHaveValue(
    "the-everyday-edit",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("website-draft.png"),
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
});
