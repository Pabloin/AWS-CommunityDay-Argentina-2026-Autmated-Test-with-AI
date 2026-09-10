import { expect, test } from "@playwright/test";
import { removeItem, seedItem, temporaryItem } from "./support";

test("Mobile abre una ficha vinculada y genera su etiqueta QR", async ({ page, request }) => {
  const item = temporaryItem("Matafuego Playwright");
  await seedItem(request, item);

  try {
    await page.goto(`/?item=${encodeURIComponent(item.id)}`);

    await expect(page.getByRole("img", { name: "StockLens" })).toBeVisible();
    await expect(page.locator(".detail-panel h2")).toHaveText(item.name);
    await expect(page.locator(".detail-head")).toContainText(item.location);
    await expect(page.locator(".detail-head")).toContainText(item.id);

    const qrCard = page.getByRole("region", { name: `Etiqueta QR de ${item.name}` });
    await expect(qrCard).toBeVisible();
    await expect(qrCard.getByRole("img", { name: `QR ${item.name}` })).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(qrCard.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute("href", new RegExp(`item=${item.id}`));

    await page.getByRole("button", { name: /Volver al inventario/ }).click();
    await page.getByPlaceholder("Buscar objeto o ubicación").fill(item.name);
    await expect(page.locator(".item-list")).toContainText(item.name);
  } finally {
    await removeItem(request, item.id);
  }
});
