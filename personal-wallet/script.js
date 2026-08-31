const storageKey = "walletone-state";
const accounts = [
  "Todas",
  "Banco Galicia",
  "Banco Nacion",
  "Mercado Pago",
  "Visa Santander",
  "Mastercard BBVA",
  "Amex"
];

const demoMovements = [
  {
    id: crypto.randomUUID(),
    date: "2026-08-02",
    account: "Banco Galicia",
    type: "income",
    category: "Ingreso",
    description: "Sueldo",
    amount: 1850000
  },
  {
    id: crypto.randomUUID(),
    date: "2026-08-04",
    account: "Visa Santander",
    type: "expense",
    category: "Comida",
    description: "Supermercado",
    amount: 84200
  },
  {
    id: crypto.randomUUID(),
    date: "2026-08-06",
    account: "Mastercard BBVA",
    type: "expense",
    category: "Evento",
    description: "Impresion credenciales",
    amount: 126000
  },
  {
    id: crypto.randomUUID(),
    date: "2026-08-08",
    account: "Mercado Pago",
    type: "expense",
    category: "Transporte",
    description: "Combustible",
    amount: 48900
  },
  {
    id: crypto.randomUUID(),
    date: "2026-08-10",
    account: "Banco Nacion",
    type: "expense",
    category: "Servicios",
    description: "Internet",
    amount: 32500
  },
  {
    id: crypto.randomUUID(),
    date: "2026-08-12",
    account: "Amex",
    type: "expense",
    category: "Educacion",
    description: "Curso online",
    amount: 71200
  },
  {
    id: crypto.randomUUID(),
    date: "2026-08-14",
    account: "Banco Galicia",
    type: "transfer",
    category: "Otros",
    description: "Transferencia a Mercado Pago",
    amount: 150000
  }
];

