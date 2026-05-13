import express from "express";
import SubscriptionController from "../controllers/subscriptionController.js";
import {
  validateParamId,
  validateCreateSubscription,
  validateUpdateSubscription,
} from "../validators/index.js";

const router = express.Router();

/**
 * GET /api/subscriptions
 * Obtiene todas las suscripciones
 */
router.get("/", SubscriptionController.getSubscriptions);

/**
 * POST /api/subscriptions
 * Crea una nueva suscripción
 */
router.post("/", validateCreateSubscription, SubscriptionController.createSubscription);

/**
 * PATCH /api/subscriptions/:id
 * Actualiza una suscripción existente
 */
router.patch(
  "/:id",
  validateParamId,
  validateUpdateSubscription,
  SubscriptionController.updateSubscription
);

/**
 * PATCH /api/subscriptions/:id/toggle
 * Alterna el estado de una suscripción (activa/pausa)
 */
router.patch("/:id/toggle", validateParamId, SubscriptionController.toggleSubscriptionStatus);

/**
 * DELETE /api/subscriptions/:id
 * Elimina una suscripción
 */
router.delete("/:id", validateParamId, SubscriptionController.deleteSubscription);

export default router;
