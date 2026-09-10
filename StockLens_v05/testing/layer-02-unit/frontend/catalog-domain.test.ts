import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAiSuggestion,
  emptyDraft,
  fromApiItem,
  itemIdFromQr,
  loadItemsFromStorage,
  makeId,
  normalizeStatus,
  type ApiItem
} from "../../../front_mobile/src/catalog-domain.ts";

test("normaliza estados actuales, historicos y desconocidos", () => {
  assert.equal(normalizeStatus("identified"), "identified");
  assert.equal(normalizeStatus("ready"), "labeled");
  assert.equal(normalizeStatus("published"), "stored");
  assert.equal(normalizeStatus("estado-inventado"), "review");
});

test("convierte fotos de API en URLs consumibles por la app", () => {
  const apiItem = {
    id: "SLV5-MANG-001",
    name: "Manguera de incendio",
    category: "Objeto",
    location: "Piso 1",
    status: "ready",
    price: 0,
    notes: "",
    checklist: [],
    checked: [],
    updatedAt: "2026-09-10T12:00:00.000Z",
    photos: [{ url: "https://example.test/photo-1.jpg" }]
  } as ApiItem;

  assert.deepEqual(fromApiItem(apiItem), {
    ...apiItem,
    status: "labeled",
    photos: ["https://example.test/photo-1.jpg"]
  });
});

test("un storage vacio, roto o con una forma incorrecta no inventa objetos", () => {
  assert.deepEqual(loadItemsFromStorage(null), []);
  assert.deepEqual(loadItemsFromStorage("no-es-json"), []);
  assert.deepEqual(loadItemsFromStorage('{"id":"SLV5-X"}'), []);
  assert.deepEqual(loadItemsFromStorage('[{"name":"sin id"}]'), []);
});

test("genera un ID estable para nombres con acentos cuando se fija la entropia", () => {
  assert.equal(makeId("Mánguera de incendio", "a1z"), "SLV5-MANG-A1Z");
  assert.equal(makeId("***", "xyz"), "SLV5-ITEM-XYZ");
});

test("extrae el ID del QR generado por StockLens", () => {
  assert.equal(
    itemIdFromQr("https://mobile-v5.lens.glaciar.org/?item=SLV5-MANG-001"),
    "SLV5-MANG-001"
  );
  assert.equal(itemIdFromQr("https://api.example.test/items/SLV5-LIBR-002/qr"), "SLV5-LIBR-002");
  assert.equal(itemIdFromQr('{"assetId":"AGC-27824-1"}'), "AGC-27824-1");
  assert.equal(itemIdFromQr("SLV5-JUEG-003"), "SLV5-JUEG-003");
});

test("rechaza payloads que no identifican un objeto", () => {
  assert.equal(itemIdFromQr("https://example.test/sin-identificador"), "");
  assert.equal(itemIdFromQr('{"mensaje":"sin id"}'), "");
});

test("aplica la sugerencia de IA sin pisar decisiones del usuario", () => {
  const result = applyAiSuggestion(
    { ...emptyDraft, name: "Nombre revisado", location: "Gabinete piso 1" },
    {
      name: "Objeto sugerido",
      category: "Categoria que la app no admite",
      description: "Elemento de una instalacion contra incendios.",
      condition: "Verificar vigencia.",
      qrLabel: "Instalacion 1",
      locationHint: "Pasillo",
      tags: ["seguridad", "incendio"],
      checklist: ["Revisar precinto"]
    }
  );

  assert.equal(result.name, "Nombre revisado");
  assert.equal(result.location, "Gabinete piso 1");
  assert.equal(result.category, "Objeto");
  assert.deepEqual(result.aiTags, ["seguridad", "incendio"]);
  assert.match(result.notes, /Verificar vigencia/);
});
