import { setupApiTestServer } from "./helpers/apiTestServer.js";

const { apiFetch } = setupApiTestServer();

describe("Error Handling", () => {
  it("debe retornar 400 para JSON inválido", async () => {
    const res = await apiFetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json }",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("debe retornar 404 para ruta no existente", async () => {
    const res = await apiFetch("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("CORS", () => {
  it("debe permitir request sin Origin", async () => {
    const res = await apiFetch("/api/dashboard?month=2026-05");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("month");
  });

  it("debe rechazar Origin no permitido con 403", async () => {
    const res = await apiFetch("/api/dashboard?month=2026-05", {
      headers: {
        Origin: "http://evil.local",
      },
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data).toEqual({ error: "Origen no permitido" });
  });

  it("debe permitir Origin configurado y devolver cabecera CORS", async () => {
    const allowedOrigin = "http://allowed.local";
    const res = await apiFetch("/api/dashboard?month=2026-05", {
      headers: {
        Origin: allowedOrigin,
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(allowedOrigin);
  });
});