let state = loadState();
let activeAccount = "Todas";
let search = "";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return { movements: demoMovements };
  try {
    const parsed = JSON.parse(raw);
    return { movements: parsed.movements?.length ? parsed.movements : demoMovements };
  } catch {
    return { movements: demoMovements };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function signedAmount(movement) {
  if (movement.type === "income") return movement.amount;
  if (movement.type === "expense") return -movement.amount;
  return 0;
}

function filteredMovements() {
  return state.movements
    .filter((movement) => activeAccount === "Todas" || movement.account === activeAccount)
    .filter((movement) => {
      const haystack =
        `${movement.account} ${movement.description} ${movement.category}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderMetrics() {
  const total = state.movements.reduce((sum, movement) => sum + signedAmount(movement), 0);
  const income = state.movements
    .filter((movement) => movement.type === "income")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const expenses = state.movements
    .filter((movement) => movement.type === "expense")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const cardDebt = state.movements
    .filter((movement) => movement.type === "expense" && /visa|mastercard|amex/i.test(movement.account))
    .reduce((sum, movement) => sum + movement.amount, 0);

  document.getElementById("netBalance").textContent = currency.format(total);
  document.getElementById("incomeTotal").textContent = currency.format(income);
  document.getElementById("expenseTotal").textContent = currency.format(expenses);
  document.getElementById("cardDebt").textContent = currency.format(cardDebt);
}

function renderFilters() {
  const container = document.getElementById("accountFilters");
  container.innerHTML = "";
  accounts.forEach((account) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = account;
    button.className = activeAccount === account ? "active" : "";
    button.addEventListener("click", () => {
      activeAccount = account;
      render();
    });
    container.appendChild(button);
  });
}

function renderTable() {
  const table = document.getElementById("movementTable");
  table.innerHTML = "";

  filteredMovements().forEach((movement) => {
    const row = document.createElement("tr");
    const amountClass = `amount-${movement.type}`;
    const sign = movement.type === "income" ? "" : movement.type === "expense" ? "-" : "";
    row.innerHTML = `
      <td>${movement.date}</td>
      <td>${movement.account}</td>
      <td>${movement.description}</td>
      <td>${movement.category}</td>
      <td class="${amountClass}">${sign}${currency.format(movement.amount)}</td>
    `;
    table.appendChild(row);
  });
}

function renderCategories() {
  const container = document.getElementById("categoryList");
  const expenses = state.movements.filter((movement) => movement.type === "expense");
  const totals = expenses.reduce((acc, movement) => {
    acc[movement.category] = (acc[movement.category] || 0) + movement.amount;
    return acc;
  }, {});
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;

  container.innerHTML = entries
    .map(
      ([category, total]) => `
        <div class="category-row">
          <div><span>${category}</span><strong>${currency.format(total)}</strong></div>
          <span class="bar"><span style="width: ${(total / max) * 100}%"></span></span>
        </div>
      `
    )
    .join("");
}

function renderAlerts() {
  const alerts = [];
  const repeated = state.movements.filter(
    (movement, index, list) =>
      movement.type === "expense" &&
      list.findIndex(
        (other) =>
          other.description.toLowerCase() === movement.description.toLowerCase() &&
          other.amount === movement.amount
      ) !== index
  );
  const cardDebt = state.movements
    .filter((movement) => movement.type === "expense" && /visa|mastercard|amex/i.test(movement.account))
    .reduce((sum, movement) => sum + movement.amount, 0);

  if (cardDebt > 250000) {
    alerts.push({
      title: "Tarjetas altas",
      body: `Hay ${currency.format(cardDebt)} acumulados en tarjetas.`
    });
  }

  if (repeated.length) {
    alerts.push({
      title: "Posibles duplicados",
      body: `${repeated.length} movimientos tienen mismo comercio y monto.`
    });
  }

  if (!alerts.length) {
    alerts.push({
      title: "Sin alertas fuertes",
      body: "Los movimientos cargados no muestran duplicados ni deuda alta de tarjetas."
    });
  }

  document.getElementById("alerts").innerHTML = alerts
    .map(
      (alert) => `
        <div class="alert-row">
          <strong>${alert.title}</strong>
          <p>${alert.body}</p>
        </div>
      `
    )
    .join("");
}

function render() {
  renderMetrics();
  renderFilters();
  renderTable();
  renderCategories();
  renderAlerts();
}

document.getElementById("dateInput").value = new Date().toISOString().slice(0, 10);

document.getElementById("movementForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.movements = [
    {
      id: crypto.randomUUID(),
      date: document.getElementById("dateInput").value,
      account: document.getElementById("accountInput").value,
      type: document.getElementById("typeInput").value,
      category: document.getElementById("categoryInput").value,
      description: document.getElementById("descriptionInput").value,
      amount: Number(document.getElementById("amountInput").value)
    },
    ...state.movements
  ];
  saveState();
  event.target.reset();
  document.getElementById("dateInput").value = new Date().toISOString().slice(0, 10);
  render();
});

document.getElementById("searchInput").addEventListener("input", (event) => {
  search = event.target.value;
  render();
});

document.getElementById("seedButton").addEventListener("click", () => {
  state = { movements: demoMovements };
  saveState();
  render();
});

document.getElementById("clearButton").addEventListener("click", () => {
  state = { movements: [] };
  saveState();
  render();
});

document.getElementById("importButton").addEventListener("click", () => {
  const rows = document
    .getElementById("csvInput")
    .value.split("\n")
    .map((row) => row.trim())
    .filter(Boolean);
  const imported = rows.map((row) => {
    const [date, account, type, category, description, amount] = row.split(",").map((cell) => cell.trim());
    return {
      id: crypto.randomUUID(),
      date,
      account,
      type,
      category,
      description,
      amount: Number(amount)
    };
  });
  state.movements = [...imported, ...state.movements];
  saveState();
  document.getElementById("csvInput").value = "";
  render();
});

render();
