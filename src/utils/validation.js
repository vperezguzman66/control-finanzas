import { z } from "zod";

export function formatZodError(error, fallbackMessage = "Validación fallida") {
  if (!(error instanceof z.ZodError)) {
    return null;
  }

  const flattened = error.flatten();
  const details = [];

  Object.entries(flattened.fieldErrors || {}).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      messages.forEach((message) => {
        details.push({ field, message });
      });
    }
  });

  if (Array.isArray(flattened.formErrors)) {
    flattened.formErrors.forEach((message) => {
      details.push({ field: "root", message });
    });
  }

  if (details.length === 0 && Array.isArray(error.issues)) {
    error.issues.forEach((issue) => {
      const field = issue.path?.length ? issue.path.join(".") : "root";
      details.push({ field, message: issue.message });
    });
  }

  const result = {
    error: fallbackMessage,
    details: details.length > 0 ? details : [{ field: "root", message: fallbackMessage }],
  };

  if (details.length === 1 && details[0].message === "Debes enviar al menos un campo a actualizar") {
    result.error = "Debes enviar al menos un campo a actualizar";
  }

  return result;
}
