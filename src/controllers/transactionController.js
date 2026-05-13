import TransactionService from "../services/transactionService.js";

/**
 * Controlador para las operaciones de transacciones
 */
export class TransactionController {
  /**
   * GET /api/transactions
   */
  static async getTransactions(req, res, next) {
    try {
      const month = req.validatedQuery.month || new Date().toISOString().slice(0, 7);
      const transactions = await TransactionService.getTransactionsByMonth(month);

      return res.json({
        month,
        transactions: transactions.map((row) => ({
          ...row,
          recurring: Boolean(row.recurring),
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/transactions
   */
  static async createTransaction(req, res, next) {
    try {
      await TransactionService.createTransaction(req.validatedBody);
      return res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/transactions/:id
   */
  static async updateTransaction(req, res, next) {
    try {
      const { id } = req.validatedParams;
      await TransactionService.updateTransaction(id, req.validatedBody);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/transactions/:id
   */
  static async deleteTransaction(req, res, next) {
    try {
      const { id } = req.validatedParams;
      await TransactionService.deleteTransaction(id);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
}

export default TransactionController;
