import express from "express";
import DashboardController from "../controllers/dashboardController.js";
import { validateMonthQuery } from "../validators/index.js";

const router = express.Router();

/**
 * GET /api/chart/monthly-trend
 * Obtiene datos del gráfico de tendencia mensual (últimos 12 meses)
 */
router.get("/monthly-trend", DashboardController.getMonthlyTrend);

/**
 * GET /api/chart/expense-breakdown
 * Obtiene datos del gráfico de desglose de gastos
 */
router.get("/expense-breakdown", validateMonthQuery, DashboardController.getExpenseBreakdown);

export default router;
