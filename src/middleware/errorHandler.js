import { z } from "zod";
import { AppError } from "../utils/errors.js";

/**
 * Middleware centralizado de manejo de errores
 */
function errorHandler(error, req, res, next) {
  // Manejo de errores de validación Zod
  if (error instanceof z.ZodError) {
    const flattened = error.flatten();
    const details = [];
    
    // Procesar errores de campos
    Object.entries(flattened.fieldErrors || {}).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message) => {
          details.push({ field, message });
        });
      }
    });
    
    return res.status(400).json({
      error: "Validación fallida",
      details: details.length > 0 ? details : [{ field: "root", message: error.message }],
    });
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
