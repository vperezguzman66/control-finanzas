const state = {
  month: currentLocalMonth(),
  authMode: getStoredAuthMode(),
  dashboard: null,
  transactions: [],
  subscriptions: [],
  transactionEditingId: null,
  subscriptionEditingId: null,
};

const refs = {
  monthFilter: document.getElementById("monthFilter"),
  refreshBtn: document.getElementById("refreshBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
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
  transactionFormTitle: document.getElementById("transactionFormTitle"),
  transactionSubmitBtn: document.getElementById("transactionSubmitBtn"),
  transactionCancelEditBtn: document.getElementById("transactionCancelEditBtn"),
  exportTransactionsBtn: document.getElementById("exportTransactionsBtn"),
  authOverlay: document.getElementById("authOverlay"),
  authForm: document.getElementById("authForm"),
  authModePassword: document.getElementById("authModePassword"),
  authModePin: document.getElementById("authModePin"),
  authUser: document.getElementById("authUser"),
  authPassword: document.getElementById("authPassword"),
  authPasswordGroup: document.getElementById("authPasswordGroup"),
  authPinGroup: document.getElementById("authPinGroup"),
  authPin: document.getElementById("authPin"),
  togglePasswordBtn: document.getElementById("togglePasswordBtn"),
  rememberUser: document.getElementById("rememberUser"),
  authError: document.getElementById("authError"),
  sessionStatus: document.getElementById("sessionStatus"),
  subscriptionForm: document.getElementById("subscriptionForm"),
  subName: document.getElementById("subName"),
  subAmount: document.getElementById("subAmount"),
  subCategory: document.getElementById("subCategory"),
  subCycle: document.getElementById("subCycle"),
  subNextChargeDate: document.getElementById("subNextChargeDate"),
  subPaymentMethod: document.getElementById("subPaymentMethod"),
  subNotes: document.getElementById("subNotes"),
  subscriptionFormTitle: document.getElementById("subscriptionFormTitle"),
  subscriptionSubmitBtn: document.getElementById("subscriptionSubmitBtn"),
  subscriptionCancelEditBtn: document.getElementById("subscriptionCancelEditBtn"),
  transactionsMeta: document.getElementById("transactionsMeta"),
  transactionsList: document.getElementById("transactionsList"),
  subscriptionsMeta: document.getElementById("subscriptionsMeta"),
  subscriptionsList: document.getElementById("subscriptionsList"),
  trendCanvas: document.getElementById("trendChart"),
  expenseCanvas: document.getElementById("expenseChart"),
  toastContainer: document.getElementById("toastContainer"),
};

let trendChartInstance = null;
let expenseChartInstance = null;

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const authStorageKey = "control-finanzas.auth";
const rememberedUserKey = "control-finanzas.remembered-user";
const authModeKey = "control-finanzas.auth-mode";

function getStoredAuthMode() {
  const stored = localStorage.getItem(authModeKey);
  return stored === "pin" ? "pin" : "password";
}

function setStoredAuthMode(mode) {
  localStorage.setItem(authModeKey, mode === "pin" ? "pin" : "password");
}

function getRememberedUsername() {
  return localStorage.getItem(rememberedUserKey) || "";
}

function setRememberedUsername(username) {
  if (username) {
    localStorage.setItem(rememberedUserKey, username);
    return;
  }

  localStorage.removeItem(rememberedUserKey);
}

function getStoredAuthModeLabel(mode) {
  return mode === "pin" ? "PIN" : "contraseña";
}

let authPasswordVisible = false;

function getStoredCredentials() {
  try {
    const raw = sessionStorage.getItem(authStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.username || !parsed?.password) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function setStoredCredentials(username, password, mode) {
  sessionStorage.setItem(authStorageKey, JSON.stringify({ username, password, mode }));
}

function clearStoredCredentials() {
  sessionStorage.removeItem(authStorageKey);
}

function hasStoredCredentials() {
  return Boolean(getStoredCredentials());
}

function getAuthHeader() {
  const credentials = getStoredCredentials();
  if (!credentials) return null;

  return `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
}

function setPasswordVisibility(visible) {
  authPasswordVisible = visible;
  refs.authPassword.type = visible ? "text" : "password";
  refs.togglePasswordBtn.textContent = visible ? "Ocultar" : "Mostrar";
  refs.togglePasswordBtn.setAttribute(
    "aria-label",
    visible ? "Ocultar contraseña" : "Mostrar contraseña"
  );
}

function applyAuthMode(mode) {
  state.authMode = mode === "pin" ? "pin" : "password";
  setStoredAuthMode(state.authMode);

  const isPin = state.authMode === "pin";
  refs.authModePassword.classList.toggle("active", !isPin);
  refs.authModePassword.setAttribute("aria-pressed", String(!isPin));
  refs.authModePin.classList.toggle("active", isPin);
  refs.authModePin.setAttribute("aria-pressed", String(isPin));

  refs.authPasswordGroup.classList.toggle("hidden", isPin);
  refs.authPinGroup.classList.toggle("hidden", !isPin);

  refs.authPassword.required = !isPin;
  refs.authPin.required = isPin;
  refs.authPin.value = "";
  if (isPin) {
    setPasswordVisibility(false);
  }
}

function syncAuthUi() {
  const credentials = getStoredCredentials();
  const authenticated = Boolean(credentials);
  const rememberedUsername = getRememberedUsername();

  refs.authOverlay.classList.toggle("hidden", authenticated);
  refs.authOverlay.setAttribute("aria-hidden", authenticated ? "true" : "false");
  refs.logoutBtn.classList.toggle("hidden", !authenticated);
  refs.sessionStatus.textContent = authenticated
    ? `Sesión activa como ${credentials.username} (${getStoredAuthModeLabel(credentials.mode)})`
    : "Inicia sesión para cargar tus datos.";
  refs.authUser.value = authenticated ? refs.authUser.value : rememberedUsername;
  refs.rememberUser.checked = Boolean(rememberedUsername);
  if (!authenticated) {
    refs.authPassword.value = "";
    refs.authPin.value = "";
    setPasswordVisibility(false);
  }
}

function showAuthError(message) {
  refs.authError.textContent = message;
  refs.authError.classList.remove("hidden");
}

function hideAuthError() {
  refs.authError.textContent = "";
  refs.authError.classList.add("hidden");
}

function today() {
  return localDateISO();
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function localDateISO(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function currentLocalMonth(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function getApiErrorMessage(payload, fallback) {
  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    const firstMessage = payload.details.find((item) => item?.message)?.message;
    if (firstMessage) return firstMessage;
  }
  return payload?.error || fallback;
}

function showToast({
  title,
  message = "",
  type = "success",
  duration = 3500,
}) {
  if (!refs.toastContainer) return;

  const toast = document.createElement("article");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");

  const titleElement = document.createElement("strong");
  titleElement.className = "toast-title";
  titleElement.textContent = title;
  toast.appendChild(titleElement);

  if (message) {
    const messageElement = document.createElement("span");
    messageElement.className = "toast-message";
    messageElement.textContent = message;
    toast.appendChild(messageElement);
  }

  refs.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, duration);
}

function notifySuccess(title, message = "") {
  showToast({ title, message, type: "success" });
}

function notifyError(error, fallback = "No se pudo completar la operación") {
  showToast({
    title: "Algo salió mal",
    message: error?.message || fallback,
    type: "error",
    duration: 5000,
  });
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
  const headers = new Headers(options.headers || {});
  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    ...options,
    headers: Object.fromEntries(headers.entries()),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      clearStoredCredentials();
      syncAuthUi();
      showAuthError(payload.error || "Credenciales inválidas");
      throw new Error(payload.error || "Autenticación requerida");
    }
    throw new Error(getApiErrorMessage(payload, "No se pudo completar la operación"));
  }

  return response.json();
}

async function downloadCsv(path, filename) {
  const headers = new Headers();
  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(path, { headers });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(payload, "No se pudo exportar el CSV"));
  }

  const csv = await response.text();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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

function setTransactionFormMode(isEditing) {
  refs.transactionFormTitle.textContent = isEditing && state.transactionEditingId
    ? `Editar movimiento #${state.transactionEditingId}`
    : "Nuevo movimiento";
  refs.transactionSubmitBtn.textContent = isEditing ? "Guardar cambios" : "Guardar movimiento";
  refs.transactionCancelEditBtn.classList.toggle("hidden", !isEditing);
}

function cancelTransactionEdit() {
  state.transactionEditingId = null;
  setTransactionFormMode(false);
  resetTransactionForm();
}

function startTransactionEdit(item) {
  state.transactionEditingId = item.id;
  refs.txKind.value = item.kind || "expense";
  refs.txAmount.value = String(item.amount || "");
  refs.txCategory.value = item.category || "";
  refs.txDate.value = item.date || today();
  refs.txDescription.value = item.description || "";
  refs.txPaymentMethod.value = item.paymentMethod || "";
  refs.txRecurring.checked = Boolean(item.recurring);
  refs.txNotes.value = item.notes || "";
  setTransactionFormMode(true);
  refs.transactionForm.scrollIntoView({ behavior: "smooth", block: "center" });
  refs.txDescription.focus();
}

function resetSubscriptionForm() {
  refs.subscriptionForm.reset();
  refs.subCycle.value = "monthly";
  refs.subNextChargeDate.value = today();
}

function setSubscriptionFormMode(isEditing) {
  refs.subscriptionFormTitle.textContent = isEditing ? "Editar suscripción" : "Nueva suscripción";
  refs.subscriptionSubmitBtn.textContent = isEditing ? "Guardar cambios" : "Guardar suscripción";
  refs.subscriptionCancelEditBtn.classList.toggle("hidden", !isEditing);
}

function cancelSubscriptionEdit() {
  state.subscriptionEditingId = null;
  setSubscriptionFormMode(false);
  resetSubscriptionForm();
}

function startSubscriptionEdit(item) {
  state.subscriptionEditingId = item.id;
  refs.subName.value = item.name || "";
  refs.subAmount.value = String(item.amount || "");
  refs.subCategory.value = item.category || "";
  refs.subCycle.value = item.billingCycle || "monthly";
  refs.subNextChargeDate.value = item.nextChargeDate || today();
  refs.subPaymentMethod.value = item.paymentMethod || "";
  refs.subNotes.value = item.notes || "";
  setSubscriptionFormMode(true);
  refs.subscriptionForm.scrollIntoView({ behavior: "smooth", block: "center" });
  refs.subName.focus();
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

async function renderTrendChart() {
  const data = await api("/api/chart/monthly-trend");

  const ctx = refs.trendCanvas.getContext("2d");

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Ingresos",
          data: data.income,
          borderColor: "#15803d",
          backgroundColor: "rgba(21, 128, 61, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#15803d",
        },
        {
          label: "Gastos",
          data: data.expenses,
          borderColor: "#b91c1c",
          backgroundColor: "rgba(185, 28, 28, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#b91c1c",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "top" },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatCurrency(value),
          },
        },
      },
    },
  });
}

