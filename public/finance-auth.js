import { state, refs } from "./finance-state.js";

const rememberedUserKey = "control-finanzas.remembered-user";
const authModeKey = "control-finanzas.auth-mode";

let runtimeCredentials = null;
let authPasswordVisible = false;

export function getStoredAuthMode() {
  const stored = localStorage.getItem(authModeKey);
  return stored === "pin" ? "pin" : "password";
}

export function setStoredAuthMode(mode) {
  localStorage.setItem(authModeKey, mode === "pin" ? "pin" : "password");
}

export function getRememberedUsername() {
  return localStorage.getItem(rememberedUserKey) || "";
}

export function setRememberedUsername(username) {
  if (username) {
    localStorage.setItem(rememberedUserKey, username);
    return;
  }
  localStorage.removeItem(rememberedUserKey);
}

export function getStoredAuthModeLabel(mode) {
  return mode === "pin" ? "PIN" : "contraseña";
}

export function getStoredCredentials() {
  return runtimeCredentials;
}

export function setStoredCredentials(username, password, mode) {
  runtimeCredentials = { username, password, mode };
}

export function clearStoredCredentials() {
  runtimeCredentials = null;
}

export function hasStoredCredentials() {
  return Boolean(getStoredCredentials());
}

export function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function getAuthHeader() {
  const credentials = getStoredCredentials();
  if (!credentials) return null;
  const token = encodeBase64Utf8(`${credentials.username}:${credentials.password}`);
  return `Basic ${token}`;
}

export function setPasswordVisibility(visible) {
  authPasswordVisible = visible;
  refs.authPassword.type = visible ? "text" : "password";
  refs.togglePasswordBtn.textContent = visible ? "Ocultar" : "Mostrar";
  refs.togglePasswordBtn.setAttribute(
    "aria-label",
    visible ? "Ocultar contraseña" : "Mostrar contraseña"
  );
}

export function applyAuthMode(mode) {
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

export function syncAuthUi() {
  const credentials = getStoredCredentials();
  const authenticated = Boolean(credentials);
  const rememberedUsername = getRememberedUsername();

  if (authenticated && refs.authOverlay.contains(document.activeElement)) {
    refs.monthFilter?.focus();
  }

  refs.authOverlay.classList.toggle("hidden", authenticated);
  refs.authOverlay.setAttribute("aria-hidden", authenticated ? "true" : "false");
  refs.authOverlay.inert = authenticated;
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
    refs.authUser.focus();
  }
}

export function showAuthError(message) {
  refs.authError.textContent = message;
  refs.authError.classList.remove("hidden");
}

export function hideAuthError() {
  refs.authError.textContent = "";
  refs.authError.classList.add("hidden");
}
