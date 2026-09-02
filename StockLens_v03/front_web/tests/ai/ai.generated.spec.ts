import { test, expect } from '@playwright/test';

test('StockLens app shell loads with inventory items and hero section', async ({ page }) => {
  await page.goto('/');

  // Verify hero section is visible
  const hero = page.locator('.hero');
  await expect(hero).toBeVisible();

  // Verify hero heading exists
  const heading = hero.locator('h1');
  await expect(heading).toBeVisible();

  // Verify hero description text
  const description = hero.locator('p');
  await expect(description).toBeVisible();

  // Verify workspace layout is present
  const workspace = page.locator('.workspace');
  await expect(workspace).toBeVisible();

  // Verify inventory panel exists
  const inventoryPanel = page.locator('.inventory-panel');
  await expect(inventoryPanel).toBeVisible();

  // Verify detail panel exists
  const detailPanel = page.locator('.detail-panel');
  await expect(detailPanel).toBeVisible();

  // Verify ops panel exists
  const opsPanel = page.locator('.ops-panel');
  await expect(opsPanel).toBeVisible();

  // Verify starter items are loaded in the inventory list
  const itemList = page.locator('.item-list');
  await expect(itemList).toBeVisible();

  const itemRows = page.locator('.item-row');
  const itemCount = await itemRows.count();
  expect(itemCount).toBeGreaterThan(0);

  // Verify first item is selectable and displays content
  const firstItem = itemRows.first();
  await expect(firstItem).toBeVisible();
  const itemName = firstItem.locator('strong').first();
  await expect(itemName).toHaveText(/Matafuego|Credenciales/);

  // Click first item to select it
  await firstItem.click();
  await expect(firstItem).toHaveClass(/selected/);

  // Verify detail panel shows selected item information
  const detailHeading = detailPanel.locator('h2').first();
  await expect(detailHeading).toBeVisible();

  // Verify stock card is displayed
  const stockCard = page.locator('.stock-card');
  await expect(stockCard).toBeVisible();

  const stockQuantity = stockCard.locator('strong');
  await expect(stockQuantity).toBeVisible();
  const quantityText = await stockQuantity.textContent();
  expect(quantityText).toMatch(/\d+/);

  // Verify QR box is displayed
  const qrBox = page.locator('.qr-box');
  await expect(qrBox).toBeVisible();

  // Verify QR image or placeholder exists
  const qrImage = qrBox.locator('img, .qr-placeholder');
  await expect(qrImage).toBeVisible();

  // Verify notes card is displayed
  const notesCard = page.locator('.notes-card');
  await expect(notesCard).toBeVisible();

  // Verify search functionality exists
  const searchField = page.locator('.search-field input');
  await expect(searchField).toBeVisible();

  // Test search by typing in search field
  await searchField.fill('Matafuego');
  await page.waitForTimeout(300);

  const filteredItems = page.locator('.item-row');
  const filteredCount = await filteredItems.count();
  expect(filteredCount).toBeGreaterThan(0);

  // Verify filtered item contains search term
  const firstFilteredItem = filteredItems.first();
  const filteredItemText = await firstFilteredItem.textContent();
  expect(filteredItemText?.toLowerCase()).toContain('matafuego');

  // Clear search
  await searchField.clear();
  await page.waitForTimeout(300);

  // Verify items are restored
  const restoredItems = page.locator('.item-row');
  const restoredCount = await restoredItems.count();
  expect(restoredCount).toBeGreaterThanOrEqual(itemCount);

  // Verify hero metrics section exists
  const heroMetrics = page.locator('.hero-metrics');
  await expect(heroMetrics).toBeVisible();

  const metricDivs = heroMetrics.locator('div');
  const metricCount = await metricDivs.count();
  expect(metricCount).toBeGreaterThan(0);

  // Verify metric values are displayed
  const metricValue = metricDivs.first().locator('strong');
  await expect(metricValue).toBeVisible();
  const metricText = await metricValue.textContent();
  expect(metricText).toMatch(/\d+/);
});
