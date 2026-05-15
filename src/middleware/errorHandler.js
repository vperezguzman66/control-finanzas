import { z } from "zod";
import { AppError } from "../utils/errors.js";
import { formatZodError } from "../utils/validation.js";

/**
 * Middleware centralizado de manejo de errores
 */
function errorHandler(error, req, res, next) {
  // Manejo de errores de validación Zod
  if (error instanceof z.ZodError) {
    return res.status(400).json(formatZodError(error, "Validación fallida"));
  }

  // Manejo de AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Errores de base de datos (SQLite)
  if (error && error.code === "SQLITE_CONSTRAINT") {
    return res.status(409).json({
      error: "Conflicto de datos",
      details: error.message,
    });
  }

  // Error de parsing de JSON
  if (error && error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "JSON inválido",
      details: "El body de la solicitud debe ser JSON válido",
    });
  }

  // Error por defecto - Error interno
  return res.status(500).json({
    error: "Error interno del servidor",
  });
}

export default errorHandler;
