import express from "express";
import TransactionController from "../controllers/transactionController.js";
import {
  validateParamId,
  validateCreateTransaction,
  validateUpdateTransaction,
  validateTransactionQuery,
} from "../validators/index.js";

const router = express.Router();

/**
 * GET /api/transactions
 * Obtiene transacciones del mes especificado (o mes actual)
 */
router.get("/", validateTransactionQuery, TransactionController.getTransactions);

/**
 * POST /api/transactions
 * Crea una nueva transacción
 */
router.post("/", validateCreateTransaction, TransactionController.createTransaction);

/**
 * PATCH /api/transactions/:id
 * Actualiza una transacción existente
 */
router.patch(
  "/:id",
  validateParamId,
  validateUpdateTransaction,
  TransactionController.updateTransaction
);

/**
 * DELETE /api/transactions/:id
 * Elimina una transacción
 */
router.delete("/:id", validateParamId, TransactionController.deleteTransaction);

export default router;
