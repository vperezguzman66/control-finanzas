import {
  getAuthHeader,
  clearStoredCredentials,
  syncAuthUi,
  showAuthError,
} from "./finance-auth.js";
import { getApiErrorMessage } from "./finance-utils.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

function createRequestController(timeoutMs, externalSignal) {
  const controller = new AbortController();
  let timeoutId = null;
  let timedOut = false;

  if (externalSignal?.aborted) {
    controller.abort();
    return {
      signal: controller.signal,
      timedOut: () => timedOut,
      cleanup: () => {},
    };
  }

  const onAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    externalSignal.addEventListener("abort", onAbort, { once: true });
  }

  if (timeoutMs > 0) {
    timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onAbort);
      }
    },
  };
}

async function fetchWithTimeout(path, options = {}, timeoutMessage) {
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
  const requestOptions = { ...options };
  delete requestOptions.timeoutMs;

  const requestController = createRequestController(timeoutMs, requestOptions.signal);

  try {
    return await fetch(path, {
      ...requestOptions,
      signal: requestController.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError" && requestController.timedOut()) {
      const timeoutError = new Error(timeoutMessage);
      timeoutError.code = "REQUEST_TIMEOUT";
      throw timeoutError;
    }

    throw error;
  } finally {
    requestController.cleanup();
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");

  const response = await fetchWithTimeout(path, {
    ...options,
    cache: "no-store",
    headers: Object.fromEntries(headers.entries()),
  }, "La solicitud tardó demasiado. Intenta nuevamente.");

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

  const response = await fetchWithTimeout(path, {
    headers,
    cache: "no-store",
  }, "La exportación tardó demasiado. Intenta nuevamente.");

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
