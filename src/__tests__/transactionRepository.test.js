import TransactionRepository from "../repositories/transactionRepository.js";

describe("TransactionRepository CSV export", () => {
  it("neutraliza fórmulas peligrosas al exportar strings a CSV", () => {
    const csv = TransactionRepository.toCsv([
      {
        id: 1,
        kind: "expense",
        category: "=cmd|' /C calc'!A0",
        description: "+SUM(1,2)",
        amount: 5000,
        date: "2026-05-15",
        paymentMethod: "@malicious",
        notes: " -hidden formula",
        recurring: false,
        createdAt: "2026-05-15T00:00:00.000Z",
      },
    ]);

    expect(csv).toContain("'=cmd|' /C calc'!A0");
    expect(csv).toContain("'+SUM(1,2)");
    expect(csv).toContain("'@malicious");
    expect(csv).toContain("' -hidden formula");
  });

  it("mantiene el escapado CSV estándar para comillas y comas", () => {
    const csv = TransactionRepository.toCsv([
      {
        id: 2,
        kind: "expense",
        category: "Comida",
        description: "Cena, \"italiana\"",
        amount: 12000,
        date: "2026-05-15",
        paymentMethod: "Tarjeta",
        notes: "Mesa, ventana",
        recurring: false,
        createdAt: "2026-05-15T00:00:00.000Z",
      },
    ]);

    expect(csv).toContain('"Cena, ""italiana"""');
    expect(csv).toContain('"Mesa, ventana"');
  });
});
