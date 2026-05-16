import { z } from "zod";
import {
  amountSchema,
  dateSchema,
  monthSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
  shortStringSchema,
} from "./shared.schema.js";

/**
 * Schema para crear/actualizar transacciones
 */
const createTransactionSchema = z.object({
  kind: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "El tipo debe ser 'income' o 'expense'" }),
  }),
  amount: amountSchema,
  category: shortStringSchema,
  date: dateSchema,
  description: nonEmptyStringSchema.max(120, { message: "La descripción es demasiado larga" }),
  paymentMethod: optionalStringSchema.optional().default(""),
  recurring: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val === "true" || val === "1";
    })
    .optional()
    .default(false),
  notes: z
    .string()
    .trim()
    .max(220, { message: "Las notas son demasiado largas" })
    .optional()
    .default(""),
});

/**
 * Schema para actualizar transacciones (PATCH parcial)
 */
const updateTransactionSchema = z.object({
  kind: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "El tipo debe ser 'income' o 'expense'" }),
  }).optional(),
  amount: amountSchema.optional(),
  category: shortStringSchema.optional(),
  date: dateSchema.optional(),
  description: nonEmptyStringSchema.max(120, { message: "La descripción es demasiado larga" }).optional(),
  paymentMethod: z.string().trim().max(255, { message: "Este campo es demasiado largo" }).optional(),
  recurring: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val === "true" || val === "1";
    })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(220, { message: "Las notas son demasiado largas" })
    .optional(),
})
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo a actualizar",
  });

/**
 * Schema para parámetros de query
 */
const transactionQuerySchema = z.object({
  month: monthSchema,
});

export {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
};
