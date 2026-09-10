import { expect, test } from "@playwright/test";
import { removeItem, seedItem, temporaryItem } from "./support";

test("Web encuentra el objeto y enlaza su ficha Mobile", async ({ page, request }) => {
  const item = temporaryItem("Manguera Playwright");
  await seedItem(request, item);

  try {
    await page.goto("/");
    await page.getByPlaceholder("Buscar por nombre, ubicación o categoría").fill(item.name);

    const card = page.locator(`[data-id="${item.id}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(item.location);
    await card.click();

    await expect(page.locator("#detail h2")).toHaveText(item.name);
    await expect(page.locator("#detail .notes")).toContainText("Layer 04");

    const qr = page.getByRole("img", { name: `QR de ${item.name}` });
    await expect(qr).toBeVisible();
    await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

    const mobileLink = page.getByRole("link", { name: /Abrir ficha móvil/ });
    await expect(mobileLink).toHaveAttribute("href", new RegExp(`item=${item.id}`));
  } finally {
    await removeItem(request, item.id);
  }
});
