const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function localDateISO(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function currentLocalMonth(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function today() {
  return localDateISO();
}

export function getApiErrorMessage(payload, fallback) {
  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    const firstMessage = payload.details.find((item) => item?.message)?.message;
    if (firstMessage) return firstMessage;
  }
  return payload?.error || fallback;
}

export function showToast({ title, message = "", type = "success", duration = 3500 }) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

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

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, duration);
}

export function notifySuccess(title, message = "") {
  showToast({ title, message, type: "success" });
}

export function notifyError(error, fallback = "No se pudo completar la operación") {
  showToast({
    title: "Algo salió mal",
    message: error?.message || fallback,
    type: "error",
    duration: 5000,
  });
}

export function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function cycleLabel(value) {
  switch (value) {
    case "quarterly":
      return "Trimestral";
    case "annual":
      return "Anual";
    default:
      return "Mensual";
  }
}

export function monthlyEquivalent(subscription) {
  const amount = Number(subscription.amount || 0);
  const divisor =
    subscription.billingCycle === "annual"
      ? 12
      : subscription.billingCycle === "quarterly"
        ? 3
        : 1;
  return amount / divisor;
}
