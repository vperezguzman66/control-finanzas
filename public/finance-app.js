import { today, notifySuccess, notifyError } from "./finance-utils.js";
import { state, refs } from "./finance-state.js";
import {
  getStoredAuthMode,
  applyAuthMode,
  syncAuthUi,
  setStoredCredentials,
  setRememberedUsername,
  clearStoredCredentials,
  hasStoredCredentials,
  setPasswordVisibility,
  showAuthError,
  hideAuthError,
} from "./finance-auth.js";
import { api, downloadCsv } from "./finance-api.js";
import { setMonth, renderStats, loadDashboard } from "./finance-dashboard.js";
import {
  renderTransactions,
  resetTransactionForm,
  setTransactionFormMode,
  cancelTransactionEdit,
  startTransactionEdit,
  loadTransactions,
  createTransaction,
  updateTransaction,
} from "./finance-transactions.js";
import {
  renderSubscriptions,
  resetSubscriptionForm,
  setSubscriptionFormMode,
  cancelSubscriptionEdit,
  startSubscriptionEdit,
  loadSubscriptions,
  createSubscription,
  updateSubscription,
} from "./finance-subscriptions.js";
import { loadCharts, clearCharts } from "./finance-charts.js";

let refreshPromise = null;
const REFRESH_DEBOUNCE_MS = 300;
let refreshDebounceTimer = null;
let pendingDebouncedRefresh = [];
const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
let inactivityTimer = null;

const sessionActivityEvents = [
  "pointerdown",
  "keydown",
  "touchstart",
  "focus",
  "visibilitychange",
];

function expireSessionByInactivity() {
  if (!hasStoredCredentials()) return;

  clearStoredCredentials();
  syncAuthUi();
  clearAppData();
  showAuthError("Tu sesión expiró por inactividad. Inicia sesión nuevamente.");
  notifyError(
    new Error("Tu sesión expiró por inactividad. Inicia sesión nuevamente."),
    "Tu sesión expiró por inactividad."
  );
}

function stopSessionInactivityTimer() {
  if (!inactivityTimer) return;
  window.clearTimeout(inactivityTimer);
  inactivityTimer = null;
}

function resetSessionInactivityTimer() {
  stopSessionInactivityTimer();
  if (!hasStoredCredentials()) return;

  inactivityTimer = window.setTimeout(() => {
    inactivityTimer = null;
    expireSessionByInactivity();
  }, SESSION_INACTIVITY_TIMEOUT_MS);
}

function onUserActivity() {
  if (!hasStoredCredentials()) return;

  if (document.visibilityState && document.visibilityState !== "visible") {
    return;
  }

  resetSessionInactivityTimer();
}

function bindSessionActivityTracking() {
  sessionActivityEvents.forEach((eventName) => {
    window.addEventListener(eventName, onUserActivity, { passive: true });
  });
}

function setElementLoading(element, isLoading, loadingText = "") {
  if (!(element instanceof HTMLButtonElement || element instanceof HTMLInputElement)) {
    return;
  }

  if (isLoading) {
    element.dataset.wasDisabled = String(element.disabled);
    if (element.dataset.originalText === undefined) {
      element.dataset.originalText = element.textContent || "";
    }
    element.disabled = true;
    element.setAttribute("aria-busy", "true");
    element.classList.add("is-loading");
    if (loadingText && element instanceof HTMLButtonElement) {
      element.textContent = loadingText;
    }
    return;
  }

  element.disabled = element.dataset.wasDisabled === "true";
  element.removeAttribute("aria-busy");
  element.classList.remove("is-loading");
  if (element instanceof HTMLButtonElement && element.dataset.originalText !== undefined) {
    element.textContent = element.dataset.originalText;
  }
  delete element.dataset.wasDisabled;
  delete element.dataset.originalText;
}

async function withLoading(element, loadingText, task) {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement
  ) {
    if (element.disabled) return;
    setElementLoading(element, true, loadingText);
  }

  try {
    return await task();
  } finally {
    setElementLoading(element, false);
  }
}


async function refreshAll() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = Promise.all([
    loadDashboard(),
    loadTransactions(),
    loadSubscriptions(),
    loadCharts(),
  ]).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function flushDebouncedRefresh(result, error = null) {
  const queue = pendingDebouncedRefresh;
  pendingDebouncedRefresh = [];

  queue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(result);
  });
}

function refreshAllDebounced() {
  return new Promise((resolve, reject) => {
    pendingDebouncedRefresh.push({ resolve, reject });

    if (refreshDebounceTimer) {
      window.clearTimeout(refreshDebounceTimer);
    }

    refreshDebounceTimer = window.setTimeout(async () => {
      refreshDebounceTimer = null;
      try {
        const result = await refreshAll();
        flushDebouncedRefresh(result);
      } catch (error) {
        flushDebouncedRefresh(null, error);
      }
    }, REFRESH_DEBOUNCE_MS);
  });
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

refs.monthFilter.addEventListener("change", async (event) => {
  const value = event.target.value;
  if (!value) return;
  await withLoading(refs.monthFilter, "", async () => {
    try {
      setMonth(value);
      await refreshAllDebounced();
    } catch (error) {
      notifyError(error);
    }
  });
});

refs.refreshBtn.addEventListener("click", async () => {
  await withLoading(refs.refreshBtn, "Actualizando...", async () => {
    try {
      await refreshAllDebounced();
      notifySuccess("Datos actualizados");
    } catch (error) {
      notifyError(error);
    }
  });
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
  const authPassword = refs.authPassword;
  setPasswordVisibility(authPassword.type === "password");
});

refs.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAuthError();

  const submitter = event.submitter instanceof HTMLButtonElement
    ? event.submitter
    : refs.authForm.querySelector('button[type="submit"]');

  const username = refs.authUser.value.trim();
  const remember = refs.rememberUser.checked;
  const secret = state.authMode === "pin" ? refs.authPin.value.trim() : refs.authPassword.value;

  if (!username || !secret) {
    showAuthError(
      state.authMode === "pin" ? "Ingresa usuario y PIN." : "Ingresa usuario y contraseña."
    );
    return;
  }

  setStoredCredentials(username, secret, state.authMode);
  setRememberedUsername(remember ? username : "");
  syncAuthUi();
  resetSessionInactivityTimer();

  await withLoading(submitter, "Ingresando...", async () => {
    try {
      await refreshAll();
      notifySuccess("Acceso concedido", `Bienvenido, ${username}`);
    } catch (error) {
      if (error?.status === 401) {
        clearStoredCredentials();
        stopSessionInactivityTimer();
        syncAuthUi();
        clearAppData();
        showAuthError(error.message);
        return;
      }

      notifyError(error, "No se pudieron cargar los datos luego del login");
    }
  });
});

