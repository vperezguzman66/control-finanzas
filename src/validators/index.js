import { z } from "zod";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from "../schemas/transaction.schema.js";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from "../schemas/subscription.schema.js";
import { monthSchema } from "../schemas/shared.schema.js";
import { AppError } from "../utils/errors.js";

/**
 * Middleware genérico para validar body con un schema Zod
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      return next();
    } catch (error) {
      // Manejo de ZodError usando instanceof y flatten()
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
      // Si no es error de validación, pasar al siguiente middleware
      return next(error);
    }
  };
}

/**
 * Middleware genérico para validar query con un schema Zod
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      return next();
    } catch (error) {
      // Manejo de ZodError usando instanceof y flatten()
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
          error: "Validación de parámetros fallida",
          details: details.length > 0 ? details : [{ field: "root", message: error.message }],
        });
      }
      // Si no es error de validación, pasar al siguiente middleware
      return next(error);
    }
  };
}

/**
 * Middleware para validar ID en params
 */
function validateParamId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  req.validatedParams = { id };
  next();
}

/**
 * Validadores para transacciones
 */

const validateCreateTransaction = validateBody(createTransactionSchema);
const validateUpdateTransaction = validateBody(updateTransactionSchema);
const validateTransactionQuery = validateQuery(transactionQuerySchema);

/**
 * Validadores para suscripciones
 */

const validateCreateSubscription = validateBody(createSubscriptionSchema);
const validateUpdateSubscription = validateBody(updateSubscriptionSchema);

/**
 * Validadores para queries de mes
 */

const validateMonthQuery = validateQuery(
  z.object({
    month: monthSchema,
  })
);

export {
  validateParamId,
  validateCreateTransaction,
  validateUpdateTransaction,
  validateTransactionQuery,
  validateCreateSubscription,
  validateUpdateSubscription,
  validateMonthQuery,
};
