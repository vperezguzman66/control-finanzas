import SubscriptionRepository from "../repositories/subscriptionRepository.js";
import { billingMonths, addMonths } from "../utils/helpers.js";
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

    return SubscriptionRepository.update(id, {
      ...existing,
      ...subscriptionData,
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
    const nextChargeDate =
      nextStatus === "active"
        ? addMonths(
            subscription.nextChargeDate,
            billingMonths(subscription.billingCycle)
          )
        : subscription.nextChargeDate;

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