refs.logoutBtn.addEventListener("click", () => {
  clearStoredCredentials();
  stopSessionInactivityTimer();
  hideAuthError();
  syncAuthUi();
  clearAppData();
  notifySuccess("Sesión cerrada");
});

refs.exportTransactionsBtn.addEventListener("click", async () => {
  await withLoading(refs.exportTransactionsBtn, "Exportando...", async () => {
    try {
      const filename = `transactions-${state.month}.csv`;
      await downloadCsv(
        `/api/transactions/export?month=${encodeURIComponent(state.month)}`,
        filename
      );
      notifySuccess("CSV exportado", filename);
    } catch (error) {
      notifyError(error);
    }
  });
});

refs.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const loadingText = state.transactionEditingId ? "Guardando..." : "Creando...";

  await withLoading(refs.transactionSubmitBtn, loadingText, async () => {
    try {
      if (state.transactionEditingId) {
        await updateTransaction(state.transactionEditingId);
        notifySuccess("Movimiento actualizado");
      } else {
        await createTransaction();
        notifySuccess("Movimiento guardado");
      }
      await refreshAll();
    } catch (error) {
      notifyError(error);
    }
  });
});

refs.transactionCancelEditBtn.addEventListener("click", () => {
  cancelTransactionEdit();
});

refs.subscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const loadingText = state.subscriptionEditingId ? "Guardando..." : "Creando...";

  await withLoading(refs.subscriptionSubmitBtn, loadingText, async () => {
    try {
      if (state.subscriptionEditingId) {
        await updateSubscription(state.subscriptionEditingId);
        notifySuccess("Suscripción actualizada");
      } else {
        await createSubscription();
        notifySuccess("Suscripción guardada");
      }
      await refreshAll();
    } catch (error) {
      notifyError(error);
    }
  });
});

refs.subscriptionCancelEditBtn.addEventListener("click", () => {
  cancelSubscriptionEdit();
});

refs.transactionsList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionButton = target.closest("button");
  const action = actionButton?.dataset.action;
  const id = Number(actionButton?.dataset.id);
  if (!action || Number.isNaN(id)) return;

  const item = state.transactions.find((tx) => tx.id === id);
  if (!item) return;

  try {
    if (action === "delete-transaction") {
      if (!window.confirm("¿Eliminar este movimiento?")) return;
      await withLoading(actionButton, "Eliminando...", async () => {
        await api(`/api/transactions/${id}`, { method: "DELETE" });
        if (state.transactionEditingId === id) cancelTransactionEdit();
        await refreshAll();
        notifySuccess("Movimiento eliminado");
      });
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
  const actionButton = target.closest("button");
  const action = actionButton?.dataset.action;
  const id = Number(actionButton?.dataset.id);
  if (!action || Number.isNaN(id)) return;

  const item = state.subscriptions.find((sub) => sub.id === id);
  if (!item) return;

  try {
    if (action === "delete-subscription") {
      if (!window.confirm("¿Eliminar esta suscripción?")) return;
      await withLoading(actionButton, "Eliminando...", async () => {
        await api(`/api/subscriptions/${id}`, { method: "DELETE" });
        if (state.subscriptionEditingId === id) cancelSubscriptionEdit();
        await refreshAll();
        notifySuccess("Suscripción eliminada");
      });
    }

    if (action === "toggle-subscription") {
      await withLoading(actionButton, "Actualizando...", async () => {
        await api(`/api/subscriptions/${id}/toggle`, { method: "PATCH" });
        await refreshAll();
        notifySuccess("Estado de suscripción actualizado");
      });
    }

    if (action === "edit-subscription") {
      startSubscriptionEdit(item);
    }
  } catch (error) {
    notifyError(error);
  }
});

function boot() {
  bindSessionActivityTracking();
  setMonth(state.month);
  refs.txDate.value = today();
  refs.subNextChargeDate.value = today();
  resetTransactionForm();
  resetSubscriptionForm();
  setTransactionFormMode(false);
  setSubscriptionFormMode(false);
  applyAuthMode(getStoredAuthMode());
  syncAuthUi();

  if (hasStoredCredentials()) {
    resetSessionInactivityTimer();
    refreshAll().catch((error) => {
      clearStoredCredentials();
      stopSessionInactivityTimer();
      syncAuthUi();
      clearAppData();
      showAuthError(error.message);
    });
    return;
  }

  clearAppData();
}

boot();
