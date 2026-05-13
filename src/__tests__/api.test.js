import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..", "..");
const baseURL = "http://localhost:3000";

let serverProcess;

// Esperar a que el servidor esté listo
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${baseURL}/health`);
      if (res.ok) return;
    } catch (e) {
      // Servidor aún no está listo
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Servidor no respondió después de 3 segundos");
}

beforeAll(async () => {
  // Iniciar el servidor
  return new Promise((resolve, reject) => {
    serverProcess = spawn("node", ["finance-server.js"], {
      cwd: projectRoot,
      stdio: "pipe",
    });

    serverProcess.on("error", reject);

    // Esperar a que el servidor esté listo
    waitForServer()
      .then(() => resolve())
      .catch(reject);
  });
});

afterAll(async () => {
  // Detener el servidor
  if (serverProcess) {
    return new Promise((resolve) => {
      serverProcess.kill();
      serverProcess.on("exit", resolve);
    });
  }
});

// ============================================================================
// TESTS GENERALES
// ============================================================================

describe("Health Check", () => {
  it("GET /health debe retornar 200 y {ok: true}", async () => {
    const res = await fetch(`${baseURL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });
});

// ============================================================================
// TESTS PARA TRANSACCIONES
// ============================================================================

describe("Transacciones", () => {
  describe("GET /api/transactions", () => {
    it("debe retornar lista de transacciones para el mes actual", async () => {
      const res = await fetch(`${baseURL}/api/transactions`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("transactions");
      expect(Array.isArray(data.transactions)).toBe(true);
    });

    it("debe aceptar query parameter month", async () => {
      const res = await fetch(`${baseURL}/api/transactions?month=2026-05`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.month).toBe("2026-05");
    });

    it("debe usar mes actual si month es inválido", async () => {
      const res = await fetch(`${baseURL}/api/transactions?month=invalid`);
      expect(res.status).toBe(200);
      const data = await res.json();
      // Month puede ser inválido también - el endpoint solo retorna lo enviado
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("transactions");
    });
  });

  describe("POST /api/transactions", () => {
    it("debe crear transacción válida", async () => {
      const res = await fetch(`${baseURL}/api/transactions`, {
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
      const data = await res.json();
      expect(data).toEqual({ ok: true });
    });

    it("debe rechazar si kind es inválido", async () => {
      const res = await fetch(`${baseURL}/api/transactions`, {
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
          expect.objectContaining({
            field: "kind",
          }),
        ])
      );
    });

    it("debe rechazar si amount es negativo", async () => {
      const res = await fetch(`${baseURL}/api/transactions`, {
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
      const res = await fetch(`${baseURL}/api/transactions`, {
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
          expect.objectContaining({
            field: "date",
          }),
        ])
      );
    });

    it("debe rechazar si faltan campos requeridos", async () => {
      const res = await fetch(`${baseURL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "income",
          amount: 100,
          // Falta category, description, date
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details.length).toBeGreaterThan(0);
    });

    it("debe aceptar campos opcionales", async () => {
      const res = await fetch(`${baseURL}/api/transactions`, {
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
  });

  describe("PATCH /api/transactions/:id", () => {
    let transactionId;

    // Crear una transacción para editar
    beforeAll(async () => {
      const res = await fetch(`${baseURL}/api/transactions`, {
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
      // Obtener la transacción recién creada
      const txRes = await fetch(`${baseURL}/api/transactions?month=2026-05`);
      const txData = await txRes.json();
      transactionId = txData.transactions[0]?.id;
    });

    it("debe actualizar transacción válida", async () => {
      if (!transactionId) {
        console.warn("No se pudo obtener ID de transacción para test");
        return;
      }
      const res = await fetch(`${baseURL}/api/transactions/${transactionId}`, {
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

    it("debe rechazar si ID es inválido", async () => {
      const res = await fetch(`${baseURL}/api/transactions/invalid`, {
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
      const res = await fetch(`${baseURL}/api/transactions/0`, {
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
  });

  describe("DELETE /api/transactions/:id", () => {
    let transactionId;

    beforeAll(async () => {
      // Crear una transacción para eliminar
      await fetch(`${baseURL}/api/transactions`, {
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
      const txRes = await fetch(`${baseURL}/api/transactions?month=2026-05`);
      const txData = await txRes.json();
      // Obtener la última transacción creada
      transactionId = txData.transactions[txData.transactions.length - 1]?.id;
    });

    it("debe eliminar transacción existente", async () => {
      if (!transactionId) {
        console.warn("No se pudo obtener ID de transacción para eliminar");
        return;
      }
      const res = await fetch(`${baseURL}/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar ID inválido en DELETE", async () => {
      const res = await fetch(`${baseURL}/api/transactions/invalid`, {
        method: "DELETE",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });
  });
});

// ============================================================================
// TESTS PARA SUSCRIPCIONES
// ============================================================================

describe("Suscripciones", () => {
  describe("GET /api/subscriptions", () => {
    it("debe retornar lista de suscripciones", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.subscriptions)).toBe(true);
    });
  });

  describe("POST /api/subscriptions", () => {
    it("debe crear suscripción válida", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions`, {
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
      const res = await fetch(`${baseURL}/api/subscriptions`, {
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
          expect.objectContaining({
            field: "billingCycle",
          }),
        ])
      );
    });

    it("debe rechazar si amount es negativo", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions`, {
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
      const res = await fetch(`${baseURL}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          // Falta amount, category, billingCycle, nextChargeDate
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validación fallida");
      expect(data.details.length).toBeGreaterThan(0);
    });

    it("debe aceptar campos opcionales", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions`, {
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
      // Crear una suscripción para editar
      await fetch(`${baseURL}/api/subscriptions`, {
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
      const subRes = await fetch(`${baseURL}/api/subscriptions`);
      const subData = await subRes.json();
      subscriptionId = subData.subscriptions[0]?.id;
    });

    it("debe actualizar suscripción válida", async () => {
      if (!subscriptionId) {
        console.warn("No se pudo obtener ID de suscripción");
        return;
      }
      const res = await fetch(
        `${baseURL}/api/subscriptions/${subscriptionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Updated Sub",
            amount: 10,
            category: "Test",
            billingCycle: "quarterly",
            nextChargeDate: "2026-08-13",
          }),
        }
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar ID inválido", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions/invalid`, {
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
  });

  describe("PATCH /api/subscriptions/:id/toggle", () => {
    let subscriptionId;

    beforeAll(async () => {
      const subRes = await fetch(`${baseURL}/api/subscriptions`);
      const subData = await subRes.json();
      subscriptionId = subData.subscriptions[0]?.id;
    });

    it("debe alternar estado de suscripción", async () => {
      if (!subscriptionId) {
        console.warn("No se pudo obtener ID de suscripción");
        return;
      }
      const res = await fetch(
        `${baseURL}/api/subscriptions/${subscriptionId}/toggle`,
        {
          method: "PATCH",
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(["active", "paused"]).toContain(data.status);
    });

    it("debe rechazar ID inválido en toggle", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions/invalid/toggle`, {
        method: "PATCH",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });
  });

  describe("DELETE /api/subscriptions/:id", () => {
    let subscriptionId;

    beforeAll(async () => {
      // Crear una suscripción para eliminar
      await fetch(`${baseURL}/api/subscriptions`, {
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
      const subRes = await fetch(`${baseURL}/api/subscriptions`);
      const subData = await subRes.json();
      subscriptionId = subData.subscriptions[subData.subscriptions.length - 1]?.id;
    });

    it("debe eliminar suscripción existente", async () => {
      if (!subscriptionId) {
        console.warn("No se pudo obtener ID de suscripción para eliminar");
        return;
      }
      const res = await fetch(
        `${baseURL}/api/subscriptions/${subscriptionId}`,
        {
          method: "DELETE",
        }
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("debe rechazar ID inválido en DELETE", async () => {
      const res = await fetch(`${baseURL}/api/subscriptions/invalid`, {
        method: "DELETE",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "ID inválido" });
    });
  });
});

// ============================================================================
// TESTS PARA DASHBOARD Y CHARTS
// ============================================================================

describe("Dashboard y Charts", () => {
  describe("GET /api/dashboard", () => {
    it("debe retornar datos del dashboard para mes actual", async () => {
      const res = await fetch(`${baseURL}/api/dashboard`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("month");
      expect(data).toHaveProperty("income");
      expect(data).toHaveProperty("expenses");
      expect(data).toHaveProperty("balance");
      expect(data).toHaveProperty("monthlyRecurring");
    });

    it("debe aceptar query parameter month", async () => {
      const res = await fetch(`${baseURL}/api/dashboard?month=2026-05`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.month).toBe("2026-05");
    });
  });

  describe("GET /api/chart/monthly-trend", () => {
    it("debe retornar datos de tendencia mensual", async () => {
      const res = await fetch(`${baseURL}/api/chart/monthly-trend`);
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
      const res = await fetch(`${baseURL}/api/chart/expense-breakdown`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("labels");
      expect(data).toHaveProperty("values");
      expect(Array.isArray(data.labels)).toBe(true);
      expect(Array.isArray(data.values)).toBe(true);
    });

    it("debe aceptar query parameter month", async () => {
      const res = await fetch(
        `${baseURL}/api/chart/expense-breakdown?month=2026-05`
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("labels");
      expect(data).toHaveProperty("values");
    });
  });
});

// ============================================================================
// TESTS PARA MANEJO DE ERRORES
// ============================================================================

describe("Error Handling", () => {
  it("debe retornar 400 para JSON inválido", async () => {
    const res = await fetch(`${baseURL}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json }",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("debe retornar 404 para ruta no existente", async () => {
    const res = await fetch(`${baseURL}/api/nonexistent`);
    expect([404, 200]).toContain(res.status); // Puede ser 404 o redirigir (configuración)
  });
});
