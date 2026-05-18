import SubscriptionRepository from "../repositories/subscriptionRepository.js";
import { billingMonths, addMonths, getCurrentDate, removeUndefinedKeys } from "../utils/helpers.js";
import { AppErrors } from "../utils/errors.js";

/**
 * Servicio con lógica de negocio para suscripciones
 */
export class SubscriptionService {
  /**
   * Obtiene todas las suscripciones
   */
  static async getAllSubscriptions() {
    return SubscriptionRepository.getAll();
  }

  /**
   * Crea una nueva suscripción
   */
  static async createSubscription(subscriptionData) {
    return SubscriptionRepository.create(subscriptionData);
  }

  /**
   * Actualiza una suscripción existente
   */
  static async updateSubscription(id, subscriptionData) {
    // Verificar que existe
    const existing = await SubscriptionRepository.getById(id);
    if (!existing) {
      throw AppErrors.notFound("Suscripción");
    }

    // Sanitizar datos para evitar que undefined sobrescriba campos existentes
    const sanitizedData = removeUndefinedKeys(subscriptionData);

    return SubscriptionRepository.update(id, {
      ...existing,
      ...sanitizedData,
    });
  }

  /**
   * Alterna el estado de una suscripción (activa/pausa)
   */
  static async toggleSubscriptionStatus(id) {
    const subscription = await SubscriptionRepository.getById(id);
    if (!subscription) {
      throw AppErrors.notFound("Suscripción");
    }

    const nextStatus = subscription.status === "active" ? "paused" : "active";
    let nextChargeDate = subscription.nextChargeDate;

    if (nextStatus === "active") {
      // Al reactivar, avanzar por ciclos de facturación hasta que la fecha
      // quede estrictamente en el futuro (evita cobros retroactivos).
      const cycleMonths = billingMonths(subscription.billingCycle);
      const today = getCurrentDate();
      while (nextChargeDate <= today) {
        nextChargeDate = addMonths(nextChargeDate, cycleMonths);
      }
    }

    await SubscriptionRepository.updateStatus(id, nextStatus, nextChargeDate);

    return { status: nextStatus, nextChargeDate };
  }

  /**
   * Elimina una suscripción
   */
  static async deleteSubscription(id) {
    const existing = await SubscriptionRepository.getById(id);
    if (!existing) {
      throw AppErrors.notFound("Suscripción");
    }

    return SubscriptionRepository.delete(id);
  }

  /**
   * Obtiene estadísticas de suscripciones
   */
  static async getStats() {
    return SubscriptionRepository.getStats();
  }
}

export default SubscriptionService;
