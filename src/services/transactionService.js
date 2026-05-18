import TransactionRepository from "../repositories/transactionRepository.js";
import { AppErrors } from "../utils/errors.js";

/**
 * Servicio con lógica de negocio para transacciones
 */
export class TransactionService {
  /**
   * Obtiene transacciones del mes especificado
   */
  static async getTransactionsByMonth(month) {
    return TransactionRepository.getByMonth(month);
  }

  /**
   * Crea una nueva transacción
   */
  static async createTransaction(transactionData) {
    return TransactionRepository.create(transactionData);
  }

  /**
   * Actualiza una transacción existente
   */
  static async updateTransaction(id, transactionData) {
    // Verificar que existe
    const existing = await TransactionRepository.getById(id);
    if (!existing) {
      throw AppErrors.notFound("Movimiento");
    }

    return TransactionRepository.update(id, {
      ...existing,
      ...transactionData,
    });
  }

  /**
   * Elimina una transacción
   */
  static async deleteTransaction(id) {
    const existing = await TransactionRepository.getById(id);
    if (!existing) {
      throw AppErrors.notFound("Movimiento");
    }

    return TransactionRepository.delete(id);
  }

  /**
   * Obtiene datos formateados para el dashboard
   */
  static async getDashboardData(month) {
    const totals = await TransactionRepository.getMonthlyStats(month);
    const subscriptionStats = await this.getSubscriptionStats();

    const income = Number(totals?.income || 0);
    const expenses = Number(totals?.expenses || 0);
    const monthlyRecurring = Number(subscriptionStats?.monthlyRecurring || 0);

    return {
      month,
      income,
      expenses,
      balance: income - expenses,
      netAfterSubscriptions: income - expenses - monthlyRecurring,
      monthlyRecurring,
      transactionCount: Number(totals?.transactionCount || 0),
      recurringTransactions: Number(totals?.recurringTransactions || 0),
      activeSubscriptions: Number(subscriptionStats?.activeSubscriptions || 0),
      totalSubscriptions: Number(subscriptionStats?.totalSubscriptions || 0),
    };
  }

  /**
   * Obtiene estadísticas de suscripciones (importado de SubscriptionService)
   */
  static async getSubscriptionStats() {
    // Importar aquí para evitar circular dependency
    const SubscriptionService = (await import("./subscriptionService.js")).default;
    return SubscriptionService.getStats();
  }

  /**
   * Obtiene datos para el gráfico de desglose de gastos
   */
  static async getExpenseBreakdown(month) {
    const rows = await TransactionRepository.getExpenseBreakdown(month);
    return {
      labels: rows.map((r) => r.category),
      values: rows.map((r) => Number(r.total)),
    };
  }

  /**
   * Obtiene datos para el gráfico de tendencia mensual (últimos 12 meses)
   */
  static async getMonthlyTrend() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().slice(0, 7);
      months.push(month);
    }

    return TransactionRepository.getMonthlyTrend(months);
  }
}

export default TransactionService;
