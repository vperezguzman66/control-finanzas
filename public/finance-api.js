import {
  getAuthHeader,
  clearStoredCredentials,
  syncAuthUi,
  showAuthError,
} from "./finance-auth.js";
import { getApiErrorMessage } from "./finance-utils.js";

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: Object.fromEntries(headers.entries()),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      clearStoredCredentials();
      syncAuthUi();
      showAuthError(payload.error || "Credenciales inválidas");
      const authError = new Error(payload.error || "Autenticación requerida");
      authError.status = response.status;
      throw authError;
    }

    const requestError = new Error(
      getApiErrorMessage(payload, "No se pudo completar la operación")
    );
    requestError.status = response.status;
    throw requestError;
  }

  return response.json();
}

export async function downloadCsv(path, filename) {
  const headers = new Headers();
  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(path, {
    headers,
    cache: "no-store",
  });

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
