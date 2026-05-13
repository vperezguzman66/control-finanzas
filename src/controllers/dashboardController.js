import TransactionService from "../services/transactionService.js";

/**
 * Controlador para dashboards y gráficas
 */
export class DashboardController {
  /**
   * GET /api/dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const month = req.validatedQuery.month;
      const data = await TransactionService.getDashboardData(month);
      return res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chart/monthly-trend
   */
  static async getMonthlyTrend(req, res, next) {
    try {
      const data = await TransactionService.getMonthlyTrend();
      return res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chart/expense-breakdown
   */
  static async getExpenseBreakdown(req, res, next) {
    try {
      const month = req.validatedQuery.month;
      const data = await TransactionService.getExpenseBreakdown(month);
      return res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default DashboardController;
