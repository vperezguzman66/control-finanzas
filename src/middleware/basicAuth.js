import { timingSafeEqual } from "crypto";

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function challenge(res) {
  res.setHeader("WWW-Authenticate", 'Basic realm="Control de Finanzas", charset="UTF-8"');
  return res.status(401).json({ error: "Autenticación requerida" });
}

export function createBasicAuthMiddleware({ username, password } = {}) {
  const enabled = Boolean(username && password);

  return function basicAuthMiddleware(req, res, next) {
    if (!enabled) {
      return next();
    }

    const header = req.headers.authorization || "";
    if (!header.startsWith("Basic ")) {
      return challenge(res);
    }

    let decoded = "";
    try {
      decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    } catch (_error) {
      return challenge(res);
    }

    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      return challenge(res);
    }

    const providedUsername = decoded.slice(0, separatorIndex);
    const providedPassword = decoded.slice(separatorIndex + 1);

    if (!safeCompare(providedUsername, username) || !safeCompare(providedPassword, password)) {
      return challenge(res);
    }

    return next();
  };
}
