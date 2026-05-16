import { describe, it, expect, beforeAll } from "vitest";
import { setupApiTestServer } from "./helpers/apiTestServer.js";

const { apiFetch } = setupApiTestServer();

describe("Transacciones", () => {
  describe("GET /api/transactions", () => {
    it("debe retornar lista de transacciones para el mes actual", async () => {
      const res = await apiFetch("/api/transactions");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("transactions");
      expect(Array.isArray(data.transactions)).toBe(true);
    });

    it("debe aceptar query parameter month", async () => {
      const res = await apiFetch("/api/transactions?month=2026-05");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.month).toBe("2026-05");
    });

    it("debe rechazar si month es inválido", async () => {
      const res = await apiFetch("/api/transactions?month=invalid");
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación de parámetros fallida");
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "month",
            message: "El mes debe estar en formato YYYY-MM",
          }),
        ])
      );
    });
  });

  describe("POST /api/transactions", () => {
    it("debe crear transacción válida", async () => {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 500,
          category: "Salario",
          description: "Pago mensual",
          date: "2026-05-13",
        }),
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar si kind es inválido", async () => {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "invalid",
          amount: 100,
          category: "Test",
          description: "Test",
          date: "2026-05-13",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "kind" }),
        ])
      );
    });

    it("debe rechazar si amount es negativo", async () => {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "expense",
          amount: -100,
          category: "Test",
          description: "Test",
          date: "2026-05-13",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "amount",
            message: expect.stringContaining("mayor que cero"),
          }),
        ])
      );
    });

    it("debe rechazar si date es inválida", async () => {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 100,
          category: "Test",
          description: "Test",
          date: "invalid-date",
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "date" }),
        ])
      );
    });

    it("debe rechazar si faltan campos requeridos", async () => {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 100,
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details.length).toBeGreaterThan(0);
    });

    it("debe aceptar campos opcionales", async () => {
      const res = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "expense",
          amount: 50,
          category: "Comida",
          description: "Almuerzo",
          date: "2026-05-13",
          paymentMethod: "Tarjeta",
          notes: "En el restaurante",
          recurring: false,
        }),
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe exportar transacciones a CSV", async () => {
      const res = await apiFetch("/api/transactions/export?month=2026-05");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(res.headers.get("content-disposition")).toContain("attachment");

      const csv = await res.text();
      expect(csv).toContain("id,kind,category,description,amount,date,paymentMethod,notes,recurring,createdAt");
      expect(csv).toContain("2026-05");
    });
  });

  describe("PATCH /api/transactions/:id", () => {
    let transactionId;

    beforeAll(async () => {
      await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 1000,
          category: "Bonus",
          description: "Bonus anual",
          date: "2026-05-13",
        }),
      });

      const txRes = await apiFetch("/api/transactions?month=2026-05");
      const txData = await txRes.json();
      transactionId = txData.transactions[0]?.id;
    });

    it("debe actualizar transacción válida", async () => {
      if (!transactionId) return;

      const res = await apiFetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 1200,
          category: "Bonus",
          description: "Bonus actualizado",
          date: "2026-05-13",
        }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe permitir actualización parcial de transacción", async () => {
      if (!transactionId) return;

      const res = await apiFetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Solo descripción actualizada" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });

      const txRes = await apiFetch("/api/transactions?month=2026-05");
      const txData = await txRes.json();
      const updated = txData.transactions.find((transaction) => transaction.id === transactionId);

      expect(updated).toEqual(
        expect.objectContaining({
          id: transactionId,
          description: "Solo descripción actualizada",
          category: "Bonus",
          amount: 1200,
        })
      );
    });

    it("debe rechazar PATCH vacío para transacción", async () => {
      if (!transactionId) return;

      const res = await apiFetch(`/api/transactions/${transactionId}`, {
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

    it("debe rechazar si ID es inválido", async () => {
      const res = await apiFetch("/api/transactions/invalid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 100,
          category: "Test",
          description: "Test",
          date: "2026-05-13",
        }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });

    it("debe rechazar si ID es 0 o negativo", async () => {
      const res = await apiFetch("/api/transactions/0", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 100,
          category: "Test",
          description: "Test",
          date: "2026-05-13",
        }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });

    it("debe retornar 404 si la transacción no existe", async () => {
      const res = await apiFetch("/api/transactions/999999999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 100,
          category: "Test",
          description: "Test",
          date: "2026-05-13",
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Movimiento no encontrado");
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    let transactionId;

    beforeAll(async () => {
      await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "expense",
          amount: 25,
          category: "Prueba",
          description: "Para eliminar",
          date: "2026-05-13",
        }),
      });

      const txRes = await apiFetch("/api/transactions?month=2026-05");
      const txData = await txRes.json();
      transactionId = txData.transactions[txData.transactions.length - 1]?.id;
    });

    it("debe eliminar transacción existente", async () => {
      if (!transactionId) return;

      const res = await apiFetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar ID inválido en DELETE", async () => {
      const res = await apiFetch("/api/transactions/invalid", {
        method: "DELETE",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });

    it("debe retornar 404 si la transacción no existe", async () => {
      const res = await apiFetch("/api/transactions/999999999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Movimiento no encontrado");
    });
  });
});