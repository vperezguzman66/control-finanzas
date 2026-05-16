import { describe, it, expect } from "vitest";
import { setupApiTestServer } from "./helpers/apiTestServer.js";

const { apiFetch, pinFetch, rawFetch } = setupApiTestServer();

describe("Health Check", () => {
  it("GET /health debe retornar 200 y {ok: true}", async () => {
    const res = await apiFetch("/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.db).toEqual({ ok: true });
    expect(data.db).not.toHaveProperty("dbPath");
  });
});

describe("Basic Auth", () => {
  it("debe servir la pantalla pública de acceso sin credenciales", async () => {
    const res = await rawFetch("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="authForm"');
    expect(html).toContain("Inicia sesión");
    expect(html).toContain('id="authModePin"');
    expect(html).toContain('id="authPinGroup"');
    expect(html).toContain('id="rememberUser"');
    expect(html).toContain('id="togglePasswordBtn"');
  });

  it("debe rechazar requests sin credenciales", async () => {
    const res = await rawFetch("/api/dashboard?month=2026-05");
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic realm=");
    const data = await res.json();
    expect(data).toEqual({ error: "Autenticación requerida" });
  });

  it("debe permitir requests autenticadas con PIN", async () => {
    const res = await pinFetch("/api/subscriptions");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.subscriptions)).toBe(true);
  });

  it("debe rechazar PIN incorrecto", async () => {
    const badPinHeader = `Basic ${Buffer.from("admin:9999").toString("base64")}`;
    const res = await rawFetch("/api/subscriptions", {
      headers: {
        Authorization: badPinHeader,
      },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic realm=");
    const data = await res.json();
    expect(data).toEqual({ error: "Autenticación requerida" });
  });

  it("debe rechazar PIN vacío", async () => {
    const emptyPinHeader = `Basic ${Buffer.from("admin:").toString("base64")}`;
    const res = await rawFetch("/api/subscriptions", {
      headers: {
        Authorization: emptyPinHeader,
      },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic realm=");
    const data = await res.json();
    expect(data).toEqual({ error: "Autenticación requerida" });
  });

  it("debe rechazar usuario incorrecto aunque el PIN sea válido", async () => {
    const wrongUserHeader = `Basic ${Buffer.from("otro-usuario:1234").toString("base64")}`;
    const res = await rawFetch("/api/subscriptions", {
      headers: {
        Authorization: wrongUserHeader,
      },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic realm=");
    const data = await res.json();
    expect(data).toEqual({ error: "Autenticación requerida" });
  });
});