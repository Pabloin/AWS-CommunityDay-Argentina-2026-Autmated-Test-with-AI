import { expect, test } from "@playwright/test";
import QRCode from "qrcode";
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
    await removeItem(item.id);
  }
});

test("Mobile lee una foto de etiqueta QR y recupera la ficha cloud", async ({ page, request }) => {
  const item = temporaryItem("Tablero electrico Playwright");
  await seedItem(request, item);

  try {
    const qrPng = await QRCode.toBuffer(`https://mobile-staging-v5.lens.glaciar.org/?item=${encodeURIComponent(item.id)}`, {
      margin: 1,
      width: 320,
      color: { dark: "#17251f", light: "#ffffff" }
    });

    await page.goto("/");
    await page.getByRole("button", { name: /Leer QR/ }).click();
    await page.locator(".secondary-action input[type=file]").setInputFiles({
      name: `${item.id}.png`,
      mimeType: "image/png",
      buffer: qrPng
    });

    await expect(page.locator(".detail-panel h2")).toHaveText(item.name);
    await expect(page.getByRole("region", { name: `Etiqueta QR de ${item.name}` })).toBeVisible();
  } finally {
    await removeItem(item.id);
  }
});
