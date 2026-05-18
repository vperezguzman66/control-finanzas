import { setupApiTestServer } from "./helpers/apiTestServer.js";

const { apiFetch } = setupApiTestServer();

describe("Suscripciones", () => {
  describe("GET /api/subscriptions", () => {
    it("debe retornar lista de suscripciones", async () => {
      const res = await apiFetch("/api/subscriptions");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.subscriptions)).toBe(true);
    });
  });

  describe("POST /api/subscriptions", () => {
    it("debe crear suscripción válida", async () => {
      const res = await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Streaming Service",
          amount: 9.99,
          category: "Entretenimiento",
          billingCycle: "monthly",
          nextChargeDate: "2026-06-13",
        }),
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar si billingCycle es inválido", async () => {
      const res = await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          amount: 10,
          category: "Test",
          billingCycle: "invalid",
          nextChargeDate: "2026-06-13",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "billingCycle" }),
        ])
      );
    });

    it("debe rechazar si amount es negativo", async () => {
      const res = await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          amount: -10,
          category: "Test",
          billingCycle: "monthly",
          nextChargeDate: "2026-06-13",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
    });

    it("debe rechazar si faltan campos requeridos", async () => {
      const res = await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details.length).toBeGreaterThan(0);
    });

    it("debe aceptar campos opcionales", async () => {
      const res = await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Premium Service",
          amount: 19.99,
          category: "Software",
          billingCycle: "annual",
          nextChargeDate: "2027-05-13",
          paymentMethod: "Tarjeta Crédito",
          notes: "Auto-renew enabled",
          status: "active",
        }),
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  describe("PATCH /api/subscriptions/:id", () => {
    let subscriptionId;

    beforeAll(async () => {
      await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Sub",
          amount: 5,
          category: "Test",
          billingCycle: "monthly",
          nextChargeDate: "2026-06-13",
        }),
      });
      const subRes = await apiFetch("/api/subscriptions");
      const subData = await subRes.json();
      subscriptionId = subData.subscriptions[0]?.id;
    });

    it("debe actualizar suscripción válida", async () => {
      if (!subscriptionId) return;

      const res = await apiFetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Sub",
          amount: 10,
          category: "Test",
          billingCycle: "quarterly",
          nextChargeDate: "2026-08-13",
        }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe permitir actualización parcial de suscripción", async () => {
      if (!subscriptionId) return;

      const res = await apiFetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Solo notas actualizadas" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      const subRes = await apiFetch("/api/subscriptions");
      const subData = await subRes.json();
      const updated = subData.subscriptions.find((subscription) => subscription.id === subscriptionId);

      expect(updated).toEqual(
        expect.objectContaining({
          id: subscriptionId,
          name: "Updated Sub",
          billingCycle: "quarterly",
          notes: "Solo notas actualizadas",
        })
      );
    });

    it("debe rechazar PATCH vacío para suscripción", async () => {
      if (!subscriptionId) return;

      const res = await apiFetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Debes enviar al menos un campo a actualizar");
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "root",
            message: "Debes enviar al menos un campo a actualizar",
          }),
        ])
      );
    });

    it("debe rechazar ID inválido", async () => {
      const res = await apiFetch("/api/subscriptions/invalid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          amount: 10,
          category: "Test",
          billingCycle: "monthly",
          nextChargeDate: "2026-06-13",
        }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });

    it("debe retornar 404 si la suscripción no existe", async () => {
      const res = await apiFetch("/api/subscriptions/999999999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          amount: 10,
          category: "Test",
          billingCycle: "monthly",
          nextChargeDate: "2026-06-13",
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Suscripción no encontrado");
    });
  });

  describe("PATCH /api/subscriptions/:id/toggle", () => {
    let subscriptionId;

    beforeAll(async () => {
      const subRes = await apiFetch("/api/subscriptions");
      const subData = await subRes.json();
      subscriptionId = subData.subscriptions[0]?.id;
    });

    it("debe alternar estado de suscripción", async () => {
      if (!subscriptionId) return;

      const res = await apiFetch(`/api/subscriptions/${subscriptionId}/toggle`, {
        method: "PATCH",
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(["active", "paused"]).toContain(data.status);
    });

    it("debe calcular nextChargeDate en el futuro al reactivar desde fecha pasada", async () => {
      // Crear suscripción con nextChargeDate en el pasado
      await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sub Reactivación Pasado",
          amount: 5,
          category: "Test",
          billingCycle: "monthly",
          nextChargeDate: "2020-01-15",
        }),
      });
      const listRes = await apiFetch("/api/subscriptions");
      const listData = await listRes.json();
      const sub = listData.subscriptions.find((s) => s.name === "Sub Reactivación Pasado");
      expect(sub).toBeDefined();

      // 1ª llamada: activa → pausada (la fecha no cambia)
      const pauseRes = await apiFetch(`/api/subscriptions/${sub.id}/toggle`, { method: "PATCH" });
      expect(pauseRes.status).toBe(200);
      const pauseData = await pauseRes.json();
      expect(pauseData.status).toBe("paused");

      // 2ª llamada: pausada → activa (la fecha debe quedar en el futuro)
      const activeRes = await apiFetch(`/api/subscriptions/${sub.id}/toggle`, { method: "PATCH" });
      expect(activeRes.status).toBe(200);
      const activeData = await activeRes.json();
      expect(activeData.ok).toBe(true);
      expect(activeData.status).toBe("active");
      const today = new Date().toISOString().slice(0, 10);
      expect(activeData.nextChargeDate > today).toBe(true);
    });

    it("debe rechazar ID inválido en toggle", async () => {
      const res = await apiFetch("/api/subscriptions/invalid/toggle", {
        method: "PATCH",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });
  });

  describe("DELETE /api/subscriptions/:id", () => {
    let subscriptionId;

    beforeAll(async () => {
      await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sub to Delete",
          amount: 3,
          category: "Test",
          billingCycle: "monthly",
          nextChargeDate: "2026-06-13",
        }),
      });
      const subRes = await apiFetch("/api/subscriptions");
      const subData = await subRes.json();
      subscriptionId = subData.subscriptions[subData.subscriptions.length - 1]?.id;
    });

    it("debe eliminar suscripción existente", async () => {
      if (!subscriptionId) return;

      const res = await apiFetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar ID inválido en DELETE", async () => {
      const res = await apiFetch("/api/subscriptions/invalid", {
        method: "DELETE",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });

    it("debe retornar 404 si la suscripción no existe", async () => {
      const res = await apiFetch("/api/subscriptions/999999999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Suscripción no encontrado");
    });
  });
});