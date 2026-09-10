export function publicItemUrl(publicAppUrl, itemId) {
  const url = new URL(publicAppUrl);
  url.searchParams.set("item", itemId);
  return url.toString();
}

export function parseBody(event) {
  if (!event.body) return {};
  const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(body);
}

export function pathParts(event) {
  return (event.rawPath ?? event.path ?? "/").split("/").filter(Boolean);
}

export function parseDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataUrl ?? "");
  if (!match) throw new Error("La imagen debe llegar como data URL png, jpeg o webp.");

  const format = match[1].toLowerCase().replace("jpg", "jpeg");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > 3_750_000) throw new Error("La imagen es demasiado grande para analizarla.");

  return { format, bytes, contentType: `image/${format}` };
}

export function extractText(output) {
  const content = output?.message?.content ?? [];
  return content.map((part) => part.text ?? "").join("\n").trim();
}

export function parseJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Bedrock no devolvio JSON.");
  return JSON.parse(raw.slice(start, end + 1));
}

export function normalizeSuggestion(parsed) {
  const checklist = Array.isArray(parsed.checklist) ? parsed.checklist.map(String).slice(0, 8) : [];
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [];

  return {
    name: String(parsed.name ?? "Objeto sin identificar").slice(0, 80),
    category: String(parsed.category ?? "Objeto").slice(0, 40),
    description: String(parsed.description ?? "").slice(0, 400),
    condition: String(parsed.condition ?? "Para revisar").slice(0, 80),
    qrLabel: String(parsed.qrLabel ?? "Etiqueta QR pendiente").slice(0, 80),
    locationHint: String(parsed.locationHint ?? "Galpon / caja").slice(0, 80),
    tags,
    checklist: checklist.length ? checklist : ["Foto principal", "Estado visible", "Descripcion revisada"]
  };
}

export function normalizeItem(input) {
  const price = Number(input.price ?? 0);
  return {
    name: String(input.name ?? "Objeto sin nombre").slice(0, 100),
    category: String(input.category ?? "Objeto").slice(0, 50),
    location: String(input.location ?? "Sin ubicacion").slice(0, 100),
    status: String(input.status ?? "review").slice(0, 30),
    price: Number.isFinite(price) ? price : 0,
    notes: String(input.notes ?? "").slice(0, 1200),
    checklist: Array.isArray(input.checklist) ? input.checklist.map(String).slice(0, 12) : [],
    checked: Array.isArray(input.checked) ? input.checked.map(String).slice(0, 12) : [],
    aiTags: Array.isArray(input.aiTags) ? input.aiTags.map(String).slice(0, 12) : []
  };
}
