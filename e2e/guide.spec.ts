import { expect, test } from "@playwright/test";

test("Guide stays on /guide instead of dashboard", async ({ page }) => {
  await page.goto("/guide");
  await expect(page).toHaveURL(/\/guide$/);
  await expect(
    page.getByRole("heading", { name: "MapleCompile guide" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start with Character Search" }),
  ).toBeVisible();
});

test("home links into Guide", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Read the Guide" }).click();
  await expect(page).toHaveURL(/\/guide$/);
});
