import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../repositories/subscriptionRepository.js", () => ({
  default: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import SubscriptionService from "../services/subscriptionService.js";
import SubscriptionRepository from "../repositories/subscriptionRepository.js";

describe("SubscriptionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateSubscription", () => {
    it("aplica actualización parcial preservando el resto de campos", async () => {
      const existing = {
        id: 11,
        name: "Updated Sub",
        amount: 10,
        category: "Test",
        billingCycle: "quarterly",
        nextChargeDate: "2026-08-13",
        notes: null,
      };

      SubscriptionRepository.getById.mockResolvedValue(existing);
      SubscriptionRepository.update.mockResolvedValue(undefined);

      await SubscriptionService.updateSubscription(11, { notes: "Solo notas" });

      expect(SubscriptionRepository.update).toHaveBeenCalledTimes(1);
      expect(SubscriptionRepository.update).toHaveBeenCalledWith(11, {
        ...existing,
        notes: "Solo notas",
      });
    });
  });

  describe("deleteSubscription", () => {
    it("retorna 404 cuando la suscripción no existe", async () => {
      SubscriptionRepository.getById.mockResolvedValue(undefined);

      await expect(SubscriptionService.deleteSubscription(999999999)).rejects.toMatchObject({
        message: "Suscripción no encontrado",
        statusCode: 404,
      });
      expect(SubscriptionRepository.delete).not.toHaveBeenCalled();
    });
  });
});