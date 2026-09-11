const state = { runs: [], selected: "" };
const runsNode = document.querySelector("#runs");
const detailNode = document.querySelector("#detail");

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusLabel(status) {
  return status === "success" ? "Aprobado" : status === "failure" ? "Bloqueado" : status;
}

function testMarker(status) {
  if (status === "passed") return "✓";
  if (status === "skipped") return "–";
  return "×";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function link(label, href, className = "action-link") {
  const node = element("a", className, label);
  node.href = href;
  node.target = "_blank";
  node.rel = "noreferrer";
  return node;
}

function renderMetrics() {
  const latest = state.runs[0];
  document.querySelector("#runCount").textContent = state.runs.length;
  document.querySelector("#latestStatus").textContent = latest ? statusLabel(latest.status) : "-";
  document.querySelector("#testCount").textContent = latest?.tests?.length ?? 0;
  document.querySelector("#videoCount").textContent = latest?.videos?.length ?? 0;
}

function renderRuns() {
  runsNode.replaceChildren();
  for (const run of state.runs) {
    const button = element("button", `run ${run.runId === state.selected ? "selected" : ""}`);
    button.type = "button";
    button.append(
      element("span", `status ${run.status}`, statusLabel(run.status)),
      element("strong", "", `Run ${run.runId}`),
      element("small", "", `${formatDate(run.createdAt)} · ${run.commitSha.slice(0, 7)}`)
    );
    button.addEventListener("click", () => {
      state.selected = run.runId;
      render();
    });
    runsNode.append(button);
  }
}

function renderTests(run, container) {
  const section = element("section", "result-section");
  section.append(element("h3", "", "Tests"));
  const list = element("div", "test-list");
  for (const test of run.tests ?? []) {
    const row = element("div", "test-row");
    const marker = element("span", `test-marker ${test.status}`, testMarker(test.status));
    const copy = element("div");
    copy.append(
      element("strong", "", test.title),
      element("small", "", `${test.project} · ${(test.durationMs / 1000).toFixed(1)} s`)
    );
    if (test.error) copy.append(element("p", "test-error", test.error));
    row.append(marker, copy);
    list.append(row);
  }
  if (!run.tests?.length) list.append(element("p", "muted", "No se encontró el resumen estructurado."));
  section.append(list);
  container.append(section);
}

function renderVideos(run, container) {
  const section = element("section", "result-section");
  section.append(element("h3", "", "Videos del navegador"));
  const grid = element("div", "video-grid");
  for (const video of run.videos ?? []) {
    const figure = element("figure");
    const media = element("video");
    media.src = video.url;
    media.controls = true;
    media.preload = "metadata";
    figure.append(media, element("figcaption", "", video.name));
    grid.append(figure);
  }
  if (!run.videos?.length) grid.append(element("p", "muted", "Esta ejecución no produjo videos."));
  section.append(grid);
  container.append(section);
}

function renderDetail() {
  const run = state.runs.find((candidate) => candidate.runId === state.selected);
  detailNode.replaceChildren();
  if (!run) {
    const empty = element("div", "empty");
    empty.append(element("h2", "", "Sin evidencia publicada"));
    detailNode.append(empty);
    return;
  }

  const header = element("header", "detail-head");
  const title = element("div");
  title.append(
    element("span", `status ${run.status}`, statusLabel(run.status)),
    element("h2", "", `Run ${run.runId}`),
    element("p", "", `${formatDate(run.createdAt)} · intento ${run.attempt} · ${run.commitSha.slice(0, 7)}`)
  );
  const actions = element("div", "actions");
  actions.append(link("Reporte HTML", run.reportUrl), link("GitHub Actions", run.githubUrl, "action-link secondary"));
  header.append(title, actions);
  detailNode.append(header);
  renderTests(run, detailNode);
  renderVideos(run, detailNode);

  if (run.screenshots?.length || run.traces?.length) {
    const files = element("section", "result-section files");
    files.append(element("h3", "", "Diagnóstico"));
    for (const screenshot of run.screenshots ?? []) files.append(link(`Captura · ${screenshot.name}`, screenshot.url, "file-link"));
    for (const trace of run.traces ?? []) files.append(link(`Trace técnico · ${trace.name}`, trace.url, "file-link"));
    detailNode.append(files);
  }
}

function render() {
  renderMetrics();
  renderRuns();
  renderDetail();
}

async function load() {
  const refresh = document.querySelector("#refresh");
  refresh.disabled = true;
  try {
    const response = await fetch(`./index.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.runs = Array.isArray(payload.runs) ? payload.runs : [];
    if (!state.runs.some((run) => run.runId === state.selected)) state.selected = state.runs[0]?.runId ?? "";
    render();
  } finally {
    refresh.disabled = false;
  }
}

document.querySelector("#refresh").addEventListener("click", load);
load().catch(() => render());
