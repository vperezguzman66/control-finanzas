import { state, refs } from "./finance-state.js";
import { api } from "./finance-api.js";
import { formatCurrency, showToast } from "./finance-utils.js";

let trendChartInstance = null;
let expenseChartInstance = null;

export async function renderTrendChart() {
  if (typeof Chart === "undefined") {
    throw new Error("No se pudo cargar el motor de gráficos");
  }

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

export async function renderExpenseChart() {
  if (typeof Chart === "undefined") {
    throw new Error("No se pudo cargar el motor de gráficos");
  }

  const data = await api(`/api/chart/expense-breakdown?month=${encodeURIComponent(state.month)}`);
  const ctx = refs.expenseCanvas.getContext("2d");

  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  if (data.labels.length === 0) {
    ctx.clearRect(0, 0, refs.expenseCanvas.width, refs.expenseCanvas.height);
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Sin gastos en este mes",
      refs.expenseCanvas.width / 2,
      refs.expenseCanvas.height / 2
    );
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

export async function loadCharts() {
  try {
    await Promise.all([renderTrendChart(), renderExpenseChart()]);
  } catch (error) {
    clearCharts();
    showToast({
      title: "Gráficas no disponibles",
      message: error?.message || "No se pudieron cargar las gráficas por ahora.",
      type: "error",
      duration: 5000,
    });
  }
}

export function clearCharts() {
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
