const indexUrl = "./evidence/index.json";
const state = {
  runs: [],
  selectedRunId: ""
};

const elements = {
  runCount: document.querySelector("#runCount"),
  lastStatus: document.querySelector("#lastStatus"),
  videoCount: document.querySelector("#videoCount"),
  runsList: document.querySelector("#runsList"),
  emptyState: document.querySelector("#emptyState"),
  runDetail: document.querySelector("#runDetail"),
  detailStatus: document.querySelector("#detailStatus"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  githubRunLink: document.querySelector("#githubRunLink"),
  videoGrid: document.querySelector("#videoGrid"),
  linksGrid: document.querySelector("#linksGrid"),
  refreshButton: document.querySelector("#refreshButton")
};

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusClass(status) {
  if (status === "success") return "success";
  if (status === "failure") return "failure";
  return "neutral";
}

function setText(node, value) {
  node.textContent = String(value ?? "-");
}

function renderSummary() {
  const videos = state.runs.reduce((count, run) => count + (run.videos?.length ?? 0), 0);
  setText(elements.runCount, state.runs.length);
  setText(elements.lastStatus, state.runs[0]?.status ?? "-");
  setText(elements.videoCount, videos);
}

function renderRuns() {
  elements.runsList.replaceChildren();

  if (!state.runs.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No hay runs publicados.";
    elements.runsList.append(empty);
    return;
  }

  state.runs.forEach((run) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `run-row ${run.runId === state.selectedRunId ? "selected" : ""}`;
    button.addEventListener("click", () => {
      state.selectedRunId = run.runId;
      render();
    });

    const title = document.createElement("strong");
    title.textContent = `Run ${run.runId}`;

    const meta = document.createElement("small");
    meta.textContent = `${run.status} · ${formatDate(run.createdAt)} · ${run.commitSha?.slice(0, 7) ?? "-"}`;

    button.append(title, meta);
    elements.runsList.append(button);
  });
}

function linkCard(label, href, hint) {
  const anchor = document.createElement("a");
  anchor.className = "link-card";
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";

  const title = document.createElement("strong");
  title.textContent = label;

  const small = document.createElement("small");
  small.textContent = hint;

  anchor.append(title, small);
  return anchor;
}

function renderDetail() {
  const run = state.runs.find((item) => item.runId === state.selectedRunId);
  elements.videoGrid.replaceChildren();
  elements.linksGrid.replaceChildren();

  if (!run) {
    elements.emptyState.hidden = false;
    elements.runDetail.hidden = true;
    return;
  }

  elements.emptyState.hidden = true;
  elements.runDetail.hidden = false;
  elements.detailStatus.className = `status-pill ${statusClass(run.status)}`;
  setText(elements.detailStatus, run.status);
  setText(elements.detailTitle, `Run ${run.runId}`);
  setText(
    elements.detailMeta,
    `${run.workflowName ?? "StockLens v04 Application"} · intento ${run.attempt ?? "1"} · ${formatDate(run.createdAt)}`
  );
  elements.githubRunLink.href = run.githubRunUrl;

  if (run.videos?.length) {
    run.videos.forEach((video) => {
      const card = document.createElement("article");
      card.className = "video-card";

      const title = document.createElement("h3");
      title.textContent = video.name;

      const media = document.createElement("video");
      media.src = video.url;
      media.controls = true;
      media.preload = "metadata";

      card.append(title, media);
      elements.videoGrid.append(card);
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Este run no publico videos.";
    elements.videoGrid.append(empty);
  }

  elements.linksGrid.append(
    linkCard("Artifact GitHub", run.artifactUrl, "Video, trace y reporte HTML"),
    linkCard("Prefix S3", run.s3ConsoleUrl, run.s3Prefix)
  );
}

function render() {
  if (!state.selectedRunId && state.runs[0]) {
    state.selectedRunId = state.runs[0].runId;
  }

  renderSummary();
  renderRuns();
  renderDetail();
}

async function loadEvidence() {
  elements.refreshButton.disabled = true;
  try {
    const response = await fetch(`${indexUrl}?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.runs = Array.isArray(payload.runs) ? payload.runs : [];
    state.selectedRunId = state.runs[0]?.runId ?? "";
  } catch {
    state.runs = [];
    state.selectedRunId = "";
  } finally {
    elements.refreshButton.disabled = false;
    render();
  }
}

elements.refreshButton.addEventListener("click", loadEvidence);
loadEvidence();
