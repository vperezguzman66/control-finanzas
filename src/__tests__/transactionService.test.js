import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../repositories/transactionRepository.js", () => ({
  default: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import TransactionService from "../services/transactionService.js";
import TransactionRepository from "../repositories/transactionRepository.js";

describe("TransactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateTransaction", () => {
    it("aplica actualización parcial preservando el resto de campos", async () => {
      const existing = {
        id: 7,
        kind: "income",
        amount: 1200,
        category: "Bonus",
        description: "Original",
        date: "2026-05-13",
      };

      TransactionRepository.getById.mockResolvedValue(existing);
      TransactionRepository.update.mockResolvedValue(undefined);

      await TransactionService.updateTransaction(7, { description: "Solo descripción" });

      expect(TransactionRepository.update).toHaveBeenCalledTimes(1);
      expect(TransactionRepository.update).toHaveBeenCalledWith(7, {
        ...existing,
        description: "Solo descripción",
      });
    });

    it("no sobrescribe campos con undefined", async () => {
      const existing = {
        id: 7,
        kind: "income",
        amount: 1200,
        category: "Bonus",
        description: "Original description",
        date: "2026-05-13",
      };

      TransactionRepository.getById.mockResolvedValue(existing);
      TransactionRepository.update.mockResolvedValue(undefined);

      await TransactionService.updateTransaction(7, {
        description: "Nueva descripción",
        category: undefined,
        notes: undefined,
      });

      expect(TransactionRepository.update).toHaveBeenCalledTimes(1);
      const callArgs = TransactionRepository.update.mock.calls[0][1];

      // category debe mantener su valor original, no undefined
      expect(callArgs.category).toBe("Bonus");
      expect(callArgs.description).toBe("Nueva descripción");
      // notes no debe existir en el resultado si era undefined
      expect(callArgs.notes).toBeUndefined();
    });
  });

  describe("deleteTransaction", () => {
    it("retorna 404 cuando la transacción no existe", async () => {
      TransactionRepository.getById.mockResolvedValue(undefined);

      await expect(TransactionService.deleteTransaction(999999999)).rejects.toMatchObject({
        message: "Movimiento no encontrado",
        statusCode: 404,
      });
      expect(TransactionRepository.delete).not.toHaveBeenCalled();
    });
  });
});