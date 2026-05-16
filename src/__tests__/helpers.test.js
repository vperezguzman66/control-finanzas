import { describe, it, expect } from "vitest";
import { billingMonths, addMonths, getCurrentMonth } from "../utils/helpers.js";

describe("helpers utils", () => {
  describe("billingMonths", () => {
    it("retorna meses correctos por ciclo", () => {
      expect(billingMonths("monthly")).toBe(1);
      expect(billingMonths("quarterly")).toBe(3);
      expect(billingMonths("annual")).toBe(12);
    });

    it("usa 1 como fallback para ciclos desconocidos", () => {
      expect(billingMonths("weekly")).toBe(1);
      expect(billingMonths(undefined)).toBe(1);
    });
  });

  describe("addMonths", () => {
    it("suma meses manteniendo la fecha cuando aplica", () => {
      expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
      expect(addMonths("2026-01-15", 3)).toBe("2026-04-15");
      expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
    });
  });

  describe("getCurrentMonth", () => {
    it("devuelve el mes actual en formato YYYY-MM", () => {
      expect(getCurrentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    });
  });
});
