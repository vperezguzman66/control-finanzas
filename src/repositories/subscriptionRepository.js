import { run, all, get } from "../database.js";

/**
 * Repositorio para operaciones CRUD de suscripciones
 */
export class SubscriptionRepository {
  /**
   * Obtiene todas las suscripciones
   */
  static async getAll() {
    return all(
      `
        SELECT
          id,
          name,
          category,
          amount,
          billing_cycle AS billingCycle,
          next_charge_date AS nextChargeDate,
          status,
          payment_method AS paymentMethod,
          notes,
          created_at AS createdAt
        FROM subscriptions
        ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, next_charge_date ASC, id DESC
      `
    );
  }

  /**
   * Crea una nueva suscripción
   */
  static async create(subscription) {
    const {
      name,
      category,
      amount,
      billingCycle,
      nextChargeDate,
      status,
      paymentMethod,
      notes,
    } = subscription;

    return run(
      `
        INSERT INTO subscriptions(name, category, amount, billing_cycle, next_charge_date, status, payment_method, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        category,
        amount,
        billingCycle,
        nextChargeDate,
        status,
        paymentMethod || null,
        notes || null,
        new Date().toISOString(),
      ]
    );
  }

  /**
   * Actualiza una suscripción existente
   */
  static async update(id, subscription) {
    const {
      name,
      category,
      amount,
      billingCycle,
      nextChargeDate,
      status,
      paymentMethod,
      notes,
    } = subscription;

    return run(
      `
        UPDATE subscriptions
        SET name = ?, category = ?, amount = ?, billing_cycle = ?, next_charge_date = ?, status = ?, payment_method = ?, notes = ?
        WHERE id = ?
      `,
      [
        name,
        category,
        amount,
        billingCycle,
        nextChargeDate,
        status,
        paymentMethod || null,
        notes || null,
        id,
      ]
    );
  }

  /**
   * Actualiza solo el estado y la fecha de próximo cobro
   */
  static async updateStatus(id, status, nextChargeDate) {
    return run(
      "UPDATE subscriptions SET status = ?, next_charge_date = ? WHERE id = ?",
      [status, nextChargeDate, id]
    );
  }

  /**
   * Elimina una suscripción
   */
  static async delete(id) {
    return run("DELETE FROM subscriptions WHERE id = ?", [id]);
  }

  /**
   * Obtiene una suscripción por ID
   */
  static async getById(id) {
    return get(
      `
        SELECT
          id,
          name,
          category,
          amount,
          billing_cycle AS billingCycle,
          next_charge_date AS nextChargeDate,
          status,
          payment_method AS paymentMethod,
          notes,
          created_at AS createdAt
        FROM subscriptions
        WHERE id = ?
      `,
      [id]
    );
  }

  /**
   * Obtiene estadísticas de suscripciones
   */
  static async getStats() {
    return get(
      `
        SELECT
          COUNT(*) AS totalSubscriptions,
          COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS activeSubscriptions,
          COALESCE(SUM(CASE WHEN status = 'active' THEN amount / CASE billing_cycle WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3 WHEN 'annual' THEN 12 END ELSE 0 END), 0) AS monthlyRecurring
        FROM subscriptions
      `
    );
  }
}

export default SubscriptionRepository;
