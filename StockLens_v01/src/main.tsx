import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  Camera,
  Check,
  Download,
  Edit3,
  Flame,
  History,
  Image,
  Layers3,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import QRCode from "qrcode";
import "./styles.css";

type MovementType = "entrada" | "salida" | "ajuste";

type AssetPhoto = {
  id: string;
  label: string;
  dataUrl: string;
  capturedAt: string;
};

type StockItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  notes: string;
  labelText: string;
  photos: AssetPhoto[];
  createdAt: string;
  updatedAt: string;
};

type Movement = {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  amount: number;
  before: number;
  after: number;
  note: string;
  createdAt: string;
};

type FormState = {
  name: string;
  category: string;
  location: string;
  quantity: string;
  minQuantity: string;
  unit: string;
  notes: string;
  labelText: string;
  photos: AssetPhoto[];
};

type QRPayload = {
  app: "QR-Stock-v02" | "QR-Stock-v01";
  id: string;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
      };
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

const STORAGE_KEY = "stocklens-v02-state";
const LEGACY_STORAGE_KEY = "qr-stock-v01-state";
const MAX_PHOTOS = 4;

const starterItems: StockItem[] = [
  {
    id: "MAT-CO2-001",
    name: "Matafuego CO2 5 kg",
    category: "Seguridad",
    location: "Auditorio principal",
    quantity: 14,
    minQuantity: 10,
    unit: "unidades",
    notes: "Control visual mensual. Vencimiento de carga: 2027-04.",
    labelText: "Etiqueta: IRAM ABC / carga 2027-04 / puesto A1",
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "MAT-ABC-002",
    name: "Matafuego ABC 10 kg",
    category: "Seguridad",
    location: "Backstage y deposito",
    quantity: 7,
    minQuantity: 8,
    unit: "unidades",
    notes: "Reponer una unidad antes del evento.",
    labelText: "Etiqueta pendiente de verificar en deposito.",
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "KIT-CRED-003",
    name: "Credenciales expositor",
    category: "Operaciones",
    location: "Mesa de acreditacion",
    quantity: 320,
    minQuantity: 80,
    unit: "credenciales",
    notes: "Incluye lanyards y porta credenciales.",
    labelText: "Lote impreso: expositores / AWS Community Day Argentina 2026.",
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const emptyForm: FormState = {
  name: "",
  category: "",
  location: "",
  quantity: "1",
  minQuantity: "0",
  unit: "unidades",
  notes: "",
  labelText: "",
  photos: []
};

function createId(name: string) {
  const prefix = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12)
    .toUpperCase();
  return `${prefix || "ITEM"}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function parseQrValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<QRPayload>;
    if (
      (parsed.app === "QR-Stock-v02" || parsed.app === "QR-Stock-v01") &&
      typeof parsed.id === "string"
    ) {
      return parsed.id;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function normalizeItems(items: StockItem[]) {
  return items.map((item) => ({
    ...item,
    labelText: item.labelText ?? "",
    photos: item.photos ?? []
  }));
}

function imageFileToDataUrl(file: File) {
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
        const context = canvas.getContext("2d");
        context?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("No se pudo procesar la foto."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return { items: starterItems, movements: [] as Movement[] };
  }

  try {
    const parsed = JSON.parse(raw) as { items: StockItem[]; movements: Movement[] };
    return {
      items: parsed.items?.length ? normalizeItems(parsed.items) : starterItems,
      movements: parsed.movements ?? []
    };
  } catch {
    return { items: starterItems, movements: [] as Movement[] };
  }
}

function QrImage({ item }: { item: StockItem }) {
  const [src, setSrc] = useState("");
  const value = JSON.stringify({ app: "QR-Stock-v02", id: item.id });

  useEffect(() => {
    QRCode.toDataURL(value, {
      margin: 1,
      width: 240,
      color: {
        dark: "#10231d",
        light: "#ffffff"
      }
    }).then(setSrc);
  }, [value]);

  const download = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `${item.id}.png`;
    link.click();
  };

  const print = () => {
    const printWindow = window.open("", "qr-print", "width=420,height=620");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>${item.id}</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 32px;">
          <img src="${src}" alt="QR ${item.id}" style="width: 260px; height: 260px;" />
          <h1 style="font-size: 22px;">${item.name}</h1>
          <p style="font-size: 15px;">${item.id}</p>
          <p style="font-size: 14px;">${item.location}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="qr-box">
      {src ? <img src={src} alt={`QR de ${item.name}`} /> : <div className="qr-placeholder" />}
      <div className="qr-actions">
        <button type="button" onClick={download} aria-label="Descargar QR">
          <Download size={17} />
        </button>
        <button type="button" onClick={print} aria-label="Imprimir QR">
          <Printer size={17} />
        </button>
      </div>
    </div>
  );
}

function PhotoStrip({ item }: { item: StockItem }) {
  if (!item.photos.length) {
    return (
      <div className="photo-empty">
        <Image size={26} />
        <span>Sin fotos asociadas todavia.</span>
      </div>
    );
  }

  return (
    <div className="photo-strip">
      {item.photos.map((photo) => (
        <figure key={photo.id}>
          <img src={photo.dataUrl} alt={`${photo.label} de ${item.name}`} />
          <figcaption>
            <strong>{photo.label}</strong>
            <small>{formatDate(photo.capturedAt)}</small>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Scanner({
  onDetected,
  active
}: {
  onDetected: (itemId: string) => void;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState("Listo para iniciar camara");

  useEffect(() => {
    if (!active) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Este navegador no permite leer camara desde esta pagina.");
        return;
      }

      if (!window.BarcodeDetector) {
        setStatus("Lector automatico no disponible. Usar ingreso manual de codigo.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("Buscando QR...");

        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const scan = async () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          const currentVideo = videoRef.current;

          if (canvas && currentVideo?.videoWidth) {
            canvas.width = currentVideo.videoWidth;
            canvas.height = currentVideo.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
            const codes = await detector.detect(canvas);
            const itemId = codes[0]?.rawValue ? parseQrValue(codes[0].rawValue) : null;
            if (itemId) {
              setStatus(`QR detectado: ${itemId}`);
              onDetected(itemId);
            }
          }

          frame = requestAnimationFrame(scan);
        };

        frame = requestAnimationFrame(scan);
      } catch {
        setStatus("No se pudo acceder a la camara. Revisar permisos del navegador.");
      }
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, onDetected]);

  return (
    <div className="scanner">
      <video ref={videoRef} muted playsInline aria-label="Vista de camara para escanear QR" />
      <canvas ref={canvasRef} hidden />
      <p>{status}</p>
    </div>
  );
}

function App() {
  const initialState = useMemo(loadState, []);
  const [items, setItems] = useState<StockItem[]>(initialState.items);
  const [movements, setMovements] = useState<Movement[]>(initialState.movements);
  const [selectedId, setSelectedId] = useState(initialState.items[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [scanInput, setScanInput] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [movementAmount, setMovementAmount] = useState("1");
  const [movementNote, setMovementNote] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, movements }));
  }, [items, movements]);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  const filteredItems = items.filter((item) => {
    const haystack = `${item.id} ${item.name} ${item.category} ${item.location}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const lowStock = items.filter((item) => item.quantity <= item.minQuantity).length;
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
  const visualRecords = items.filter((item) => item.photos.length > 0).length;

  const selectFromQr = (rawValue: string) => {
    const itemId = parseQrValue(rawValue);
    if (!itemId) return;
    const match = items.find((item) => item.id === itemId);
    if (match) {
      setSelectedId(match.id);
      setScannerOpen(false);
    } else {
      setScanInput(itemId);
    }
  };

  const addItem = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const item: StockItem = {
      id: createId(form.name),
      name: form.name.trim(),
      category: form.category.trim() || "General",
      location: form.location.trim() || "Sin ubicacion",
      quantity: Number(form.quantity) || 0,
      minQuantity: Number(form.minQuantity) || 0,
      unit: form.unit.trim() || "unidades",
      notes: form.notes.trim(),
      labelText: form.labelText.trim(),
      photos: form.photos,
      createdAt: now,
      updatedAt: now
    };

    if (!item.name) return;

    setItems((current) => [item, ...current]);
    setSelectedId(item.id);
    setForm(emptyForm);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;

    const slots = MAX_PHOTOS - form.photos.length;
    const selectedFiles = Array.from(files).slice(0, slots);
    const photos = await Promise.all(
      selectedFiles.map(async (file, index) => ({
        id: crypto.randomUUID(),
        label:
          form.photos.length + index === 0
            ? "Producto"
            : form.photos.length + index === 1
              ? "Etiqueta"
              : form.photos.length + index === 2
                ? "Identificacion"
                : "Estado",
        dataUrl: await imageFileToDataUrl(file),
        capturedAt: new Date().toISOString()
      })
      )
    );

    setForm((current) => ({
      ...current,
      photos: [...current.photos, ...photos].slice(0, MAX_PHOTOS)
    }));
  };

  const removeFormPhoto = (photoId: string) => {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId)
    }));
  };

  const updateFormPhotoLabel = (photoId: string, label: string) => {
    setForm((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        photo.id === photoId ? { ...photo, label } : photo
      )
    }));
  };

  const recordMovement = (type: MovementType) => {
    if (!selected) return;
    const amount = Math.max(0, Number(movementAmount) || 0);
    if (amount === 0 && type !== "ajuste") return;

    const before = selected.quantity;
    const after =
      type === "entrada"
        ? before + amount
        : type === "salida"
          ? Math.max(0, before - amount)
          : amount;

    const now = new Date().toISOString();
    const movement: Movement = {
      id: crypto.randomUUID(),
      itemId: selected.id,
      itemName: selected.name,
      type,
      amount,
      before,
      after,
      note: movementNote.trim(),
      createdAt: now
    };

    setItems((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, quantity: after, updatedAt: now } : item
      )
    );
    setMovements((current) => [movement, ...current].slice(0, 20));
    setMovementNote("");
    setMovementAmount("1");
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) {
      const next = items.find((item) => item.id !== id);
      setSelectedId(next?.id ?? "");
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <span className="eyebrow">
            <QrCode size={16} /> StockLens
          </span>
          <h1>StockLens</h1>
          <p>
            Inventario visual con QR: identifica activos, valida etiquetas y controla
            movimientos desde una ficha unica con fotos asociadas.
          </p>
        </div>
        <div className="value-strip" aria-label="Propuesta de valor de StockLens">
          <span>
            <Camera size={16} /> Fotos
          </span>
          <span>
            <QrCode size={16} /> QR
          </span>
          <span>
            <Layers3 size={16} /> Stock
          </span>
          <span>
            <History size={16} /> Trazabilidad
          </span>
        </div>
        <div className="hero-metrics" aria-label="Resumen de inventario">
          <div>
            <strong>{items.length}</strong>
            <span>activos</span>
          </div>
          <div>
            <strong>{totalUnits}</strong>
            <span>unidades</span>
          </div>
          <div className={lowStock ? "metric-alert" : ""}>
            <strong>{lowStock}</strong>
            <span>bajo minimo</span>
          </div>
          <div>
            <strong>{visualRecords}</strong>
            <span>con fotos</span>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="inventory-panel" aria-label="Inventario">
          <div className="panel-header">
            <div>
              <h2>Inventario</h2>
              <p>Buscar, seleccionar y controlar activos.</p>
            </div>
            <Archive size={22} />
          </div>

          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, QR o ubicacion"
            />
          </label>

          <div className="item-list">
            {filteredItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`item-row ${selected?.id === item.id ? "selected" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.location}</small>
                </span>
                <b className={item.quantity <= item.minQuantity ? "danger" : ""}>
                  {item.quantity}
                </b>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-panel" aria-label="Detalle del activo">
          {selected ? (
            <>
              <div className="detail-head">
                <div>
                  <span className="tag">{selected.category}</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.id}</p>
                </div>
                <button
                  className="icon-danger"
                  type="button"
                  onClick={() => removeItem(selected.id)}
                  aria-label="Eliminar activo"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="asset-grid">
                <QrImage item={selected} />
                <div className="stock-card">
                  <span>Stock actual</span>
                  <strong>{selected.quantity}</strong>
                  <p>
                    {selected.unit} en {selected.location}
                  </p>
                  {selected.quantity <= selected.minQuantity ? (
                    <div className="alert-line">
                      <ShieldAlert size={17} />
                      Debajo del minimo ({selected.minQuantity})
                    </div>
                  ) : (
                    <div className="ok-line">
                      <Check size={17} />
                      Stock operativo
                    </div>
                  )}
                </div>
                <div className="notes-card">
                  <span>Notas</span>
                  <p>{selected.notes || "Sin notas operativas."}</p>
                  {selected.labelText ? (
                    <>
                      <span>Texto de etiqueta</span>
                      <p>{selected.labelText}</p>
                    </>
                  ) : null}
                  <small>Actualizado: {formatDate(selected.updatedAt)}</small>
                </div>
              </div>

              <div className="evidence-panel">
                <div className="panel-header">
                  <div>
                    <h3>Evidencia visual</h3>
                    <p>Fotos asociadas al QR para validar producto, etiqueta y estado.</p>
                  </div>
                  <Image size={22} />
                </div>
                <PhotoStrip item={selected} />
              </div>

              <div className="movement-panel">
                <h3>Movimiento rapido</h3>
                <div className="movement-controls">
                  <label>
                    Cantidad
                    <input
                      type="number"
                      min="0"
                      value={movementAmount}
                      onChange={(event) => setMovementAmount(event.target.value)}
                    />
                  </label>
                  <label>
                    Nota
                    <input
                      value={movementNote}
                      onChange={(event) => setMovementNote(event.target.value)}
                      placeholder="Ej: conteo fisico, reposicion, uso"
                    />
                  </label>
                </div>
                <div className="movement-actions">
                  <button type="button" onClick={() => recordMovement("entrada")}>
                    <Plus size={17} /> Entrada
                  </button>
                  <button type="button" onClick={() => recordMovement("salida")}>
                    <Minus size={17} /> Salida
                  </button>
                  <button type="button" onClick={() => recordMovement("ajuste")}>
                    <Edit3 size={17} /> Ajustar total
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <PackagePlus size={34} />
              <h2>Crear el primer activo</h2>
              <p>Usa el formulario para cargar stock y generar su QR.</p>
            </div>
          )}
        </section>

        <aside className="ops-panel" aria-label="Operaciones">
          <div className="scanner-card">
            <div className="panel-header">
              <div>
                <h2>Escanear QR</h2>
                <p>Leer desde camara o pegar el codigo.</p>
              </div>
              <ScanLine size={22} />
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => setScannerOpen((open) => !open)}
            >
              {scannerOpen ? <X size={18} /> : <Camera size={18} />}
              {scannerOpen ? "Cerrar lector" : "Abrir lector"}
            </button>
            {scannerOpen ? <Scanner active={scannerOpen} onDetected={selectFromQr} /> : null}
            <label className="manual-scan">
              Codigo QR o ID
              <div>
                <input
                  value={scanInput}
                  onChange={(event) => setScanInput(event.target.value)}
                  placeholder="MAT-CO2-001"
                />
                <button type="button" onClick={() => selectFromQr(scanInput)}>
                  <Search size={17} />
                </button>
              </div>
            </label>
          </div>

          <form className="create-card" onSubmit={addItem}>
            <div className="panel-header">
              <div>
              <h2>Nuevo activo</h2>
                <p>Alta con fotos, ID y QR.</p>
              </div>
              <PackagePlus size={22} />
            </div>
            <label>
              Nombre
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ej: Matafuego ABC 5 kg"
              />
            </label>
            <div className="two-cols">
              <label>
                Categoria
                <input
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="Seguridad"
                />
              </label>
              <label>
                Unidad
                <input
                  value={form.unit}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                />
              </label>
            </div>
            <label>
              Ubicacion
              <input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                placeholder="Deposito, stand, sala"
              />
            </label>
            <div className="two-cols">
              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                />
              </label>
              <label>
                Minimo
                <input
                  type="number"
                  min="0"
                  value={form.minQuantity}
                  onChange={(event) => setForm({ ...form, minQuantity: event.target.value })}
                />
              </label>
            </div>
            <label>
              Fotos del producto o etiqueta
              <div className="upload-zone">
                <UploadCloud size={22} />
                <span>
                  {form.photos.length
                    ? `${form.photos.length}/${MAX_PHOTOS} fotos cargadas`
                    : "Cargar hasta 4 fotos"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(event) => addPhotos(event.target.files)}
                  disabled={form.photos.length >= MAX_PHOTOS}
                />
              </div>
            </label>
            {form.photos.length ? (
              <div className="form-photo-grid">
                {form.photos.map((photo) => (
                  <div className="form-photo" key={photo.id}>
                    <img src={photo.dataUrl} alt={photo.label} />
                    <input
                      value={photo.label}
                      onChange={(event) => updateFormPhotoLabel(photo.id, event.target.value)}
                      aria-label="Etiqueta de foto"
                    />
                    <button
                      type="button"
                      onClick={() => removeFormPhoto(photo.id)}
                      aria-label="Quitar foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <label>
              Texto visible de etiqueta o identificacion
              <textarea
                value={form.labelText}
                onChange={(event) => setForm({ ...form, labelText: event.target.value })}
                placeholder="Ej: numero de serie, vencimiento, lote, fabricante"
              />
            </label>
            <label>
              Notas
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Vencimiento, responsable, lote, estado"
              />
            </label>
            <button className="primary-button" type="submit">
              <QrCode size={18} /> Crear y generar QR
            </button>
          </form>
        </aside>
      </section>

      <section className="history-panel">
        <div className="panel-header">
          <div>
            <h2>Ultimos movimientos</h2>
            <p>Historial local de entradas, salidas y ajustes.</p>
          </div>
          <History size={22} />
        </div>
        <div className="history-list">
          {movements.length ? (
            movements.map((movement) => (
              <div className="history-row" key={movement.id}>
                <span className={`movement-dot ${movement.type}`} />
                <div>
                  <strong>{movement.itemName}</strong>
                  <p>
                    {movement.type} de {movement.amount}: {movement.before} {"->"}{" "}
                    {movement.after}
                  </p>
                  {movement.note ? <small>{movement.note}</small> : null}
                </div>
                <time>{formatDate(movement.createdAt)}</time>
              </div>
            ))
          ) : (
            <div className="empty-history">
              <Flame size={22} />
              Todavia no hay movimientos registrados.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
