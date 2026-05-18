import { describe, it, expect } from "vitest";
import { setupApiTestServer } from "./helpers/apiTestServer.js";

const { apiFetch } = setupApiTestServer();

describe("Dashboard y Charts", () => {
  describe("GET /api/dashboard", () => {
    it("debe retornar datos del dashboard para mes actual", async () => {
      const res = await apiFetch("/api/dashboard");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("income");
      expect(data).toHaveProperty("expenses");
      expect(data).toHaveProperty("balance");
      expect(data).toHaveProperty("monthlyRecurring");
    });

    it("debe aceptar query parameter month", async () => {
      const res = await apiFetch("/api/dashboard?month=2026-05");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.month).toBe("2026-05");
    });

    it("debe rechazar month inválido", async () => {
      const res = await apiFetch("/api/dashboard?month=2026-13");
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

  describe("GET /api/chart/monthly-trend", () => {
    it("debe retornar datos de tendencia mensual", async () => {
      const res = await apiFetch("/api/chart/monthly-trend");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("labels");
      expect(data).toHaveProperty("income");
      expect(data).toHaveProperty("expenses");
      expect(Array.isArray(data.labels)).toBe(true);
      expect(Array.isArray(data.income)).toBe(true);
      expect(Array.isArray(data.expenses)).toBe(true);
    });
  });

  describe("GET /api/chart/expense-breakdown", () => {
    it("debe retornar desglose de gastos", async () => {
      const res = await apiFetch("/api/chart/expense-breakdown");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("labels");
      expect(data).toHaveProperty("values");
      expect(Array.isArray(data.labels)).toBe(true);
      expect(Array.isArray(data.values)).toBe(true);
    });

    it("debe aceptar query parameter month", async () => {
      const res = await apiFetch("/api/chart/expense-breakdown?month=2026-05");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("labels");
      expect(data).toHaveProperty("values");
    });

    it("debe rechazar month inválido", async () => {
      const res = await apiFetch("/api/chart/expense-breakdown?month=2026-99");
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
});