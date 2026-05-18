import { z } from "zod";
import { vi } from "vitest";
import errorHandler from "../middleware/errorHandler.js";
import { AppError } from "../utils/errors.js";

describe("errorHandler middleware", () => {
  let res;
  let req;

  beforeEach(() => {
    // Mock res object with status and json methods
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Mock req object
    req = {
      method: "POST",
      path: "/api/transactions",
    };

    // Mock console.error to prevent output during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("ZodError handling", () => {
    it("debería manejar ZodError con status 400", () => {
      const schema = z.object({
        amount: z.number().min(0, "debe ser positivo"),
      });

      try {
        schema.parse({ amount: -10 });
      } catch (error) {
        errorHandler(error, req, res, null);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalled();

        const response = res.json.mock.calls[0][0];
        expect(response).toHaveProperty("error");
        expect(response).toHaveProperty("details");
      }
    });

    it("debería incluir detalles del campo en validación ZodError", () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      try {
        schema.parse({ name: "", email: "invalid" });
      } catch (error) {
        errorHandler(error, req, res, null);

        const response = res.json.mock.calls[0][0];
        expect(response.details).toBeDefined();
        expect(Array.isArray(response.details)).toBe(true);
      }
    });
  });

  describe("AppError handling", () => {
    it("debería manejar AppError con status 404", () => {
      const error = new AppError("Transacción no encontrada", 404);

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Transacción no encontrada",
        statusCode: 404,
      });
    });

    it("debería manejar AppError con status 401 (Unauthorized)", () => {
      const error = new AppError("No autorizado", 401);

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
    });

    it("debería manejar AppError con status 403 (Forbidden)", () => {
      const error = new AppError("Acceso denegado", 403);

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
    });

    it("debería manejar AppError con status 409 (Conflict)", () => {
      const error = new AppError("Conflicto de datos", 409);

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalled();
    });

    it("debería incluir detalles adicionales si están presentes", () => {
      const error = new AppError("Error de validación", 400, {
        field: "amount",
        reason: "debe ser positivo",
      });

      errorHandler(error, req, res, null);

      const response = res.json.mock.calls[0][0];
      expect(response.details).toBeDefined();
      expect(response.details.field).toBe("amount");
    });
  });

  describe("SQLite constraint error handling", () => {
    it("debería manejar SQLITE_CONSTRAINT con status 409", () => {
      const error = {
        code: "SQLITE_CONSTRAINT",
        message: "UNIQUE constraint failed",
      };

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalled();

      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe("Conflicto de datos");
    });
  });

  describe("JSON parse error handling", () => {
    it("debería manejar JSON parsing errors", () => {
      const error = {
        type: "entity.parse.failed",
        message: "Invalid JSON",
      };

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe("JSON inválido");
    });
  });

  describe("Unexpected error handling", () => {
    it("debería manejar errores inesperados con status 500", () => {
      const error = new Error("Algo inesperado ocurrió");

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Error interno del servidor",
      });
    });

    it("debería registrar error inesperado con console.error", () => {
      const error = new Error("Test error");

      errorHandler(error, req, res, null);

      expect(console.error).toHaveBeenCalled();
      const consoleCall = console.error.mock.calls[0][0];
      expect(consoleCall).toContain("[ERROR]");
      expect(consoleCall).toContain("POST");
      expect(consoleCall).toContain("/api/transactions");
    });

    it("debería manejar error null o undefined", () => {
      errorHandler(null, req, res, null);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Error interno del servidor",
      });
    });
  });

  describe("Error priority ordering", () => {
    it("debería priorizar ZodError sobre otros tipos", () => {
      const error = new z.ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["name"],
          message: "Se esperaba texto",
        },
      ]);

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("debería priorizar AppError sobre errores genéricos", () => {
      const error = new AppError("Recurso no encontrado", 404);

      errorHandler(error, req, res, null);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Recurso no encontrado",
          statusCode: 404,
        })
      );
    });
  });
});
