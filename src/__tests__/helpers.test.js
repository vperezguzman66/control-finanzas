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

    it("clampea al último día del mes destino cuando el día no existe", () => {
      // 31 enero + 1 mes → 28 febrero (2026 no es bisiesto)
      expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
      // 31 enero + 1 mes → 29 febrero (2028 es bisiesto)
      expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
      // 30 noviembre + 3 meses → 28 febrero (año no bisiesto)
      expect(addMonths("2025-11-30", 3)).toBe("2026-02-28");
      // 31 marzo + 1 mes → 30 abril (abril tiene 30 días)
      expect(addMonths("2026-03-31", 1)).toBe("2026-04-30");
    });

    it("maneja cruce de año correctamente", () => {
      expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
      expect(addMonths("2026-11-30", 2)).toBe("2027-01-30");
    });
  });

  describe("getCurrentMonth", () => {
    it("devuelve el mes actual en formato YYYY-MM", () => {
      expect(getCurrentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    });
  });
});
