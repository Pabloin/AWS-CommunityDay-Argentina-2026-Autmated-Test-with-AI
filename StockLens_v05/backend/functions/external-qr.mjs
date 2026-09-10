const allowedHosts = new Set(["instalaciones.agcontrol.gob.ar"]);
const maxHtmlBytes = 900_000;

function cleanText(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(Number.parseInt(hex ?? decimal, hex ? 16 : 10)))
    .replace(/\s+/g, " ")
    .trim();
}

function clipped(value, limit) {
  return cleanText(value).slice(0, limit);
}

function compactHtml(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ");
}

function isPrivateFact(label) {
  return /\b(cuit|cuil|dni|tel[eé]fono|domicilio|raz[oó]n social|correo|e-?mail)\b/i.test(label);
}

function cleanLabel(value) {
  return clipped(value, 80).replace(/\s*:\s*$/, "").trim();
}

function labelValuePairs(html) {
  const pairs = [];
  const seen = new Set();
  const rowPattern = /<(?:div|tr|li|p|section)[^>]*>([\s\S]{0,2500}?)<\/(?:div|tr|li|p|section)>/gi;
  let row;
  while ((row = rowPattern.exec(html)) && pairs.length < 18) {
    const text = cleanText(row[1]);
    const match = /^(.{2,80}?)\s*[:\-]\s*(.{2,220})$/.exec(text);
    if (!match) continue;
    const label = cleanLabel(match[1]);
    const value = clipped(match[2], 220);
    const key = `${label.toLowerCase()}|${value.toLowerCase()}`;
    if (seen.has(key) || isPrivateFact(label) || /^(inicio|volver|menu|copyright)$/i.test(label)) continue;
    seen.add(key);
    pairs.push({ label, value });
  }

  // Algunas páginas usan <label> y <span> sin dos puntos visibles.
  const labelPattern = /<label[^>]*>([\s\S]{1,300}?)<\/label>[\s\S]{0,600}?<(?:span|strong|p|div)[^>]*>([\s\S]{1,600}?)<\/(?:span|strong|p|div)>/gi;
  let match;
  while ((match = labelPattern.exec(html)) && pairs.length < 18) {
    const label = cleanLabel(match[1]);
    const value = clipped(match[2], 220);
    const key = `${label.toLowerCase()}|${value.toLowerCase()}`;
    if (!label || !value || isPrivateFact(label) || seen.has(key)) continue;
    seen.add(key);
    pairs.push({ label, value });
  }
  return pairs;
}

function pageTitle(html) {
  const heading = /<h1[^>]*>([\s\S]{1,500}?)<\/h1>/i.exec(html)?.[1] ?? /<title[^>]*>([\s\S]{1,500}?)<\/title>/i.exec(html)?.[1];
  return clipped(heading || "Ficha enlazada por QR", 120);
}

function pageSummary(html) {
  const body = cleanText(compactHtml(html));
  return body.slice(0, 1200);
}

function externalStatus(facts) {
  const text = facts.map((fact) => `${fact.label}: ${fact.value}`).join(" ").toLowerCase();
  if (/no apt[oa]|no tiene control|sin control peri[oó]dico|vencid/.test(text)) {
    return "La fuente indica una condición que requiere revisión antes de usar.";
  }
  return "Información importada desde la fuente; verificá su vigencia antes de usar el objeto.";
}

export async function fetchExternalQrRecord(qrPayload) {
  let sourceUrl;
  try {
    sourceUrl = new URL(String(qrPayload ?? "").trim());
  } catch {
    throw new Error("El QR externo debe contener un enlace web válido.");
  }
  if (sourceUrl.protocol !== "https:" || !allowedHosts.has(sourceUrl.hostname)) {
    throw new Error("Por seguridad, esta versión solo puede importar enlaces oficiales de AGC.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  let result;
  try {
    result = await fetch(sourceUrl, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "StockLens-v05 QR importer" } });
  } catch {
    throw new Error("No se pudo consultar la página vinculada al QR.");
  } finally {
    clearTimeout(timer);
  }
  if (!result.ok) throw new Error("La página vinculada al QR no respondió correctamente.");
  const finalUrl = new URL(result.url);
  if (finalUrl.protocol !== "https:" || !allowedHosts.has(finalUrl.hostname)) {
    throw new Error("La página redirigió a un destino no permitido.");
  }
  const size = Number(result.headers.get("content-length") ?? 0);
  if (size > maxHtmlBytes) throw new Error("La página vinculada al QR es demasiado grande.");
  const html = (await result.text()).slice(0, maxHtmlBytes);
  const facts = labelValuePairs(html);
  const title = pageTitle(html);
  if (!facts.length && !pageSummary(html)) throw new Error("No se encontraron datos legibles en la página vinculada al QR.");
  return { sourceUrl: finalUrl.toString(), title, facts, summary: pageSummary(html) };
}

export function fallbackExternalSuggestion(record) {
  const facts = record.facts.map((fact) => `${fact.label}: ${fact.value}`).join("\n");
  const notes = [
    `Datos importados desde QR externo (${new URL(record.sourceUrl).hostname}).`,
    facts || record.summary,
    `Interpretación: ${externalStatus(record.facts)}`,
    "La fuente describe la instalación o registro completo; no confirma por sí sola la vigencia individual de cada componente.",
    `Fuente: ${record.sourceUrl}`
  ].filter(Boolean).join("\n");
  return {
    name: record.title,
    category: "Objeto",
    description: notes.slice(0, 900),
    condition: "Revisar la información importada antes de usar o guardar.",
    qrLabel: "QR externo importado",
    locationHint: "Sin ubicación",
    tags: ["QR externo", new URL(record.sourceUrl).hostname],
    checklist: ["Confirmar estado actual", "Verificar fecha de control", "Agregar foto del objeto"]
  };
}
