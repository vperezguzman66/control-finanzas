const state = {
  month: new Date().toISOString().slice(0, 7),
  dashboard: null,
  transactions: [],
  subscriptions: [],
};

const refs = {
  monthFilter: document.getElementById("monthFilter"),
  refreshBtn: document.getElementById("refreshBtn"),
  stats: document.getElementById("stats"),
  transactionForm: document.getElementById("transactionForm"),
  txKind: document.getElementById("txKind"),
  txAmount: document.getElementById("txAmount"),
  txCategory: document.getElementById("txCategory"),
  txDate: document.getElementById("txDate"),
  txDescription: document.getElementById("txDescription"),
  txPaymentMethod: document.getElementById("txPaymentMethod"),
  txRecurring: document.getElementById("txRecurring"),
  txNotes: document.getElementById("txNotes"),
  subscriptionForm: document.getElementById("subscriptionForm"),
  subName: document.getElementById("subName"),
  subAmount: document.getElementById("subAmount"),
  subCategory: document.getElementById("subCategory"),
  subCycle: document.getElementById("subCycle"),
  subNextChargeDate: document.getElementById("subNextChargeDate"),
  subPaymentMethod: document.getElementById("subPaymentMethod"),
  subNotes: document.getElementById("subNotes"),
  transactionsMeta: document.getElementById("transactionsMeta"),
  transactionsList: document.getElementById("transactionsList"),
  subscriptionsMeta: document.getElementById("subscriptionsMeta"),
  subscriptionsList: document.getElementById("subscriptionsList"),
};

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function cycleLabel(value) {
  switch (value) {
    case "quarterly":
      return "Trimestral";
    case "annual":
      return "Anual";
    default:
      return "Mensual";
  }
}

function monthlyEquivalent(subscription) {
  const amount = Number(subscription.amount || 0);
  const divisor = subscription.billingCycle === "annual" ? 12 : subscription.billingCycle === "quarterly" ? 3 : 1;
  return amount / divisor;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "No se pudo completar la operación");
  }

  return response.json();
}

function setMonth(value) {
  state.month = value;
  refs.monthFilter.value = value;
}

function statCard(label, value, accent = "") {
  return `
    <article class="stat-card ${accent}">
      <span class="label">${label}</span>
      <strong class="value">${value}</strong>
    </article>
  `;
}

function renderStats() {
  const dashboard = state.dashboard || {};
  refs.stats.innerHTML = [
    statCard("Ingresos", formatCurrency(dashboard.income), "income"),
    statCard("Gastos", formatCurrency(dashboard.expenses), "expense"),
    statCard("Balance", formatCurrency(dashboard.balance), dashboard.balance >= 0 ? "positive" : "negative"),
    statCard("Suscripciones / mes", formatCurrency(dashboard.monthlyRecurring), "subscription"),
    statCard("Neto tras suscripciones", formatCurrency(dashboard.netAfterSubscriptions), dashboard.netAfterSubscriptions >= 0 ? "positive" : "negative"),
    statCard("Movimientos", String(dashboard.transactionCount || 0)),
    statCard("Suscripciones activas", String(dashboard.activeSubscriptions || 0)),
    statCard("Suscripciones totales", String(dashboard.totalSubscriptions || 0)),
  ].join("");
}

