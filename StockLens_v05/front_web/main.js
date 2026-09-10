const apiBaseUrl = window.STOCKLENS_API_BASE_URL || "";
const mobileAppUrl = window.STOCKLENS_MOBILE_APP_URL || "https://mobile-v5.lens.glaciar.org";
const statusLabels = {
  review: "Para revisar",
  identified: "Identificado",
  labeled: "Con QR",
  stored: "Guardado",
  missing: "No ubicado",
  ready: "Con QR",
  published: "Guardado",
  sold: "Guardado",
  keep: "Para revisar"
};

let items = [];
let selectedId = "";

const grid = document.querySelector("#grid");
const detail = document.querySelector("#detail");
const message = document.querySelector("#message");
const search = document.querySelector("#search");
const status = document.querySelector("#status");
const refresh = document.querySelector("#refresh");
const total = document.querySelector("#total");
const photos = document.querySelector("#photos");
const ready = document.querySelector("#ready");
const resultCount = document.querySelector("#result-count");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemLink(itemId) {
  const url = new URL(mobileAppUrl);
  url.searchParams.set("item", itemId);
  return url.toString();
}

function itemQrUrl(item) {
  return `${apiBaseUrl}${item.qrUrl || `/items/${encodeURIComponent(item.id)}/qr`}`;
}

function renderSummary() {
  total.textContent = String(items.length);
  photos.textContent = String(items.reduce((sum, item) => sum + (item.photos?.length ?? 0), 0));
  ready.textContent = String(items.filter((item) => ["labeled", "stored", "ready"].includes(item.status)).length);
}

function visibleItems() {
  const term = search.value.trim().toLowerCase();
  const selectedStatus = status.value;
  return items.filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.location} ${(item.aiTags ?? []).join(" ")}`.toLowerCase();
    return (!selectedStatus || item.status === selectedStatus) && (!term || haystack.includes(term));
  });
}

function photoMarkup(item, className = "") {
  const photo = item.photos?.[0]?.url;
  return photo
    ? `<img class="${className}" src="${photo}" alt="${escapeHtml(item.name)}" />`
    : `<span class="empty-photo ${className}" aria-hidden="true">▣</span>`;
}

function renderDetail(item) {
  if (!item) {
    detail.innerHTML = `
      <div class="detail-empty">
        <span>⌁</span><strong>Elegí un objeto</strong>
        <p>Su ficha, fotos y etiqueta QR aparecerán acá.</p>
      </div>`;
    return;
  }

  const checked = item.checked ?? [];
  const checklist = item.checklist ?? [];
  const progress = checklist.length ? Math.round((checked.length / checklist.length) * 100) : 0;
  const tags = (item.aiTags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const checklistMarkup = checklist.length
    ? checklist.map((entry) => `<li class="${checked.includes(entry) ? "done" : ""}"><i>${checked.includes(entry) ? "✓" : ""}</i>${escapeHtml(entry)}</li>`).join("")
    : "<li>Sin datos para revisar.</li>";
  const link = itemLink(item.id);

  detail.innerHTML = `
    <article class="detail-card">
      <div class="detail-photo">${photoMarkup(item, "detail-photo-image")}</div>
      <div class="detail-title">
        <span class="category">${escapeHtml(item.category)}</span>
        <h2>${escapeHtml(item.name)}</h2>
        <p>⌖ ${escapeHtml(item.location)}</p>
        <span class="status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] ?? item.status)}</span>
      </div>

      <section class="detail-progress">
        <div><strong>Ficha revisada</strong><span>${checked.length}/${checklist.length || 0}</span></div>
        <b><i style="width: ${progress}%"></i></b>
      </section>

      ${item.notes ? `<section class="notes"><strong>Notas</strong><p>${escapeHtml(item.notes)}</p></section>` : ""}
      ${tags ? `<div class="tags">${tags}</div>` : ""}

      <section class="qr-card">
        <img src="${itemQrUrl(item)}" alt="QR de ${escapeHtml(item.name)}" />
        <div>
          <span>Etiqueta QR</span>
          <strong>Lista para compartir</strong>
          <small>${escapeHtml(item.id)}</small>
          <a href="${link}" target="_blank" rel="noreferrer">Abrir ficha móvil ↗</a>
        </div>
      </section>

      <section class="review-list">
        <div class="section-title"><strong>Datos a revisar</strong><span>${checklist.length} pasos</span></div>
        <ul>${checklistMarkup}</ul>
      </section>
      <footer>Actualizado ${escapeHtml(new Date(item.updatedAt).toLocaleString("es-AR"))}</footer>
    </article>`;
}

function render() {
  renderSummary();
  const nextItems = visibleItems();
  resultCount.textContent = `${nextItems.length} ${nextItems.length === 1 ? "objeto" : "objetos"}`;
  if (!nextItems.some((item) => item.id === selectedId)) selectedId = nextItems[0]?.id ?? "";
  message.textContent = nextItems.length ? "" : "No encontramos objetos con esos filtros.";

  grid.innerHTML = nextItems.map((item) => {
    const progress = item.checklist?.length ? Math.round(((item.checked?.length ?? 0) / item.checklist.length) * 100) : 0;
    return `
      <button class="item-card ${item.id === selectedId ? "selected" : ""}" type="button" data-id="${escapeHtml(item.id)}">
        <span class="item-photo">${photoMarkup(item, "item-photo-image")}</span>
        <span class="item-copy">
          <span class="item-meta"><span>${escapeHtml(item.category)}</span><em class="status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] ?? item.status)}</em></span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>⌖ ${escapeHtml(item.location)}</small>
          <b class="mini-progress"><i style="width: ${progress}%"></i></b>
        </span>
        <span class="arrow">›</span>
      </button>`;
  }).join("");

  renderDetail(nextItems.find((item) => item.id === selectedId));
}

async function loadItems() {
  if (!apiBaseUrl) {
    message.textContent = "Falta configurar STOCKLENS_API_BASE_URL.";
    return;
  }

  refresh.disabled = true;
  message.textContent = "Cargando catálogo cloud…";
  try {
    const result = await fetch(`${apiBaseUrl}/items`);
    if (!result.ok) throw new Error("La API no respondió correctamente.");
    const payload = await result.json();
    items = payload.items ?? [];
    render();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "No se pudo cargar el catálogo.";
  } finally {
    refresh.disabled = false;
  }
}

grid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  selectedId = card.dataset.id;
  render();
});
search.addEventListener("input", render);
status.addEventListener("change", render);
refresh.addEventListener("click", loadItems);
loadItems();
