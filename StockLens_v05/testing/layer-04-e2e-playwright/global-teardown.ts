const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "") ?? "";

export default async function globalTeardown() {
  if (!apiBaseUrl) return;

  const response = await fetch(`${apiBaseUrl}/items`);
  if (!response.ok) throw new Error(`No se pudo listar items E2E para limpiar: ${response.status}`);

  const payload = (await response.json()) as { items?: Array<{ id?: string }> };
  const temporaryIds = (payload.items ?? [])
    .map((item) => item.id ?? "")
    .filter((id) => id.startsWith("TEST-L3-E2E-"));

  for (const itemId of temporaryIds) {
    const cleanup = await fetch(`${apiBaseUrl}/test-support/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE"
    });
    if (!cleanup.ok && cleanup.status !== 404) {
      throw new Error(`No se pudo limpiar ${itemId}: ${cleanup.status}`);
    }
  }
}
