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
 * Suma meses a una fecha, clampeando al último día del mes destino
 * cuando el día original no existe en dicho mes (ej: 31 ene + 1 = 28 feb).
 */
export function addMonths(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDate();
  const targetMonth = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  // Último día del mes destino
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  const yyyy = String(targetYear).padStart(4, "0");
  const mm = String(normalizedMonth + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Obtiene el mes actual en formato YYYY-MM
 */
export function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (hora local)
 */
export function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
