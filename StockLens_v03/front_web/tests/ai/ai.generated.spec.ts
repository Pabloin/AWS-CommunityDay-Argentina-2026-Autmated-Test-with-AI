import { test, expect } from "@playwright/test";

test("StockLens loads the main dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/StockLens|Inventario|Activos/i);
});
