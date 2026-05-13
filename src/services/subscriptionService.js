import SubscriptionRepository from "../repositories/subscriptionRepository.js";
import { billingMonths, addMonths } from "../utils/helpers.js";

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
      throw new Error("Suscripción no encontrada");
    }

    return SubscriptionRepository.update(id, subscriptionData);
  }

  /**
   * Alterna el estado de una suscripción (activa/pausa)
   */
  static async toggleSubscriptionStatus(id) {
    const subscription = await SubscriptionRepository.getById(id);
    if (!subscription) {
      throw new Error("Suscripción no encontrada");
    }

    const nextStatus = subscription.status === "active" ? "paused" : "active";
    const nextChargeDate =
      nextStatus === "active"
        ? addMonths(
            subscription.next_charge_date,
            billingMonths(subscription.billing_cycle)
          )
        : subscription.next_charge_date;

    await SubscriptionRepository.updateStatus(id, nextStatus, nextChargeDate);

    return { status: nextStatus, nextChargeDate };
  }

  /**
   * Elimina una suscripción
   */
  static async deleteSubscription(id) {
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
