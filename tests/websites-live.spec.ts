import { test, expect } from "@playwright/test";
// Runs only with dedicated Supabase fixture credentials. Creates a draft if missing;
// existing drafts receive same-value saves so the test does not overwrite their content.
test("website creation or editing persists and updates overview without publishing", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Run live writes once against the shared fixture account; mobile form behavior is covered by isolated UI tests.",
  );
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Requires configured Supabase and a confirmed fixture account.",
  );
  await page.goto("/login?next=/dashboard/settings");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  const create = page.getByRole("button", {
    name: "Create website",
    exact: true,
  });
  if (await create.count()) {
    await page
      .getByLabel("Website name", { exact: true })
      .fill("My test website");
    await page
      .getByLabel("Website address", { exact: true })
      .fill(`test-site-${Date.now()}`);
    await create.click();
  } else {
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
  const name = await page
    .getByLabel("Website name", { exact: true })
    .inputValue();
  const slug = await page
    .getByLabel("Website address", { exact: true })
    .inputValue();
  await page.reload();
  await expect(page.getByLabel("Website name", { exact: true })).toHaveValue(
    name,
  );
  await expect(page.getByLabel("Website address", { exact: true })).toHaveValue(
    slug,
  );
  await expect(
    page.getByText("Draft · Not published", { exact: true }).last(),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("progressbar", { name: "Website setup" }),
  ).toHaveAttribute("aria-valuenow", /^[1-4]$/);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const publicResponse = await page.goto(`/s/${slug}`);
  expect(publicResponse?.status()).toBe(404);
});
