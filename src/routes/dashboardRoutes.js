import express from "express";
import DashboardController from "../controllers/dashboardController.js";
import { validateMonthQuery } from "../validators/index.js";

const router = express.Router();

/**
 * GET /api/dashboard
 * Obtiene estadísticas del dashboard para el mes especificado
 */
router.get("/", validateMonthQuery, DashboardController.getDashboard);

export default router;
