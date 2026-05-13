/**
 * Clase personalizada para errores de aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Errores comunes
 */
const AppErrors = {
  validation: (message, details) => new AppError(message, 400, details),
  notFound: (resource) => new AppError(`${resource} no encontrado`, 404),
  unauthorized: () => new AppError("No autorizado", 401),
  forbidden: () => new AppError("Acceso denegado", 403),
  conflict: (message) => new AppError(message, 409),
  server: (message) => new AppError(message || "Error interno del servidor", 500),
};

export {
  AppError,
  AppErrors,
};
