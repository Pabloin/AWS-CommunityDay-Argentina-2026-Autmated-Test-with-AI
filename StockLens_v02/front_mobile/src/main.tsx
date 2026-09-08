import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Minus,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import QRCode from "qrcode";
import "./styles.css";

type Photo = {
  id: string;
  label: string;
  dataUrl: string;
};

type Asset = {
  id: string;
  name: string;
  location: string;
  quantity: number;
  minQuantity: number;
  status: "ok" | "review" | "missing";
  labelText: string;
  photos: Photo[];
  updatedAt: string;
};

type Draft = {
  name: string;
  location: string;
  quantity: string;
  minQuantity: string;
  labelText: string;
  photos: Photo[];
};

const storageKey = "stocklens-mobile-state";
const maxPhotos = 4;

const sampleAssets: Asset[] = [
  {
    id: "SL-MAT-001",
    name: "Matafuego CO2 5 kg",
    location: "Auditorio",
    quantity: 8,
    minQuantity: 6,
    status: "ok",
    labelText: "Vencimiento carga: 2027-04. Puesto A1.",
    photos: [],
    updatedAt: new Date().toISOString()
  },
  {
    id: "SL-KIT-002",
    name: "Kit credenciales speaker",
    location: "Acreditacion",
    quantity: 18,
    minQuantity: 20,
    status: "review",
    labelText: "Caja S01. Revisar faltantes antes de apertura.",
    photos: [],
    updatedAt: new Date().toISOString()
  }
];

const emptyDraft: Draft = {
  name: "",
  location: "",
  quantity: "1",
  minQuantity: "0",
  labelText: "",
  photos: []
};

