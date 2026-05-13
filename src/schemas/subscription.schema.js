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
 * Schema para actualizar suscripciones (igual al create por ahora)
 */
const updateSubscriptionSchema = createSubscriptionSchema.partial().required({
  name: true,
  amount: true,
  category: true,
  billingCycle: true,
  nextChargeDate: true,
});

export {
  createSubscriptionSchema,
  updateSubscriptionSchema,
};
