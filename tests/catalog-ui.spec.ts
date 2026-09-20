import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const kind of ["categories", "merchants"]) {
  test(
    kind + " create, duplicate, rename, cancel and confirm deletion",
    async ({ page }, testInfo) => {
      await page.goto("http://127.0.0.1:3101/?scenario=catalog&kind=" + kind);
      const singular = kind === "categories" ? "category" : "merchant";
      const create = page.getByRole("form", { name: "Add " + singular });
      await create.getByRole("textbox").fill("Home");
      await create.getByRole("textbox").press("Enter");
      const item = page.getByRole("form", { name: "Edit Home", exact: true });
      await expect(item).toBeVisible();
      await create.getByRole("textbox").fill("HOME");
      await create.getByRole("button").click();
      await expect(create.getByRole("alert")).toContainText("already exists");
      await expect(create.getByRole("textbox")).toHaveValue("HOME");
      await item.getByRole("textbox").fill("Living");
      await item.getByRole("button", { name: "Save name" }).click();
      const renamed = page.getByRole("form", {
        name: "Edit Living",
        exact: true,
      });
      await expect(renamed).toBeVisible();
      await renamed
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await renamed.getByRole("button", { name: "Cancel" }).click();
      await expect(
        renamed.getByRole("button", { name: "Confirm delete" }),
      ).toHaveCount(0);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(kind + ".png"),
        fullPage: true,
      });
      for (const width of [320, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
      await renamed
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await renamed.getByRole("button", { name: "Confirm delete" }).click();
      await expect(renamed).toHaveCount(0);
      await expect(
        page.getByText("No " + kind + " yet.", { exact: false }),
      ).toBeVisible();
    },
  );
}
