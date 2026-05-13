import TransactionService from "../services/transactionService.js";
import TransactionRepository from "../repositories/transactionRepository.js";
import { getCurrentMonth } from "../utils/helpers.js";

/**
 * Controlador para las operaciones de transacciones
 */
export class TransactionController {
  /**
   * GET /api/transactions
   */
  static async getTransactions(req, res, next) {
    try {
      const month = req.validatedQuery.month || getCurrentMonth();
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

  /**
   * GET /api/transactions/export
   */
  static async exportTransactions(req, res, next) {
    try {
      const month = req.validatedQuery.month || getCurrentMonth();
      const rows = await TransactionRepository.getExportByMonth(month);
      const csv = TransactionRepository.toCsv(rows);
      const filename = `transactions-${month}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export default TransactionController;
