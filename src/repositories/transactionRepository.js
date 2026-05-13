import { run, all, get } from "../database.js";

/**
 * Repositorio para operaciones CRUD de transacciones
 */
export class TransactionRepository {
  /**
   * Obtiene transacciones de un mes
   */
  static async getByMonth(month) {
    return all(
      `
        SELECT
          id,
          kind,
          category,
          description,
          amount,
          date,
          payment_method AS paymentMethod,
          notes,
          recurring,
          created_at AS createdAt
        FROM transactions
        WHERE substr(date, 1, 7) = ?
        ORDER BY date DESC, id DESC
      `,
      [month]
    );
  }

  /**
   * Crea una nueva transacción
   */
  static async create(transaction) {
    const {
      kind,
      category,
      description,
      amount,
      date,
      paymentMethod,
      notes,
      recurring,
    } = transaction;

    return run(
      `
        INSERT INTO transactions(kind, category, description, amount, date, payment_method, notes, recurring, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        kind,
        category,
        description,
        amount,
        date,
        paymentMethod || null,
        notes || null,
        recurring ? 1 : 0,
        new Date().toISOString(),
      ]
    );
  }

  /**
   * Actualiza una transacción existente
   */
  static async update(id, transaction) {
    const {
      kind,
      category,
      description,
      amount,
      date,
      paymentMethod,
      notes,
      recurring,
    } = transaction;

    return run(
      `
        UPDATE transactions
        SET kind = ?, category = ?, description = ?, amount = ?, date = ?, payment_method = ?, notes = ?, recurring = ?
        WHERE id = ?
      `,
      [
        kind,
        category,
        description,
        amount,
        date,
        paymentMethod || null,
        notes || null,
        recurring ? 1 : 0,
        id,
      ]
    );
  }

  /**
   * Elimina una transacción
   */
  static async delete(id) {
    return run("DELETE FROM transactions WHERE id = ?", [id]);
  }

  /**
   * Obtiene una transacción por ID
   */
  static async getById(id) {
    return get("SELECT id FROM transactions WHERE id = ?", [id]);
  }

  /**
   * Obtiene estadísticas de transacciones para un mes
   */
  static async getMonthlyStats(month) {
    return get(
      `
        SELECT
          COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
          COUNT(*) AS transactionCount,
          COALESCE(SUM(recurring), 0) AS recurringTransactions
        FROM transactions
        WHERE substr(date, 1, 7) = ?
      `,
      [month]
    );
  }

  /**
   * Obtiene datos para el gráfico de desglose de gastos
   */
  static async getExpenseBreakdown(month) {
    return all(
      `
        SELECT
          category,
          COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE substr(date, 1, 7) = ? AND kind = 'expense'
        GROUP BY category
        ORDER BY total DESC
      `,
      [month]
    );
  }

  /**
   * Obtiene datos para el gráfico de tendencia mensual
   */
  static async getMonthlyTrend(months) {
    const placeholders = months.map(() => "?").join(",");
    const data = { labels: months, income: [], expenses: [] };

    const results = await all(
      `
        SELECT
          substr(date, 1, 7) AS month,
          COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS expenses
        FROM transactions
        WHERE substr(date, 1, 7) IN (${placeholders})
        GROUP BY substr(date, 1, 7)
      `,
      months
    );

    // Mapear resultados a los meses solicitados (mantener orden y llenar con ceros)
    const resultMap = new Map(results.map(r => [r.month, r]));
    months.forEach(month => {
      const result = resultMap.get(month) || { income: 0, expenses: 0 };
      data.income.push(Number(result.income || 0));
      data.expenses.push(Number(result.expenses || 0));
    });

    return data;
  }
}

export default TransactionRepository;
