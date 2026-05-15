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

  return {
    error: fallbackMessage,
    details: details.length > 0 ? details : [{ field: "root", message: error.message }],
  };
}
