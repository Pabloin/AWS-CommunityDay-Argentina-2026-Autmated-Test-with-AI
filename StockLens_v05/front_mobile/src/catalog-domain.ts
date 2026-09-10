export type Status = "review" | "identified" | "labeled" | "stored" | "missing";

export type Item = {
  id: string;
  name: string;
  category: string;
  location: string;
  status: Status;
  price: number;
  notes: string;
  checklist: string[];
  checked: string[];
  photos: string[];
  updatedAt: string;
};

export type Draft = {
  name: string;
  category: string;
  location: string;
  status: Status;
  price: string;
  notes: string;
  photos: string[];
  checklist: string[];
  aiTags: string[];
};

export type ApiPhoto = { url: string };

export type ApiItem = Omit<Item, "photos"> & {
  photos?: ApiPhoto[];
};

export type AiSuggestion = {
  name: string;
  category: string;
  description: string;
  condition: string;
  qrLabel: string;
  locationHint: string;
  tags: string[];
  checklist: string[];
};

export const categoryChecklist: Record<string, string[]> = {
  "Juego de mesa": ["Caja visible", "Tablero", "Fichas", "Cartas", "Dados", "Manual"],
  Libro: ["Tapa", "Lomo", "Autor", "Edicion", "Sin hojas sueltas"],
  Juguete: ["Foto principal", "Partes completas", "Estado visible", "Medidas"],
  Herramienta: ["Marca", "Funcionando", "Accesorios", "Estado de uso"],
  Deporte: ["Foto completa", "Ruedas o soporte", "Rayones", "Medidas"],
  Objeto: ["Foto principal", "Estado visible", "Medidas", "Descripcion revisada"]
};

export const statusLabels: Record<Status, string> = {
  review: "Para revisar",
  identified: "Identificado",
  labeled: "Con QR",
  stored: "Guardado",
  missing: "No ubicado"
};

export const emptyDraft: Draft = {
  name: "",
  category: "Juego de mesa",
  location: "Galpon",
  status: "review",
  price: "",
  notes: "",
  photos: [],
  checklist: [],
  aiTags: []
};

export function normalizeStatus(status: string | undefined): Status {
  if (status === "identified" || status === "labeled" || status === "stored" || status === "missing") return status;
  if (status === "ready") return "labeled";
  if (status === "published" || status === "sold") return "stored";
  return "review";
}

export function fromApiItem(item: ApiItem): Item {
  return {
    ...item,
    status: normalizeStatus(item.status),
    photos: (item.photos ?? []).map((photo) => photo.url)
  };
}

export function loadItemsFromStorage(raw: string | null): Item[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is Item => Boolean(item && typeof item.id === "string")) : [];
  } catch {
    return [];
  }
}

export function makeId(name: string, randomPart = Math.random().toString(36).slice(2, 5)): string {
  const prefix = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `SLV5-${prefix || "ITEM"}-${randomPart.slice(0, 3).toUpperCase()}`;
}

export function itemIdFromQr(payload: string): string {
  const cleanPayload = payload.trim();
  try {
    const parsed: unknown = JSON.parse(cleanPayload);
    if (!parsed || typeof parsed !== "object") return "";
    const record = parsed as Record<string, unknown>;
    for (const key of ["id", "assetId", "code", "labelCode"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
    }
    return "";
  } catch {
    const queryItem = /[?&]item=([^&#]+)/i.exec(cleanPayload);
    if (queryItem?.[1]) return decodeURIComponent(queryItem[1]);
    const pathItem = /\/items\/([^/?#]+)/i.exec(cleanPayload);
    if (pathItem?.[1]) return decodeURIComponent(pathItem[1]);
    const stockLensCode = /SLV5-[A-Z0-9-]+/i.exec(cleanPayload);
    if (stockLensCode?.[0]) return stockLensCode[0].toUpperCase();
    if (/^[a-zA-Z0-9._:-]{3,120}$/.test(cleanPayload)) return cleanPayload;
    return "";
  }
}

export function applyAiSuggestion(current: Draft, suggestion: AiSuggestion): Draft {
  const category = categoryChecklist[suggestion.category] ? suggestion.category : "Objeto";
  return {
    ...current,
    name: current.name || suggestion.name,
    category,
    location: current.location || suggestion.locationHint,
    notes: [suggestion.description, suggestion.condition, suggestion.qrLabel].filter(Boolean).join("\n"),
    checklist: suggestion.checklist,
    aiTags: suggestion.tags
  };
}
