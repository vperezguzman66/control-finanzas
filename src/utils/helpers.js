/**
 * Convierte un ciclo de facturación a número de meses
 */
export function billingMonths(cycle) {
  switch (cycle) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "annual":
      return 12;
    default:
      return 1;
  }
}

/**
 * Suma meses a una fecha
 */
export function addMonths(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

/**
 * Obtiene el mes actual en formato YYYY-MM
 */
export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}
