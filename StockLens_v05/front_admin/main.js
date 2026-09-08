const apiBaseUrl = window.STOCKLENS_API_BASE_URL || "";
const statusLabels = {
  review: "Para revisar",
  ready: "Listo para vender",
  published: "Publicado",
  sold: "Vendido",
  keep: "No vender"
};

let items = [];

const grid = document.querySelector("#grid");
const message = document.querySelector("#message");
const search = document.querySelector("#search");
const status = document.querySelector("#status");
const refresh = document.querySelector("#refresh");
const total = document.querySelector("#total");
const photos = document.querySelector("#photos");
const ready = document.querySelector("#ready");

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSummary() {
  total.textContent = String(items.length);
  photos.textContent = String(items.reduce((sum, item) => sum + (item.photos?.length ?? 0), 0));
  ready.textContent = String(items.filter((item) => item.status === "ready" || item.status === "published").length);
}

function visibleItems() {
  const term = search.value.trim().toLowerCase();
  const selectedStatus = status.value;
  return items.filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.location} ${(item.aiTags ?? []).join(" ")}`.toLowerCase();
    return (!selectedStatus || item.status === selectedStatus) && (!term || haystack.includes(term));
  });
}

function render() {
  renderSummary();
  const nextItems = visibleItems();
  message.textContent = nextItems.length ? "" : "No hay objetos para mostrar.";
  grid.innerHTML = nextItems
    .map((item) => {
      const firstPhoto = item.photos?.[0]?.url;
      const tags = (item.aiTags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
      const checklist = (item.checklist ?? []).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
      return `
        <article class="card">
          <div class="photo">${firstPhoto ? `<img src="${firstPhoto}" alt="${escapeHtml(item.name)}" />` : "Sin foto"}</div>
          <div class="content">
            <div class="head">
              <div>
                <h2>${escapeHtml(item.name)}</h2>
                <p>${escapeHtml(item.category)} · ${escapeHtml(item.location)}</p>
              </div>
              <span class="status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] ?? item.status)}</span>
            </div>
            <strong>${money(item.price)}</strong>
            ${tags ? `<div class="tags">${tags}</div>` : ""}
            ${item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : ""}
            ${checklist ? `<ul class="checklist">${checklist}</ul>` : ""}
            <div class="updated">${escapeHtml(item.id)} · ${escapeHtml(new Date(item.updatedAt).toLocaleString("es-AR"))}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadItems() {
  if (!apiBaseUrl) {
    message.textContent = "Falta configurar STOCKLENS_API_BASE_URL.";
    return;
  }

  refresh.disabled = true;
  message.textContent = "Cargando catalogo cloud...";
  try {
    const result = await fetch(`${apiBaseUrl}/items`);
    if (!result.ok) throw new Error("La API no respondio correctamente.");
    const payload = await result.json();
    items = payload.items ?? [];
    render();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "No se pudo cargar el catalogo.";
  } finally {
    refresh.disabled = false;
  }
}

search.addEventListener("input", render);
status.addEventListener("change", render);
refresh.addEventListener("click", loadItems);
loadItems();
