import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
const testOrigin = process.env.TEST_ORIGIN ?? "https://mobile-v5.lens.glaciar.org";
const reportFile = process.env.JUNIT_REPORT_FILE ?? "/tmp/stocklens-v05-layer-03/core.xml";
const runBedrock = process.env.RUN_BEDROCK_TEST === "true";
const testItemId = `TEST-L3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const results = [];

if (!baseUrl) throw new Error("API_BASE_URL es obligatorio.");

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function request(path, options = {}) {
  return fetch(path.startsWith("http") ? path : `${baseUrl}${path}`, {
    signal: AbortSignal.timeout(25_000),
    ...options
  });
}

async function json(response) {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`La respuesta ${response.status} no contiene JSON valido: ${body.slice(0, 160)}`);
  }
}

async function step(name, callback) {
  const startedAt = performance.now();
  try {
    const value = await callback();
    results.push({ name, duration: performance.now() - startedAt });
    console.log(`PASS ${name}`);
    return value;
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    results.push({ name, duration: performance.now() - startedAt, failure });
    console.error(`FAIL ${name}: ${failure.message}`);
    return undefined;
  }
}

async function writeJUnit() {
  const failures = results.filter((result) => result.failure).length;
  const cases = results.map((result) => {
    const failure = result.failure
      ? `<failure message="${escapeXml(result.failure.message)}">${escapeXml(result.failure.stack ?? result.failure.message)}</failure>`
      : "";
    return `<testcase classname="StockLens.v05.Layer03" name="${escapeXml(result.name)}" time="${(result.duration / 1000).toFixed(3)}">${failure}</testcase>`;
  }).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="StockLens v05 Layer 03" tests="${results.length}" failures="${failures}">\n${cases}\n</testsuite>\n`;
  await mkdir(dirname(reportFile), { recursive: true });
  await writeFile(reportFile, xml, "utf8");
}

let photoUrl = "";

await step("health: API Gateway y Lambda", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  const body = await json(response);
  assert.equal(body.service, "stocklens-v05-api");
  assert.equal(body.status, "ok");
  assert.ok(body.storage?.itemsTable);
  assert.ok(body.storage?.photosBucket);
});

await step("contrato 404", async () => {
  const response = await request("/items/TEST-L3-NO-EXISTE");
  assert.equal(response.status, 404);
  assert.equal((await json(response)).error, "item_not_found");
});

await step("CORS preflight", async () => {
  const response = await request("/items", {
    method: "OPTIONS",
    headers: {
      origin: testOrigin,
      "access-control-request-method": "GET"
    }
  });
  assert.ok(response.status === 200 || response.status === 204);
  assert.ok(response.headers.get("access-control-allow-origin"));
});

await step("crear item: Lambda, DynamoDB y S3", async () => {
  const response = await request("/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: testItemId,
      name: "Objeto de integracion Layer 03",
      category: "Objeto",
      location: "Pipeline GitHub Actions",
      status: "review",
      notes: "Dato temporal creado por el pipeline",
      checklist: ["API", "DynamoDB", "S3", "QR"],
      checked: ["API"],
      photos: [`data:image/png;base64,${onePixelPng}`]
    })
  });
  assert.equal(response.status, 201);
  const body = await json(response);
  assert.equal(body.id, testItemId);
  assert.equal(body.photoCount, 1);
  assert.equal(body.photos?.length, 1);
  assert.ok(body.photos[0].key.includes(`/items/${testItemId}/photos/`));
  photoUrl = body.photos[0].url;
});

await step("leer item: round trip DynamoDB", async () => {
  const response = await request(`/items/${encodeURIComponent(testItemId)}`);
  assert.equal(response.status, 200);
  const body = await json(response);
  assert.equal(body.id, testItemId);
  assert.equal(body.location, "Pipeline GitHub Actions");
  assert.ok(body.checklist.includes("DynamoDB"));
});

await step("descargar foto: URL firmada S3", async () => {
  assert.ok(photoUrl, "La creacion no devolvio una URL de foto.");
  const response = await request(photoUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /image\/png/);
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});

await step("generar QR: contrato SVG", async () => {
  const response = await request(`/items/${encodeURIComponent(testItemId)}/qr`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/);
  assert.match(await response.text(), /<svg/);
});

if (runBedrock) {
  await step("Bedrock real: contrato estructural", async () => {
    const layerDir = dirname(fileURLToPath(import.meta.url));
    const logoPath = resolve(layerDir, "../../front_mobile/src/assets/stocklens-logo.png");
    const image = await readFile(logoPath);
    const response = await request("/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl: `data:image/png;base64,${image.toString("base64")}` })
    });
    assert.equal(response.status, 200);
    const suggestion = (await json(response)).suggestion;
    assert.ok(typeof suggestion?.name === "string" && suggestion.name.length > 0);
    assert.ok(typeof suggestion?.category === "string" && suggestion.category.length > 0);
    assert.ok(Array.isArray(suggestion?.tags));
    assert.ok(Array.isArray(suggestion?.checklist) && suggestion.checklist.length > 0);
  });
}

await step("limpieza: borrar foto S3 e item DynamoDB", async () => {
  const response = await request(`/test-support/items/${encodeURIComponent(testItemId)}`, { method: "DELETE" });
  assert.ok(response.status === 200 || response.status === 404);
  if (response.status === 200) assert.equal((await json(response)).id, testItemId);
});

await writeJUnit();
const failures = results.filter((result) => result.failure);
console.log(`Layer 03: ${results.length - failures.length}/${results.length} checks pasaron. Reporte: ${reportFile}`);
if (failures.length) process.exitCode = 1;