async function renderExpenseChart() {
  const data = await api(`/api/chart/expense-breakdown?month=${encodeURIComponent(state.month)}`);

  const ctx = refs.expenseCanvas.getContext("2d");

  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  if (data.labels.length === 0) {
    ctx.clearRect(0, 0, refs.expenseCanvas.width, refs.expenseCanvas.height);
    const text = "Sin gastos en este mes";
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, refs.expenseCanvas.width / 2, refs.expenseCanvas.height / 2);
    return;
  }

  const colors = [
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#16a34a",
    "#0891b2",
    "#7c2d12",
    "#831843",
  ];

  expenseChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.labels,
      datasets: [
        {
          data: data.values,
          backgroundColor: colors.slice(0, data.labels.length),
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = formatCurrency(context.parsed);
              return `${label}: ${value}`;
            },
          },
        },
      },
    },
  });
}

async function loadCharts() {
  await Promise.all([renderTrendChart(), renderExpenseChart()]);
}

function clearCharts() {
  if (trendChartInstance) {
    trendChartInstance.destroy();
    trendChartInstance = null;
  }

  if (expenseChartInstance) {
    expenseChartInstance.destroy();
    expenseChartInstance = null;
  }

  const trendCtx = refs.trendCanvas.getContext("2d");
  const expenseCtx = refs.expenseCanvas.getContext("2d");
  trendCtx.clearRect(0, 0, refs.trendCanvas.width, refs.trendCanvas.height);
  expenseCtx.clearRect(0, 0, refs.expenseCanvas.width, refs.expenseCanvas.height);
}

