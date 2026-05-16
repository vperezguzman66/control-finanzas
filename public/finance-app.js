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


async function refreshAll() {
  await Promise.all([loadDashboard(), loadTransactions(), loadSubscriptions(), loadCharts()]);
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
  const authPassword = refs.authPassword;
  setPasswordVisibility(authPassword.type === "password");
});

refs.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAuthError();

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

  try {
    await refreshAll();
    notifySuccess("Acceso concedido", `Bienvenido, ${username}`);
  } catch (error) {
    if (error?.status === 401) {
      clearStoredCredentials();
      syncAuthUi();
      clearAppData();
      showAuthError(error.message);
      return;
    }

    notifyError(error, "No se pudieron cargar los datos luego del login");
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
    await downloadCsv(
      `/api/transactions/export?month=${encodeURIComponent(state.month)}`,
      filename
    );
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
    } else {
      await createTransaction();
      notifySuccess("Movimiento guardado");
    }
    await refreshAll();
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
    } else {
      await createSubscription();
      notifySuccess("Suscripción guardada");
    }
    await refreshAll();
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
  applyAuthMode(getStoredAuthMode());
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