function transactionCard(item) {
  const badgeClass = item.kind === "income" ? "income" : "expense";
  const sign = item.kind === "income" ? "+" : "-";
  const recurring = item.recurring ? '<span class="badge recurring">Recurrente</span>' : "";
  const paymentMethod = item.paymentMethod ? `<span class="muted">Pago: ${item.paymentMethod}</span>` : "";
  const notes = item.notes ? `<p class="notes">${item.notes}</p>` : "";

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${item.description}</h3>
          <div class="card-meta">
            <span class="badge ${badgeClass}">${item.kind === "income" ? "Ingreso" : "Gasto"}</span>
            <span class="badge neutral">${item.category}</span>
            ${recurring}
          </div>
        </div>
        <div class="amount ${badgeClass}">${sign}${formatCurrency(item.amount)}</div>
      </div>
      <div class="meta-line">
        <span>${formatDate(item.date)}</span>
        ${paymentMethod}
      </div>
      ${notes}
      <div class="card-actions">
        <button type="button" class="secondary" data-action="edit-transaction" data-id="${item.id}">Editar</button>
        <button type="button" class="danger" data-action="delete-transaction" data-id="${item.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function subscriptionCard(item) {
  const active = item.status === "active";
  const statusClass = active ? "income" : "neutral";
  const paymentMethod = item.paymentMethod ? `<span class="muted">Pago: ${item.paymentMethod}</span>` : "";
  const notes = item.notes ? `<p class="notes">${item.notes}</p>` : "";

  return `
    <article class="card ${active ? "" : "muted-card"}">
      <div class="card-top">
        <div>
          <h3>${item.name}</h3>
          <div class="card-meta">
            <span class="badge ${statusClass}">${active ? "Activa" : "Pausada"}</span>
            <span class="badge neutral">${item.category}</span>
            <span class="badge recurring">${cycleLabel(item.billingCycle)}</span>
          </div>
        </div>
        <div class="amount expense">${formatCurrency(item.amount)}</div>
      </div>
      <div class="meta-line">
        <span>Próximo cobro: ${formatDate(item.nextChargeDate)}</span>
        <span>Promedio mensual: ${formatCurrency(monthlyEquivalent(item))}</span>
        ${paymentMethod}
      </div>
      ${notes}
      <div class="card-actions">
        <button type="button" class="secondary" data-action="toggle-subscription" data-id="${item.id}">${active ? "Pausar" : "Reactivar"}</button>
        <button type="button" class="secondary" data-action="edit-subscription" data-id="${item.id}">Editar</button>
        <button type="button" class="danger" data-action="delete-subscription" data-id="${item.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function renderTransactions() {
  refs.transactionsMeta.textContent = `${state.transactions.length} movimientos encontrados para ${state.month}`;
  if (!state.transactions.length) {
    refs.transactionsList.innerHTML = '<div class="empty">No hay movimientos en este mes todavía.</div>';
    return;
  }
  refs.transactionsList.innerHTML = state.transactions.map(transactionCard).join("");
}

function renderSubscriptions() {
  refs.subscriptionsMeta.textContent = `${state.subscriptions.length} suscripciones registradas`;
  if (!state.subscriptions.length) {
    refs.subscriptionsList.innerHTML = '<div class="empty">Todavía no has añadido suscripciones.</div>';
    return;
  }
  refs.subscriptionsList.innerHTML = state.subscriptions.map(subscriptionCard).join("");
}

function resetTransactionForm() {
  refs.transactionForm.reset();
  refs.txKind.value = "expense";
  refs.txAmount.value = "";
  refs.txRecurring.checked = false;
  refs.txDate.value = today();
}

function resetSubscriptionForm() {
  refs.subscriptionForm.reset();
  refs.subCycle.value = "monthly";
  refs.subNextChargeDate.value = today();
}

async function loadDashboard() {
  const data = await api(`/api/dashboard?month=${encodeURIComponent(state.month)}`);
  state.dashboard = data;
  renderStats();
}

async function loadTransactions() {
  const data = await api(`/api/transactions?month=${encodeURIComponent(state.month)}`);
  state.transactions = data.transactions;
  renderTransactions();
}

async function loadSubscriptions() {
  const data = await api("/api/subscriptions");
  state.subscriptions = data.subscriptions;
  renderSubscriptions();
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadTransactions(), loadSubscriptions()]);
}

async function createTransaction() {
  const payload = {
    kind: refs.txKind.value,
    amount: refs.txAmount.value,
    category: refs.txCategory.value.trim(),
    date: refs.txDate.value,
    description: refs.txDescription.value.trim(),
    paymentMethod: refs.txPaymentMethod.value.trim(),
    recurring: refs.txRecurring.checked,
    notes: refs.txNotes.value.trim(),
  };

  await api("/api/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  resetTransactionForm();
  await refreshAll();
}

async function createSubscription() {
  const payload = {
    name: refs.subName.value.trim(),
    amount: refs.subAmount.value,
    category: refs.subCategory.value.trim(),
    billingCycle: refs.subCycle.value,
    nextChargeDate: refs.subNextChargeDate.value,
    paymentMethod: refs.subPaymentMethod.value.trim(),
    notes: refs.subNotes.value.trim(),
  };

  await api("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  resetSubscriptionForm();
  await refreshAll();
}

function promptEditTransaction(item) {
  const kind = window.prompt("Tipo (income/expense)", item.kind) || item.kind;
  const category = window.prompt("Categoría", item.category) || item.category;
  const description = window.prompt("Descripción", item.description) || item.description;
  const amount = window.prompt("Importe", String(item.amount)) || String(item.amount);
  const date = window.prompt("Fecha (AAAA-MM-DD)", item.date) || item.date;
  const paymentMethod = window.prompt("Método de pago", item.paymentMethod || "") ?? item.paymentMethod ?? "";
  const notes = window.prompt("Notas", item.notes || "") ?? item.notes ?? "";
  const recurring = window.confirm("¿Marcar como recurrente?");

  return {
    kind: kind === "income" ? "income" : "expense",
    category,
    description,
    amount,
    date,
    paymentMethod,
    notes,
    recurring,
  };
}

function promptEditSubscription(item) {
  const name = window.prompt("Nombre", item.name) || item.name;
  const category = window.prompt("Categoría", item.category) || item.category;
  const amount = window.prompt("Importe", String(item.amount)) || String(item.amount);
  const billingCycle = window.prompt("Ciclo (monthly/quarterly/annual)", item.billingCycle) || item.billingCycle;
  const nextChargeDate = window.prompt("Próximo cobro (AAAA-MM-DD)", item.nextChargeDate) || item.nextChargeDate;
  const paymentMethod = window.prompt("Método de pago", item.paymentMethod || "") ?? item.paymentMethod ?? "";
  const notes = window.prompt("Notas", item.notes || "") ?? item.notes ?? "";
  const status = window.confirm("¿Dejar activa? Aceptar = activa / Cancelar = pausada") ? "active" : "paused";

  return {
    name,
    category,
    amount,
    billingCycle: ["monthly", "quarterly", "annual"].includes(billingCycle) ? billingCycle : "monthly",
    nextChargeDate,
    paymentMethod,
    notes,
    status,
  };
}

refs.monthFilter.addEventListener("change", async (event) => {
  const value = event.target.value;
  if (!value) return;
  setMonth(value);
  await refreshAll();
});

refs.refreshBtn.addEventListener("click", async () => {
  await refreshAll();
});

refs.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createTransaction();
  } catch (error) {
    alert(error.message);
  }
});

refs.subscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createSubscription();
  } catch (error) {
    alert(error.message);
  }
});

refs.transactionsList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = Number(target.dataset.id);
  if (!action || Number.isNaN(id)) return;

  const item = state.transactions.find((tx) => tx.id === id);
  if (!item) return;

  try {
    if (action === "delete-transaction") {
      if (!window.confirm("¿Eliminar este movimiento?")) return;
      await api(`/api/transactions/${id}`, { method: "DELETE" });
      await refreshAll();
    }

    if (action === "edit-transaction") {
      const payload = promptEditTransaction(item);
      await api(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshAll();
    }
  } catch (error) {
    alert(error.message);
  }
});

refs.subscriptionsList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = Number(target.dataset.id);
  if (!action || Number.isNaN(id)) return;

  const item = state.subscriptions.find((sub) => sub.id === id);
  if (!item) return;

  try {
    if (action === "delete-subscription") {
      if (!window.confirm("¿Eliminar esta suscripción?")) return;
      await api(`/api/subscriptions/${id}`, { method: "DELETE" });
      await refreshAll();
    }

    if (action === "toggle-subscription") {
      await api(`/api/subscriptions/${id}/toggle`, { method: "PATCH" });
      await refreshAll();
    }

    if (action === "edit-subscription") {
      const payload = promptEditSubscription(item);
      await api(`/api/subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshAll();
    }
  } catch (error) {
    alert(error.message);
  }
});

function boot() {
  setMonth(state.month);
  refs.txDate.value = today();
  refs.subNextChargeDate.value = today();
  resetTransactionForm();
  resetSubscriptionForm();
  refreshAll().catch((error) => {
    alert(error.message);
  });
}

boot();