function clearAppData() {
  state.dashboard = null;
  state.transactions = [];
  state.subscriptions = [];
  renderStats();
  renderTransactions();
  renderSubscriptions();
  clearCharts();
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadTransactions(), loadSubscriptions(), loadCharts()]);
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

async function updateTransaction(id) {
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

  await api(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  cancelTransactionEdit();
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

async function updateSubscription(id) {
  const payload = {
    name: refs.subName.value.trim(),
    amount: refs.subAmount.value,
    category: refs.subCategory.value.trim(),
    billingCycle: refs.subCycle.value,
    nextChargeDate: refs.subNextChargeDate.value,
    paymentMethod: refs.subPaymentMethod.value.trim(),
    notes: refs.subNotes.value.trim(),
  };

  await api(`/api/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  cancelSubscriptionEdit();
  await refreshAll();
}

refs.monthFilter.addEventListener("change", async (event) => {
  const value = event.target.value;
  if (!value) return;
  try {
    setMonth(value);
    await refreshAll();
  } catch (error) {
    notifyError(error);
  }
});

refs.refreshBtn.addEventListener("click", async () => {
  try {
    await refreshAll();
    notifySuccess("Datos actualizados");
  } catch (error) {
    notifyError(error);
  }
});

refs.authModePassword.addEventListener("click", () => {
  applyAuthMode("password");
  hideAuthError();
});

refs.authModePin.addEventListener("click", () => {
  applyAuthMode("pin");
  hideAuthError();
});

refs.togglePasswordBtn.addEventListener("click", () => {
  setPasswordVisibility(!authPasswordVisible);
});

refs.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAuthError();

  const username = refs.authUser.value.trim();
  const remember = refs.rememberUser.checked;
  const secret = state.authMode === "pin" ? refs.authPin.value.trim() : refs.authPassword.value;

  if (!username || !secret) {
    showAuthError(state.authMode === "pin" ? "Ingresa usuario y PIN." : "Ingresa usuario y contraseña.");
    return;
  }

  setStoredCredentials(username, secret, state.authMode);
  setRememberedUsername(remember ? username : "");
  syncAuthUi();

  try {
    await refreshAll();
    notifySuccess("Acceso concedido", `Bienvenido, ${username}`);
  } catch (error) {
    clearStoredCredentials();
    syncAuthUi();
    clearAppData();
    showAuthError(error.message);
  }
});

refs.logoutBtn.addEventListener("click", () => {
  clearStoredCredentials();
  hideAuthError();
  syncAuthUi();
  clearAppData();
  notifySuccess("Sesión cerrada");
});

refs.exportTransactionsBtn.addEventListener("click", async () => {
  try {
    const filename = `transactions-${state.month}.csv`;
    await downloadCsv(`/api/transactions/export?month=${encodeURIComponent(state.month)}`, filename);
    notifySuccess("CSV exportado", filename);
  } catch (error) {
    notifyError(error);
  }
});

refs.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (state.transactionEditingId) {
      await updateTransaction(state.transactionEditingId);
      notifySuccess("Movimiento actualizado");
      return;
    }

    await createTransaction();
    notifySuccess("Movimiento guardado");
  } catch (error) {
    notifyError(error);
  }
});

refs.transactionCancelEditBtn.addEventListener("click", () => {
  cancelTransactionEdit();
});

refs.subscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (state.subscriptionEditingId) {
      await updateSubscription(state.subscriptionEditingId);
      notifySuccess("Suscripción actualizada");
      return;
    }

    await createSubscription();
    notifySuccess("Suscripción guardada");
  } catch (error) {
    notifyError(error);
  }
});

refs.subscriptionCancelEditBtn.addEventListener("click", () => {
  cancelSubscriptionEdit();
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
      if (state.transactionEditingId === id) cancelTransactionEdit();
      await refreshAll();
      notifySuccess("Movimiento eliminado");
    }

    if (action === "edit-transaction") {
      startTransactionEdit(item);
    }
  } catch (error) {
    notifyError(error);
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
      if (state.subscriptionEditingId === id) cancelSubscriptionEdit();
      await refreshAll();
      notifySuccess("Suscripción eliminada");
    }

    if (action === "toggle-subscription") {
      await api(`/api/subscriptions/${id}/toggle`, { method: "PATCH" });
      await refreshAll();
      notifySuccess("Estado de suscripción actualizado");
    }

    if (action === "edit-subscription") {
      startSubscriptionEdit(item);
    }
  } catch (error) {
    notifyError(error);
  }
});

function boot() {
  setMonth(state.month);
  refs.txDate.value = today();
  refs.subNextChargeDate.value = today();
  resetTransactionForm();
  resetSubscriptionForm();
  setTransactionFormMode(false);
  setSubscriptionFormMode(false);
  applyAuthMode(state.authMode);
  syncAuthUi();

  if (hasStoredCredentials()) {
    refreshAll().catch((error) => {
      clearStoredCredentials();
      syncAuthUi();
      clearAppData();
      showAuthError(error.message);
    });
    return;
  }

  clearAppData();
}

boot();
