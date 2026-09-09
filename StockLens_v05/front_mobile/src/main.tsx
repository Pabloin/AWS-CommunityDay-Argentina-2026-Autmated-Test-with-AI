import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  ImagePlus,
  Loader2,
  MapPin,
  PackageCheck,
  QrCode,
  Search,
  Sparkles,
  X
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import stockLensLogo from "./assets/stocklens-logo.png";
import "./styles.css";

type Status = "review" | "identified" | "labeled" | "stored" | "missing";
type Mode = "capture" | "scan" | "organize";

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
  qrLabel: string;
  locationHint: string;
  tags: string[];
  checklist: string[];
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
  identified: "Identificado",
  labeled: "Con QR",
  stored: "Guardado",
  missing: "No ubicado"
};

const sampleItems: Item[] = [
  {
    id: "SLV5-MONO-001",
    name: "Monopoly edicion vieja",
    category: "Juego de mesa",
    location: "Galpon / caja azul",
    status: "review",
    price: 18000,
    notes: "Revisar si estan todas las fichas y billetes antes de etiquetar.",
    checklist: categoryChecklist["Juego de mesa"],
    checked: ["Caja visible", "Tablero"],
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
  aiTags: []
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL ?? "https://mobile-v5.lens.glaciar.org";

function loadItems() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return sampleItems;
  try {
    const parsed = JSON.parse(raw) as Item[];
    const currentItems = Array.isArray(parsed) ? parsed.filter((item) => item.id !== "SLV5-RAYU-002") : [];
    return currentItems.length ? currentItems : sampleItems;
  } catch {
    return sampleItems;
  }
}

function normalizeStatus(status: string | undefined): Status {
  if (status === "identified" || status === "labeled" || status === "stored" || status === "missing") return status;
  if (status === "ready") return "labeled";
  if (status === "published" || status === "sold") return "stored";
  return "review";
}

function fromApiItem(item: ApiItem): Item {
  return {
    ...item,
    status: normalizeStatus(item.status),
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
  const itemUrl = useMemo(() => {
    const url = new URL(import.meta.env.BASE_URL, publicAppUrl);
    url.searchParams.set("item", item.id);
    return url.toString();
  }, [item.id]);

  useEffect(() => {
    QRCode.toDataURL(itemUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#17251f", light: "#ffffff" }
    }).then(setQr);
  }, [itemUrl]);

  return (
    <section className="qr-card" aria-label={`Etiqueta QR de ${item.name}`}>
      <div className="qr-card-heading">
        <span><QrCode size={20} /></span>
        <div>
          <strong>Etiqueta QR</strong>
          <small>Usala para encontrar este objeto.</small>
        </div>
      </div>
      {qr ? <img src={qr} alt={`QR ${item.name}`} /> : <div className="qr-empty" />}
      <span className="qr-code-id">{item.id}</span>
      <div className="qr-card-actions">
        <a href={itemUrl}>Abrir ficha</a>
        <a href={qr} download={`${item.id}.png`}>Descargar</a>
      </div>
    </section>
  );
}

function App() {
  const initialItems = useMemo(loadItems, []);
  const linkedItemId = useMemo(() => new URLSearchParams(window.location.search).get("item")?.trim() ?? "", []);
  const localLinkedItem = initialItems.find((item) => item.id === linkedItemId);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedId, setSelectedId] = useState(localLinkedItem?.id ?? initialItems[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>(linkedItemId ? "organize" : "capture");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [cloudState, setCloudState] = useState<"loading" | "ready" | "local" | "saving">("loading");
  const [cloudMessage, setCloudMessage] = useState("Sincronizando catalogo...");
  const [scanState, setScanState] = useState<"idle" | "loading" | "error">("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(Boolean(localLinkedItem));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
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
          const linkedItem = cloudItems.find((item) => item.id === linkedItemId);
          setSelectedId(linkedItem?.id ?? cloudItems[0].id);
          if (linkedItem) {
            setMode("organize");
            setDetailOpen(true);
          }
        }
        setCloudState("ready");
        setCloudMessage(cloudItems.length ? "Catalogo cloud sincronizado." : "Catalogo cloud listo para cargar objetos.");
      })
      .catch((error) => {
        setCloudState("local");
        setCloudMessage(error instanceof Error ? error.message : "Usando catalogo local.");
      });
  }, [linkedItemId]);

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
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth"
          });
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
    scanBusyRef.current = false;
    setScannerOpen(false);
  };

  const openItemFromQrPayload = async (qrPayload: string) => {
    const itemId = itemIdFromQr(qrPayload);
    if (!itemId) throw new Error("El QR no contiene un ID de StockLens v05.");

    if (!apiBaseUrl) {
      const localItem = items.find((item) => item.id === itemId);
      if (!localItem) throw new Error("Ese QR no existe en el inventario local.");
      setSelectedId(localItem.id);
      setDetailOpen(true);
      setScanState("idle");
      setScanMessage(`Ficha abierta: ${localItem.name}.`);
      setMode("organize");
      return;
    }

    const result = await fetch(`${apiBaseUrl}/items/${encodeURIComponent(itemId)}`);
    const payload = await result.json();
    if (!result.ok) throw new Error("Ese QR no existe en el catalogo cloud.");
    const found = fromApiItem(payload as ApiItem);
    setItems((current) => [found, ...current.filter((item) => item.id !== found.id)]);
    setSelectedId(found.id);
    setDetailOpen(true);
    setScanState("idle");
    setScanMessage(`Ficha abierta: ${found.name}.`);
    setMode("organize");
  };

  const readVideoFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || !video.videoWidth || !video.videoHeight) {
      frameRef.current = window.requestAnimationFrame(readVideoFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      frameRef.current = window.requestAnimationFrame(readVideoFrame);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth"
    });
    if (code?.data) {
      if (scanBusyRef.current) return;
      scanBusyRef.current = true;
      try {
        setScanMessage("QR detectado. Buscando ficha...");
        await openItemFromQrPayload(code.data);
        stopScanner();
      } catch (error) {
        scanBusyRef.current = false;
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
    setScanMessage("Abriendo camara...");

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
      setScanMessage("Preparando camara...");
    } catch (error) {
      setScannerOpen(false);
      setScanState("error");
      setScanMessage(error instanceof Error ? error.message : "No se pudo abrir la camara.");
    }
  };

  useEffect(() => {
    if (!scannerOpen) return;

    let cancelled = false;
    const startVideo = async () => {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const video = videoRef.current;
      const stream = streamRef.current;
      if (cancelled || !video || !stream) return;

      video.srcObject = stream;
      try {
        await video.play();
        if (cancelled) return;
        setScanState("loading");
        setScanMessage("Camara activa. Apunta al QR para abrir la ficha.");
        scanBusyRef.current = false;
        frameRef.current = window.requestAnimationFrame(readVideoFrame);
      } catch {
        setScanState("error");
        setScanMessage("Safari bloqueo la camara. Usa el fallback con foto.");
      }
    };

    startVideo();
    return () => {
      cancelled = true;
    };
  }, [scannerOpen]);

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
      notes: [suggestion.description, suggestion.condition, suggestion.qrLabel].filter(Boolean).join("\n"),
      checklist: suggestion.checklist,
      aiTags: suggestion.tags
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
      price: 0,
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
      setDetailOpen(true);
      setCloudState("ready");
      setCloudMessage("Objeto guardado en DynamoDB y fotos en S3.");
    } catch (error) {
      setItems((current) => [item, ...current]);
      setSelectedId(item.id);
      setDetailOpen(true);
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

  const changeMode = (nextMode: Mode) => {
    if (nextMode !== "scan" && scannerOpen) stopScanner();
    if (nextMode === "organize") setDetailOpen(false);
    setMode(nextMode);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-logo" src={stockLensLogo} alt="StockLens" />
        </div>
        <div className="inventory-status" aria-label={cloudMessage}>
          <span className={`status-light ${cloudState}`} />
          <div>
            <strong>Mi inventario</strong>
            <small>{cloudState === "ready" ? "Sincronizado" : cloudState === "local" ? "En este dispositivo" : "Actualizando"}</small>
          </div>
        </div>
      </header>

      <section className="mobile-hero" aria-label="Acciones principales">
        <div className="hero-copy">
          <span><Sparkles size={14} /> Inventario inteligente</span>
          <h1>¿Qué querés hacer?</h1>
          <p>Clasificá, encontrá y organizá tus cosas desde el celular.</p>
        </div>

        <nav className="task-nav" aria-label="Secciones">
          <button className={mode === "capture" ? "active capture" : "capture"} type="button" onClick={() => changeMode("capture")}>
            <span className="task-icon"><Camera size={22} /></span>
            <strong>Clasificar</strong>
            <small>Con foto + IA</small>
          </button>
          <button className={mode === "scan" ? "active scan" : "scan"} type="button" onClick={() => changeMode("scan")}>
            <span className="task-icon"><QrCode size={22} /></span>
            <strong>Leer QR</strong>
            <small>Abrir una ficha</small>
          </button>
          <button className={mode === "organize" ? "active organize" : "organize"} type="button" onClick={() => changeMode("organize")}>
            <span className="task-icon"><Archive size={22} /></span>
            <strong>Organizar</strong>
            <small>{items.length} objetos</small>
          </button>
        </nav>
      </section>

      {cloudState === "loading" || cloudState === "saving" ? (
        <section className={`cloud-banner ${cloudState}`}>
          <CloudIcon state={cloudState} />
          <span>{cloudMessage}</span>
        </section>
      ) : null}

      {mode === "capture" ? (
        <section className="panel capture-panel">
          <form onSubmit={createItem}>
            <div className="mode-heading">
              <span className="mode-icon capture"><Camera size={22} /></span>
              <div>
                <strong>Nuevo objeto</strong>
                <p>Sacá una foto y dejá que la IA complete la ficha.</p>
              </div>
            </div>

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
                <p>{analysisMessage || "Bedrock puede sugerir nombre, descripcion, etiquetas y checklist de identificacion."}</p>
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

      {mode === "scan" ? (
        <section className="panel scan-view">
          <div className="scan-intro">
            <span className="scan-orb"><QrCode size={30} /></span>
            <div>
              <span className="section-kicker">Encontrar</span>
              <h2>Leé una etiqueta QR</h2>
              <p>Apuntá la cámara al código para abrir la ficha y ver dónde está guardado.</p>
            </div>
          </div>

          {scannerOpen ? (
            <div className="scanner-panel">
              <video ref={videoRef} playsInline muted autoPlay />
              <canvas ref={canvasRef} aria-hidden="true" />
              <span>Centrá el QR dentro del recuadro.</span>
            </div>
          ) : (
            <div className="scan-placeholder" aria-hidden="true">
              <span className="scan-corner top-left" />
              <span className="scan-corner top-right" />
              <QrCode size={54} />
              <strong>Listo para escanear</strong>
              <small>La cámara se abrirá cuando toques el botón.</small>
              <span className="scan-corner bottom-left" />
              <span className="scan-corner bottom-right" />
            </div>
          )}

          {scanMessage ? <p className={`scan-message ${scanState}`}>{scanMessage}</p> : null}

          <div className="scan-primary-actions">
            <button type="button" className="primary-action" onClick={scannerOpen ? stopScanner : startScanner}>
              {scannerOpen ? <X size={19} /> : <Camera size={19} />}
              {scannerOpen ? "Cerrar cámara" : "Abrir cámara"}
            </button>
            <label className="secondary-action">
              <ImagePlus size={19} /> Leer desde foto
              <input type="file" accept="image/*" capture="environment" onChange={(event) => scanQr(event.target.files)} />
            </label>
          </div>

          <div className="scan-tip">
            <Sparkles size={17} />
            <span>Acercá el código y buscá buena luz para leerlo más rápido.</span>
          </div>
        </section>
      ) : null}

      {mode === "organize" ? (
        !detailOpen ? (
          <>
            <section className="inventory-heading">
              <div>
                <span className="section-kicker">Inventario</span>
                <h2>Todo en su lugar</h2>
                <p>{pending ? `${pending} ${pending === 1 ? "objeto pendiente" : "objetos pendientes"} de revisión` : "Todo está al día"}</p>
              </div>
              <strong>{items.length}</strong>
            </section>

            <section className="search-panel">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar objeto o ubicación" />
            </section>

            <section className="item-list" aria-label="Objetos del inventario">
              {filtered.map((item) => {
                const progress = item.checklist.length ? Math.round((item.checked.length / item.checklist.length) * 100) : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      setDetailOpen(true);
                    }}
                  >
                    <span className="item-thumb">
                      {item.photos[0] ? <img src={item.photos[0]} alt="" /> : <PackageCheck size={23} />}
                    </span>
                    <span className="item-card-copy">
                      <span className="item-card-meta">
                        <span>{item.category}</span>
                        <em className={`status-dot ${item.status}`}>{statusLabels[item.status]}</em>
                      </span>
                      <strong>{item.name}</strong>
                      <span className="item-location"><MapPin size={13} /> {item.location}</span>
                      <span className="item-progress"><i style={{ width: `${progress}%` }} /></span>
                      <small>{item.checked.length} de {item.checklist.length} datos revisados</small>
                    </span>
                    <ChevronRight className="item-chevron" size={19} />
                  </button>
                );
              })}

              {!filtered.length ? (
                <div className="empty-state compact">
                  <Search size={24} />
                  <strong>No encontramos objetos</strong>
                  <span>Probá con otro nombre o ubicación.</span>
                </div>
              ) : null}
            </section>
          </>
        ) : selected ? (
          <section className="item-detail-view">
            <button className="detail-back" type="button" onClick={() => setDetailOpen(false)}>
              <ArrowLeft size={18} /> Volver al inventario
            </button>

            <section className="panel detail-panel">
              <div className="detail-hero">
                <div className="detail-photo">
                  {selected.photos[0] ? <img src={selected.photos[0]} alt={selected.name} /> : <PackageCheck size={34} />}
                </div>
                <div className="detail-head">
                  <span className="detail-category">{selected.category}</span>
                  <h2>{selected.name}</h2>
                  <p><MapPin size={14} /> {selected.location}</p>
                  <small>{selected.id}</small>
                </div>
              </div>

              <div className="detail-section-title">
                <strong>Estado del objeto</strong>
                <span className={`status-dot ${selected.status}`}>{statusLabels[selected.status]}</span>
              </div>
              <div className="status-actions">
                {(["review", "identified", "labeled", "stored", "missing"] as Status[]).map((status) => (
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

              {selected.notes ? (
                <div className="detail-notes">
                  <strong>Notas</strong>
                  <p>{selected.notes}</p>
                </div>
              ) : null}

              <div className="checklist">
                <div className="section-title">
                  <strong>Datos revisados</strong>
                  <span>{selected.checked.length}/{selected.checklist.length}</span>
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
          </section>
        ) : null
      ) : null}

    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
