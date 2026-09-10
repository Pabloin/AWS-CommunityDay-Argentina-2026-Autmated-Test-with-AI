import assert from "node:assert/strict";
import test from "node:test";
import {
  extractText,
  normalizeItem,
  normalizeSuggestion,
  parseBody,
  parseDataUrl,
  parseJson,
  pathParts,
  publicItemUrl
} from "../../../backend/functions/domain.mjs";

test("parsea cuerpos JSON normales y base64 de API Gateway", () => {
  assert.deepEqual(parseBody({ body: '{"name":"Manguera"}' }), { name: "Manguera" });
  const encoded = Buffer.from('{"name":"Matafuego"}').toString("base64");
  assert.deepEqual(parseBody({ body: encoded, isBase64Encoded: true }), { name: "Matafuego" });
  assert.deepEqual(parseBody({}), {});
});

test("acepta solo formatos de imagen soportados", () => {
  const image = parseDataUrl(`data:image/jpeg;base64,${Buffer.from("foto").toString("base64")}`);
  assert.equal(image.format, "jpeg");
  assert.equal(image.contentType, "image/jpeg");
  assert.equal(image.bytes.toString(), "foto");
  assert.throws(() => parseDataUrl("data:image/svg+xml;base64,PHN2Zz4="), /png, jpeg o webp/);
});

test("extrae texto y JSON aunque Bedrock agregue un bloque markdown", () => {
  const text = extractText({ message: { content: [{ text: "resultado" }, { text: "final" }] } });
  assert.equal(text, "resultado\nfinal");
  assert.deepEqual(parseJson('Respuesta:\n```json\n{"name":"Manguera"}\n```'), { name: "Manguera" });
  assert.throws(() => parseJson("No pude identificarlo"), /no devolvio JSON/);
});

test("normaliza y limita la salida no deterministica de Bedrock", () => {
  const suggestion = normalizeSuggestion({
    name: "Manguera contra incendios",
    tags: Array.from({ length: 10 }, (_, index) => `tag-${index}`),
    checklist: []
  });

  assert.equal(suggestion.name, "Manguera contra incendios");
  assert.equal(suggestion.category, "Objeto");
  assert.equal(suggestion.tags.length, 8);
  assert.deepEqual(suggestion.checklist, ["Foto principal", "Estado visible", "Descripcion revisada"]);
});

test("normaliza un item antes de persistirlo", () => {
  const item = normalizeItem({
    name: "Libro",
    price: "valor-invalido",
    checklist: [1, "Tapa"],
    aiTags: Array.from({ length: 15 }, (_, index) => index)
  });

  assert.equal(item.name, "Libro");
  assert.equal(item.price, 0);
  assert.deepEqual(item.checklist, ["1", "Tapa"]);
  assert.equal(item.aiTags.length, 12);
});

test("construye rutas y URLs publicas sin perder caracteres", () => {
  assert.deepEqual(pathParts({ rawPath: "/items/AGC-27824-1/qr" }), ["items", "AGC-27824-1", "qr"]);
  assert.equal(
    publicItemUrl("https://mobile-v5.lens.glaciar.org", "AGC 27824/1"),
    "https://mobile-v5.lens.glaciar.org/?item=AGC+27824%2F1"
  );
});
