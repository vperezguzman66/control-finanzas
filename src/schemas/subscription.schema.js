import { z } from "zod";
import { amountSchema, dateSchema, nonEmptyStringSchema, optionalStringSchema, shortStringSchema } from "./shared.schema.js";

/**
 * Schema para crear/actualizar suscripciones
 */
const createSubscriptionSchema = z.object({
  name: nonEmptyStringSchema.max(120, { message: "El nombre es demasiado largo" }),
  amount: amountSchema,
  category: shortStringSchema,
  billingCycle: z.enum(["monthly", "quarterly", "annual"], {
    errorMap: () => ({ message: "El ciclo debe ser 'monthly', 'quarterly' o 'annual'" }),
  }),
  nextChargeDate: dateSchema,
  status: z.enum(["active", "paused"]).optional().default("active"),
  paymentMethod: z.string().trim().max(255, { message: "Este campo es demasiado largo" }).optional().default(""),
  notes: z.string().trim().max(220, { message: "Las notas son demasiado largas" }).optional().default(""),
});

/**
 * Schema para actualizar suscripciones (PATCH parcial)
 */
const updateSubscriptionSchema = z.object({
  name: nonEmptyStringSchema.max(120, { message: "El nombre es demasiado largo" }).optional(),
  amount: amountSchema.optional(),
  category: shortStringSchema.optional(),
  billingCycle: z.enum(["monthly", "quarterly", "annual"], {
    errorMap: () => ({ message: "El ciclo debe ser 'monthly', 'quarterly' o 'annual'" }),
  }).optional(),
  nextChargeDate: dateSchema.optional(),
  status: z.enum(["active", "paused"]).optional(),
  paymentMethod: z.string().trim().max(255, { message: "Este campo es demasiado largo" }).optional(),
  notes: z.string().trim().max(220, { message: "Las notas son demasiado largas" }).optional(),
})
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo a actualizar",
  });

export {
  createSubscriptionSchema,
  updateSubscriptionSchema,
};