function createAssetId(name: string) {
  const prefix = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 8)
    .toUpperCase();
  return `SL-${prefix || "ITEM"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function loadAssets() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return sampleAssets;
  try {
    const parsed = JSON.parse(raw) as Asset[];
    return parsed.length ? parsed : sampleAssets;
  } catch {
    return sampleAssets;
  }
}

function moneylessDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function imageToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = document.createElement("img");
      image.onload = () => {
        const maxSize = 1000;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.onerror = () => reject(new Error("Foto invalida"));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function parseScan(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as { id?: string };
    return parsed.id ?? trimmed;
  } catch {
    return trimmed;
  }
}

function QrCard({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(JSON.stringify({ app: "StockLens-Mobile", id: asset.id }), {
      margin: 1,
      width: 220,
      color: { dark: "#12382f", light: "#ffffff" }
    }).then(setSrc);
  }, [asset.id]);

  return (
    <section className="qr-card">
      <div>
        <h2>QR del activo</h2>
        <p>{asset.id}</p>
      </div>
      {src ? <img src={src} alt={`QR ${asset.id}`} /> : <div className="qr-placeholder" />}
      <a href={src} download={`${asset.id}.png`}>
        Descargar QR
      </a>
    </section>
  );
}

function App() {
  const initialAssets = useMemo(loadAssets, []);
  const [assets, setAssets] = useState(initialAssets);
  const [selectedId, setSelectedId] = useState(initialAssets[0]?.id ?? "");
  const [draft, setDraft] = useState(emptyDraft);
  const [scanValue, setScanValue] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(assets));
  }, [assets]);

  const selected = assets.find((asset) => asset.id === selectedId) ?? assets[0];
  const lowStock = assets.filter((asset) => asset.quantity <= asset.minQuantity).length;
  const photoAssets = assets.filter((asset) => asset.photos.length).length;

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const available = maxPhotos - draft.photos.length;
    const selectedFiles = Array.from(files).slice(0, available);
    const photos = await Promise.all(
      selectedFiles.map(async (file, index) => ({
        id: crypto.randomUUID(),
        label: ["Producto", "Etiqueta", "Identificacion", "Estado"][draft.photos.length + index],
        dataUrl: await imageToDataUrl(file)
      }))
    );
    setDraft((current) => ({ ...current, photos: [...current.photos, ...photos] }));
  };

  const createAsset = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const asset: Asset = {
      id: createAssetId(draft.name),
      name: draft.name.trim(),
      location: draft.location.trim() || "Sin ubicacion",
      quantity: Number(draft.quantity) || 0,
      minQuantity: Number(draft.minQuantity) || 0,
      status: "ok",
      labelText: draft.labelText.trim(),
      photos: draft.photos,
      updatedAt: now
    };
    setAssets((current) => [asset, ...current]);
    setSelectedId(asset.id);
    setDraft(emptyDraft);
  };

  const updateAsset = (patch: Partial<Asset>) => {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === selected.id ? { ...asset, ...patch, updatedAt: new Date().toISOString() } : asset
      )
    );
  };

  const scan = () => {
    const id = parseScan(scanValue);
    const found = assets.find((asset) => asset.id === id);
    if (found) setSelectedId(found.id);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-mark">
          <QrCode className="brand-qr" size={27} strokeWidth={2.3} />
          <Search className="brand-lens" size={15} strokeWidth={3} aria-hidden="true" />
        </div>
        <div>
          <strong>StockLens</strong>
          <span>Mobile field app</span>
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">
          <Camera size={15} /> Fotos + QR + stock
        </span>
        <h1>Audita activos desde el celular.</h1>
        <p>Alta rapida con fotos, etiquetas, ubicacion y QR listo para campo.</p>
      </section>

      <section className="stats">
        <article>
          <strong>{assets.length}</strong>
          <span>activos</span>
        </article>
        <article className={lowStock ? "warning" : ""}>
          <strong>{lowStock}</strong>
          <span>bajo minimo</span>
        </article>
        <article>
          <strong>{photoAssets}</strong>
          <span>con fotos</span>
        </article>
      </section>

      <section className="scan-card">
        <label>
          Escanear o pegar ID
          <div className="scan-row">
            <input
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="SL-MAT-001"
            />
            <button type="button" onClick={scan} aria-label="Buscar activo">
              <Search size={18} />
            </button>
          </div>
        </label>
      </section>

      {selected ? (
        <section className="asset-card">
          <div className="asset-head">
            <div>
              <h2>{selected.name}</h2>
              <p>{selected.id}</p>
            </div>
            <span className={`status ${selected.status}`}>
              {selected.status === "ok" ? "OK" : selected.status === "review" ? "Revisar" : "Faltante"}
            </span>
          </div>

          <div className="stock-line">
            <div>
              <strong>{selected.quantity}</strong>
              <span>en {selected.location}</span>
            </div>
            {selected.quantity <= selected.minQuantity ? (
              <AlertTriangle size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
          </div>

          <div className="actions">
            <button type="button" onClick={() => updateAsset({ quantity: selected.quantity + 1 })}>
              <Plus size={18} /> Entrada
            </button>
            <button
              type="button"
              onClick={() => updateAsset({ quantity: Math.max(0, selected.quantity - 1) })}
            >
              <Minus size={18} /> Salida
            </button>
            <button type="button" onClick={() => updateAsset({ status: "ok" })}>
              <ShieldCheck size={18} /> OK
            </button>
            <button type="button" onClick={() => updateAsset({ status: "review" })}>
              <ClipboardList size={18} /> Revisar
            </button>
          </div>

          <div className="photo-grid">
            {selected.photos.length ? (
              selected.photos.map((photo) => (
                <figure key={photo.id}>
                  <img src={photo.dataUrl} alt={photo.label} />
                  <figcaption>{photo.label}</figcaption>
                </figure>
              ))
            ) : (
              <div className="empty-photos">Sin fotos cargadas</div>
            )}
          </div>

          <div className="label-box">
            <strong>Etiqueta / identificacion</strong>
            <p>{selected.labelText || "Sin texto asociado."}</p>
            <small>Actualizado {moneylessDate(selected.updatedAt)}</small>
          </div>
        </section>
      ) : null}

      {selected ? <QrCard asset={selected} /> : null}

      <section className="create-card">
        <h2>Nuevo activo</h2>
        <form onSubmit={createAsset}>
          <label>
            Nombre
            <input
              required
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Matafuego ABC 10 kg"
            />
          </label>
          <label>
            Ubicacion
            <input
              value={draft.location}
              onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              placeholder="Auditorio, stand, deposito"
            />
          </label>
          <div className="two-cols">
            <label>
              Stock
              <input
                type="number"
                min="0"
                value={draft.quantity}
                onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
              />
            </label>
            <label>
              Minimo
              <input
                type="number"
                min="0"
                value={draft.minQuantity}
                onChange={(event) => setDraft({ ...draft, minQuantity: event.target.value })}
              />
            </label>
          </div>
          <label>
            Fotos
            <div className="upload">
              <UploadCloud size={22} />
              <span>{draft.photos.length ? `${draft.photos.length}/4 cargadas` : "Sacar o subir fotos"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(event) => addPhotos(event.target.files)}
                disabled={draft.photos.length >= maxPhotos}
              />
            </div>
          </label>
          {draft.photos.length ? (
            <div className="draft-photos">
              {draft.photos.map((photo) => (
                <img key={photo.id} src={photo.dataUrl} alt={photo.label} />
              ))}
            </div>
          ) : null}
          <label>
            Texto de etiqueta
            <textarea
              value={draft.labelText}
              onChange={(event) => setDraft({ ...draft, labelText: event.target.value })}
              placeholder="Numero de serie, vencimiento, lote, fabricante"
            />
          </label>
          <button type="submit">
            <QrCode size={18} /> Crear activo y QR
          </button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
