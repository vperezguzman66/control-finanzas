import { state, refs } from "./finance-state.js";
import { api } from "./finance-api.js";
import { formatCurrency } from "./finance-utils.js";

export function setMonth(value) {
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

export function renderStats() {
  const dashboard = state.dashboard || {};
  refs.stats.innerHTML = [
    statCard("Ingresos", formatCurrency(dashboard.income), "income"),
    statCard("Gastos", formatCurrency(dashboard.expenses), "expense"),
    statCard(
      "Balance",
      formatCurrency(dashboard.balance),
      dashboard.balance >= 0 ? "positive" : "negative"
    ),
    statCard("Suscripciones / mes", formatCurrency(dashboard.monthlyRecurring), "subscription"),
    statCard(
      "Neto tras suscripciones",
      formatCurrency(dashboard.netAfterSubscriptions),
      dashboard.netAfterSubscriptions >= 0 ? "positive" : "negative"
    ),
    statCard("Movimientos", String(dashboard.transactionCount || 0)),
    statCard("Suscripciones activas", String(dashboard.activeSubscriptions || 0)),
    statCard("Suscripciones totales", String(dashboard.totalSubscriptions || 0)),
  ].join("");
}

export async function loadDashboard() {
  const data = await api(`/api/dashboard?month=${encodeURIComponent(state.month)}`);
  state.dashboard = data;
  renderStats();
}
