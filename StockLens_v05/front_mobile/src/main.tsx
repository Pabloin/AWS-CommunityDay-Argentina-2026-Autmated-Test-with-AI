import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  Camera,
  Check,
  ChevronRight,
  Clipboard,
  Cloud,
  CloudOff,
  DollarSign,
  ImagePlus,
  Loader2,
  PackageCheck,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Tag,
  X
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import "./styles.css";

type Status = "review" | "ready" | "published" | "sold" | "keep";
type Mode = "capture" | "organize" | "sell";

type Item = {
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

type Draft = {
  name: string;
  category: string;
  location: string;
  status: Status;
  price: string;
  notes: string;
  photos: string[];
  checklist: string[];
  aiTags: string[];
  listingText: string;
};

type ApiPhoto = {
  url: string;
};

type ApiItem = Omit<Item, "photos"> & {
  photos?: ApiPhoto[];
};

type AiSuggestion = {
  name: string;
  category: string;
  description: string;
  condition: string;
  suggestedPriceLabel: string;
  locationHint: string;
  tags: string[];
  checklist: string[];
  listingText: string;
};

const storageKey = "stocklens-v05-home-catalog";

const categoryChecklist: Record<string, string[]> = {
  "Juego de mesa": ["Caja visible", "Tablero", "Fichas", "Cartas", "Dados", "Manual"],
  Libro: ["Tapa", "Lomo", "Autor", "Edicion", "Sin hojas sueltas"],
  Juguete: ["Foto principal", "Partes completas", "Estado visible", "Medidas"],
  Herramienta: ["Marca", "Funcionando", "Accesorios", "Estado de uso"],
  Deporte: ["Foto completa", "Ruedas o soporte", "Rayones", "Medidas"],
  Objeto: ["Foto principal", "Estado visible", "Medidas", "Descripcion revisada"]
};

const statusLabels: Record<Status, string> = {
  review: "Para revisar",
  ready: "Listo para vender",
  published: "Publicado",
  sold: "Vendido",
  keep: "No vender"
};

const sampleItems: Item[] = [
  {
    id: "SLV5-MONO-001",
    name: "Monopoly edicion vieja",
    category: "Juego de mesa",
    location: "Galpon / caja azul",
    status: "review",
    price: 18000,
    notes: "Revisar si estan todas las fichas y billetes antes de publicar.",
    checklist: categoryChecklist["Juego de mesa"],
    checked: ["Caja visible", "Tablero"],
    photos: [],
    updatedAt: new Date().toISOString()
  },
  {
    id: "SLV5-RAYU-002",
    name: "Rayuela",
    category: "Libro",
    location: "Biblioteca del living",
    status: "ready",
    price: 9500,
    notes: "Buen estado general. Fotos de tapa y lomo listas.",
    checklist: categoryChecklist.Libro,
    checked: ["Tapa", "Lomo", "Autor", "Sin hojas sueltas"],
    photos: [],
    updatedAt: new Date().toISOString()
  },
  {
    id: "SLV5-PATI-003",
    name: "Patineta clasica",
    category: "Deporte",
    location: "Baulera",
    status: "review",
    price: 42000,
    notes: "Sacar foto de ruedas y verificar rulemanes.",
    checklist: categoryChecklist.Deporte,
    checked: ["Foto completa"],
    photos: [],
    updatedAt: new Date().toISOString()
  }
];

const emptyDraft: Draft = {
  name: "",
  category: "Juego de mesa",
  location: "Galpon",
  status: "review",
  price: "",
  notes: "",
  photos: [],
  checklist: [],
  aiTags: [],
  listingText: ""
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

function loadItems() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return sampleItems;
  try {
    const parsed = JSON.parse(raw) as Item[];
    return Array.isArray(parsed) && parsed.length ? parsed : sampleItems;
  } catch {
    return sampleItems;
  }
}

function fromApiItem(item: ApiItem): Item {
  return {
    ...item,
    photos: (item.photos ?? []).map((photo) => photo.url)
  };
}

function makeId(name: string) {
  const prefix = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `SLV5-${prefix || "ITEM"}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function CloudIcon({ state }: { state: "loading" | "ready" | "local" | "saving" }) {
  if (state === "loading" || state === "saving") return <Loader2 size={16} className="spin" />;
  if (state === "ready") return <Cloud size={16} />;
  return <CloudOff size={16} />;
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = document.createElement("img");
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("Foto invalida"));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function QrPanel({ item }: { item: Item }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(JSON.stringify({ app: "StockLens-v05", id: item.id }), {
      margin: 1,
      width: 220,
      color: { dark: "#17251f", light: "#ffffff" }
    }).then(setQr);
  }, [item.id]);

  return (
    <section className="organize-preview" aria-label={`Vista previa de ${item.name}`}>
      <div className="preview-photo">
        {item.photos[0] ? (
          <img src={item.photos[0]} alt={`Foto de ${item.name}`} />
        ) : (
          <div className="preview-photo-empty">
            <PackageCheck size={28} />
            <span>Sin foto</span>
          </div>
        )}
      </div>
      <div className="qr-panel">
        {qr ? <img src={qr} alt={`QR ${item.name}`} /> : <div className="qr-empty" />}
        <div>
          <strong>Etiqueta QR</strong>
          <span>{item.id}</span>
          <small>Escaneá para abrir este objeto.</small>
        </div>
        <a href={qr} download={`${item.id}.png`}>
          Descargar
        </a>
      </div>
    </section>
  );
}

function App() {
  const initialItems = useMemo(loadItems, []);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("capture");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [cloudState, setCloudState] = useState<"loading" | "ready" | "local" | "saving">("loading");
  const [cloudMessage, setCloudMessage] = useState("Sincronizando catalogo...");
  const [scanState, setScanState] = useState<"idle" | "loading" | "error">("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const ready = items.filter((item) => item.status === "ready" || item.status === "published");
  const pending = items.filter((item) => item.status === "review").length;
  const filtered = items.filter((item) =>
    `${item.name} ${item.category} ${item.location} ${item.id}`.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!apiBaseUrl) {
      setCloudState("local");
      setCloudMessage("Modo local: esta build no tiene API configurada.");
      return;
    }

    fetch(`${apiBaseUrl}/items`)
      .then(async (result) => {
        if (!result.ok) throw new Error("No se pudo leer el catalogo cloud.");
        const payload = (await result.json()) as { items?: ApiItem[] };
        const cloudItems = (payload.items ?? []).map(fromApiItem);
        if (cloudItems.length) {
          setItems(cloudItems);
          setSelectedId(cloudItems[0].id);
        }
        setCloudState("ready");
        setCloudMessage(cloudItems.length ? "Catalogo cloud sincronizado." : "Catalogo cloud listo para cargar objetos.");
      })
      .catch((error) => {
        setCloudState("local");
        setCloudMessage(error instanceof Error ? error.message : "Usando catalogo local.");
      });
  }, []);

  const addDraftPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const nextPhotos = await Promise.all(Array.from(files).slice(0, 4).map(toDataUrl));
    setDraft((current) => ({ ...current, photos: [...current.photos, ...nextPhotos].slice(0, 4) }));
    setAnalysisState("idle");
    setAnalysisMessage("");
  };

  const decodeQrFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = document.createElement("img");
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            reject(new Error("No se pudo leer la imagen del QR."));
            return;
          }
          context.drawImage(image, 0, 0);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (!code?.data) {
            reject(new Error("No se detecto un QR legible."));
            return;
          }
          resolve(code.data);
        };
        image.onerror = () => reject(new Error("Imagen de QR invalida."));
        image.src = String(reader.result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const itemIdFromQr = (payload: string) => {
    const cleanPayload = payload.trim();
    try {
      const parsed = JSON.parse(cleanPayload);
      for (const key of ["id", "assetId", "code", "labelCode"]) {
        if (typeof parsed[key] === "string" && parsed[key].trim()) return parsed[key].trim();
      }
    } catch {
      const urlItem = /\/items\/([^/?#]+)/i.exec(cleanPayload);
      if (urlItem?.[1]) return decodeURIComponent(urlItem[1]);
      const stockLensCode = /SLV5-[A-Z0-9-]+/i.exec(cleanPayload);
      if (stockLensCode?.[0]) return stockLensCode[0].toUpperCase();
      if (/^[a-zA-Z0-9._:-]{3,120}$/.test(cleanPayload)) return cleanPayload;
      return "";
    }
    return "";
  };

  const stopScanner = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerOpen(false);
  };

  const openItemFromQrPayload = async (qrPayload: string) => {
    if (!apiBaseUrl) throw new Error("API no configurada.");
    const itemId = itemIdFromQr(qrPayload);
    if (!itemId) throw new Error("El QR no contiene un ID de StockLens v05.");
    const result = await fetch(`${apiBaseUrl}/items/${encodeURIComponent(itemId)}`);
    const payload = await result.json();
    if (!result.ok) throw new Error("Ese QR no existe en el catalogo cloud.");
    const found = fromApiItem(payload as ApiItem);
    setItems((current) => [found, ...current.filter((item) => item.id !== found.id)]);
    setSelectedId(found.id);
    setScanState("idle");
    setScanMessage(`Ficha abierta: ${found.name}.`);
    setMode("organize");
  };

  const readVideoFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      frameRef.current = window.requestAnimationFrame(readVideoFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      try {
        setScanMessage("QR detectado. Buscando ficha...");
        await openItemFromQrPayload(code.data);
        stopScanner();
      } catch (error) {
        setScanState("error");
        setScanMessage(error instanceof Error ? error.message : "No se pudo abrir la ficha.");
        frameRef.current = window.requestAnimationFrame(readVideoFrame);
      }
      return;
    }

    frameRef.current = window.requestAnimationFrame(readVideoFrame);
  };

  const startScanner = async () => {
    setScanState("loading");
    setScanMessage("Abrindo camara...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador no permite lectura de camara en vivo.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        },
        audio: false
      });
      streamRef.current = stream;
      setScannerOpen(true);
      setScanMessage("Apunta al QR para abrir la ficha.");

      window.setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          setScanState("error");
          setScanMessage("Safari bloqueo la camara. Usa el fallback con foto.");
        });
        frameRef.current = window.requestAnimationFrame(readVideoFrame);
      }, 0);
    } catch (error) {
      setScannerOpen(false);
      setScanState("error");
      setScanMessage(error instanceof Error ? error.message : "No se pudo abrir la camara.");
    }
  };

  const scanQr = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setScanState("loading");
    setScanMessage("Leyendo QR...");

    try {
      const qrPayload = await decodeQrFile(file);
      await openItemFromQrPayload(qrPayload);
    } catch (error) {
      setScanState("error");
      setScanMessage(error instanceof Error ? error.message : "No se pudo leer el QR.");
    }
  };

  useEffect(() => stopScanner, []);

  const applySuggestion = (suggestion: AiSuggestion) => {
    const knownCategory = categoryChecklist[suggestion.category] ? suggestion.category : "Objeto";
    setDraft((current) => ({
      ...current,
      name: current.name || suggestion.name,
      category: knownCategory,
      location: current.location || suggestion.locationHint,
      notes: [suggestion.description, suggestion.condition, suggestion.suggestedPriceLabel].filter(Boolean).join("\n"),
      checklist: suggestion.checklist,
      aiTags: suggestion.tags,
      listingText: suggestion.listingText
    }));
  };

  const analyzePhoto = async () => {
    if (!draft.photos[0]) return;
    if (!apiBaseUrl) {
      setAnalysisState("error");
      setAnalysisMessage("Esta build no tiene API de IA configurada.");
      return;
    }

    setAnalysisState("loading");
    setAnalysisMessage("Analizando objeto con Bedrock...");

    try {
      const result = await fetch(`${apiBaseUrl}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl: draft.photos[0] })
      });
      const payload = await result.json();
      if (!result.ok) {
        throw new Error(payload.message ?? "No se pudo analizar la imagen.");
      }
      applySuggestion(payload.suggestion as AiSuggestion);
      setAnalysisState("ready");
      setAnalysisMessage("Sugerencias cargadas. Revisalas antes de guardar.");
    } catch (error) {
      setAnalysisState("error");
      setAnalysisMessage(error instanceof Error ? error.message : "No se pudo analizar la imagen.");
    }
  };

  const createItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;

    const item: Item = {
      id: makeId(draft.name),
      name: draft.name.trim(),
      category: draft.category,
      location: draft.location.trim() || "Sin ubicacion",
      status: draft.status,
      price: Number(draft.price) || 0,
      notes: draft.notes.trim(),
      checklist: draft.checklist.length ? draft.checklist : categoryChecklist[draft.category] ?? ["Foto principal", "Estado visible"],
      checked: draft.photos.length ? ["Foto principal"] : [],
      photos: draft.photos,
      updatedAt: new Date().toISOString()
    };

    setCloudState("saving");
    setCloudMessage("Guardando objeto y fotos en AWS...");

    try {
      if (!apiBaseUrl) throw new Error("API no configurada.");
      const result = await fetch(`${apiBaseUrl}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item)
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.message ?? "No se pudo guardar en AWS.");
      const savedItem = fromApiItem(payload as ApiItem);
      setItems((current) => [savedItem, ...current.filter((currentItem) => currentItem.id !== savedItem.id)]);
      setSelectedId(savedItem.id);
      setCloudState("ready");
      setCloudMessage("Objeto guardado en DynamoDB y fotos en S3.");
    } catch (error) {
      setItems((current) => [item, ...current]);
      setSelectedId(item.id);
      setCloudState("local");
      setCloudMessage(error instanceof Error ? `${error.message} Quedo guardado localmente.` : "Quedo guardado localmente.");
    } finally {
      setDraft(emptyDraft);
      setAnalysisState("idle");
      setAnalysisMessage("");
      setMode("organize");
    }
  };

  const updateItem = (patch: Partial<Item>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      )
    );
  };

  const toggleCheck = (label: string) => {
    const checked = selected.checked.includes(label)
      ? selected.checked.filter((item) => item !== label)
      : [...selected.checked, label];
    updateItem({ checked });
  };

  const listingText = selected
    ? `${selected.name}\n${selected.category} en ${selected.location}\nEstado: ${
        statusLabels[selected.status]
      }\nPrecio sugerido: ${money(selected.price)}\n${selected.notes}`
    : "";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-label="StockLens: QR y lente">
            <QrCode className="brand-qr" size={27} strokeWidth={2.3} />
            <Search className="brand-lens" size={15} strokeWidth={3} aria-hidden="true" />
          </div>
          <div>
            <span>StockLens v05</span>
            <strong>Mis cosas</strong>
          </div>
        </div>
        <button type="button" onClick={() => setMode("capture")} aria-label="Agregar objeto">
          <Plus size={20} />
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">
            <Sparkles size={15} /> Galpon a catalogo
          </span>
          <h1>Una foto y ya existe.</h1>
          <p>Ordena juegos, libros y objetos guardados antes de publicarlos.</p>
        </div>
        <div className="hero-card">
          <strong>{items.length}</strong>
          <span>objetos</span>
        </div>
      </section>

      <section className={`cloud-banner ${cloudState}`}>
        <CloudIcon state={cloudState} />
        <span>{cloudMessage}</span>
      </section>

      <nav className="tabs" aria-label="Secciones">
        <button className={mode === "capture" ? "active" : ""} type="button" onClick={() => setMode("capture")}>
          <Camera size={17} /> Capturar
        </button>
        <button className={mode === "organize" ? "active" : ""} type="button" onClick={() => setMode("organize")}>
          <Archive size={17} /> Organizar
        </button>
        <button className={mode === "sell" ? "active" : ""} type="button" onClick={() => setMode("sell")}>
          <Tag size={17} /> Vender
        </button>
      </nav>

      <section className="metrics" aria-label="Resumen">
        <article>
          <strong>{pending}</strong>
          <span>por revisar</span>
        </article>
        <article>
          <strong>{ready.length}</strong>
          <span>vendibles</span>
        </article>
        <article>
          <strong>{items.filter((item) => item.photos.length).length}</strong>
          <span>con fotos</span>
        </article>
      </section>

      {mode === "capture" ? (
        <section className="panel capture-panel">
          <form onSubmit={createItem}>
            <div className={`qr-scan ${scanState}`}>
              <QrCode size={24} />
              <strong>{scanState === "loading" ? "Leyendo..." : "Leer QR existente"}</strong>
              <span>{scanMessage || "Escanea una etiqueta para traer toda la ficha."}</span>
              <div className="qr-scan-actions">
                <button type="button" onClick={scannerOpen ? stopScanner : startScanner}>
                  {scannerOpen ? "Cerrar camara" : "Apuntar camara"}
                </button>
                <label>
                  Desde foto
                  <input type="file" accept="image/*" capture="environment" onChange={(event) => scanQr(event.target.files)} />
                </label>
              </div>
            </div>

            {scannerOpen ? (
              <div className="scanner-panel">
                <video ref={videoRef} playsInline muted />
                <canvas ref={canvasRef} aria-hidden="true" />
                <span>Centra el QR dentro del recuadro.</span>
              </div>
            ) : null}

            <label className="photo-drop">
              <input type="file" accept="image/*" capture="environment" multiple onChange={(event) => addDraftPhotos(event.target.files)} />
              <ImagePlus size={26} />
              <strong>{draft.photos.length ? `${draft.photos.length} fotos listas` : "Sacar foto"}</strong>
              <span>La foto abre el catalogo.</span>
            </label>

            {draft.photos.length ? (
              <div className="photo-strip">
                {draft.photos.map((photo) => (
                  <img key={photo} src={photo} alt="Objeto capturado" />
                ))}
              </div>
            ) : null}

            {draft.photos.length ? (
              <div className={`ai-panel ${analysisState}`}>
                <button type="button" onClick={analyzePhoto} disabled={analysisState === "loading"}>
                  <Sparkles size={18} /> {analysisState === "loading" ? "Analizando..." : "Analizar con IA"}
                </button>
                <p>{analysisMessage || "Bedrock puede sugerir nombre, descripcion, etiquetas y checklist."}</p>
                {draft.aiTags.length ? (
                  <div className="tag-row">
                    {draft.aiTags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <label>
              Nombre
              <input
                required
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Monopoly, Rayuela, patineta"
              />
            </label>

            <div className="field-grid">
              <label>
                Categoria
                <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                  {Object.keys(categoryChecklist).map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Precio
                <input
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                  placeholder="18000"
                />
              </label>
            </div>

            <label>
              Donde esta
              <input
                value={draft.location}
                onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                placeholder="Galpon / caja azul"
              />
            </label>

            <label>
              Estado
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nota
              <textarea
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Revisar piezas, sacar foto del lomo, probar si funciona"
              />
            </label>

            <button className="primary-action" type="submit">
              Guardar objeto <ChevronRight size={19} />
            </button>
          </form>
        </section>
      ) : null}

      {mode === "organize" ? (
        <>
          <section className="search-panel">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar objeto, caja o categoria" />
          </section>

          <section className="item-list">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === selected.id ? "active" : ""}
                onClick={() => setSelectedId(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.category} - {item.location}</small>
                </span>
                <em className={`status-dot ${item.status}`}>{statusLabels[item.status]}</em>
              </button>
            ))}
          </section>

          {selected ? (
            <section className="panel detail-panel">
              <div className="detail-head">
                <div>
                  <small>{selected.id}</small>
                  <h2>{selected.name}</h2>
                  <p>{selected.location}</p>
                </div>
                <strong>{money(selected.price)}</strong>
              </div>

              <div className="status-actions">
                {(["review", "ready", "published", "sold", "keep"] as Status[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={selected.status === status ? "active" : ""}
                    onClick={() => updateItem({ status })}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>

              <div className="checklist">
                <div className="section-title">
                  <strong>Antes de vender</strong>
                  <span>
                    {selected.checked.length}/{selected.checklist.length}
                  </span>
                </div>
                {selected.checklist.map((label) => (
                  <button key={label} type="button" onClick={() => toggleCheck(label)}>
                    {selected.checked.includes(label) ? <Check size={18} /> : <X size={18} />}
                    {label}
                  </button>
                ))}
              </div>

              <QrPanel item={selected} />
            </section>
          ) : null}
        </>
      ) : null}

      {mode === "sell" ? (
        <section className="sell-stack">
          {ready.length ? (
            ready.map((item) => (
              <article key={item.id} className="sell-card" onClick={() => setSelectedId(item.id)}>
                <div className="sell-thumb">{item.photos[0] ? <img src={item.photos[0]} alt={item.name} /> : <PackageCheck size={30} />}</div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{money(item.price)}</span>
                  <small>{item.location}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <PackageCheck size={28} />
              <strong>Todavia no hay objetos listos</strong>
              <span>Marca alguno como listo para vender.</span>
            </div>
          )}

          {selected ? (
            <section className="panel listing-panel">
              <div className="section-title">
                <strong>Texto para publicar</strong>
                <button type="button" onClick={() => navigator.clipboard?.writeText(listingText)}>
                  <Clipboard size={16} /> Copiar
                </button>
              </div>
              <pre>{listingText}</pre>
              <button className="primary-action" type="button" onClick={() => updateItem({ status: "published" })}>
                <DollarSign size={18} /> Marcar publicado
              </button>
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
