import { expect, type APIRequestContext } from "@playwright/test";

export const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "") ?? "";

export function temporaryItem(testName: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  return {
    id: `TEST-L3-E2E-${suffix}`,
    name: `${testName} ${suffix}`,
    category: "Seguridad",
    location: "Hall de staging",
    status: "labeled",
    notes: "Objeto temporal creado por Layer 04.",
    checklist: ["Etiqueta visible", "Ubicacion confirmada"],
    checked: ["Etiqueta visible"],
    aiTags: ["e2e", "playwright"],
    photos: []
  };
}

export async function seedItem(request: APIRequestContext, item: ReturnType<typeof temporaryItem>) {
  const response = await request.post(`${apiBaseUrl}/items`, { data: item });
  expect(response.status(), await response.text()).toBe(201);
}

export async function removeItem(itemId: string) {
  const response = await fetch(`${apiBaseUrl}/test-support/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE"
  });
  expect([200, 404]).toContain(response.status);
}
