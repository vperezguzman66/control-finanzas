import { z } from "zod";

/**
 * Validadores compartidos para campos comunes
 */

// Parseo y validación de cantidad (monto)
const amountSchema = z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .refine((val) => Number.isFinite(val), {
    message: "El importe debe ser un número válido",
  })
  .refine((val) => val > 0, {
    message: "El importe debe ser mayor que cero",
  })
  .transform((val) => Math.round(val)); // Redondea a entero

// Parseo y validación de fecha (YYYY-MM-DD)
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La fecha debe estar en formato YYYY-MM-DD",
  })
  .refine((dateStr) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return !Number.isNaN(date.getTime());
  }, {
    message: "La fecha no es válida",
  });

// Parseo y validación de mes (YYYY-MM)
const monthSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val || typeof val !== "string") {
      return new Date().toISOString().slice(0, 7);
    }
    const trimmed = val.trim();
    if (!/^\d{4}-\d{2}$/.test(trimmed)) {
      return new Date().toISOString().slice(0, 7);
    }
    return trimmed;
  });

// Parseo y validación de string no vacío
const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, { message: "Este campo no puede estar vacío" })
  .max(255, { message: "Este campo es demasiado largo" });

// String opcional (puede ser vacío o no incluído)
const optionalStringSchema = z
  .string()
  .trim()
  .max(255, { message: "Este campo es demasiado largo" })
  .optional()
  .default("");

// String corto (para categorías, métodos de pago)
const shortStringSchema = z
  .string()
  .trim()
  .min(1, { message: "Este campo no puede estar vacío" })
  .max(80, { message: "Este campo es demasiado largo" });

export {
  amountSchema,
  dateSchema,
  monthSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
  shortStringSchema,
};
