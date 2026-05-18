import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import database from "./src/database.js";
import errorHandler from "./src/middleware/errorHandler.js";
import { createBasicAuthMiddleware } from "./src/middleware/basicAuth.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import subscriptionRoutes from "./src/routes/subscriptionRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import chartRoutes from "./src/routes/chartRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Inicializar base de datos
await database.initializeTables();

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const trustProxy = Number(process.env.TRUST_PROXY || 0);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 300);

if (Number.isInteger(trustProxy) && trustProxy >= 0) {
  app.set("trust proxy", trustProxy);
}

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

if (allowedOrigins.length > 0) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      maxAge: 86400,
    })
  );
}

app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const basicAuthMiddleware = createBasicAuthMiddleware({
  username: process.env.BASIC_AUTH_USER,
  password: process.env.BASIC_AUTH_PASSWORD,
  pin: process.env.BASIC_AUTH_PIN,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta nuevamente en unos minutos." },
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.use((error, _req, res, next) => {
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origen no permitido" });
  }
  return next(error);
});

// Health check
app.get("/health", async (_req, res, next) => {
  try {
    const dbHealth = await database.healthCheck();
    res.json({ ok: true, db: dbHealth });
  } catch (error) {
    next(error);
  }
});

// Rutas de API
app.use("/api", apiLimiter, basicAuthMiddleware);
app.use("/api/transactions", transactionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chart", chartRoutes);

app.use("/api", (_req, res) => {
  return res.status(404).json({ error: "Ruta no encontrada" });
});

// Servir aplicación frontend
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "finance-index.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "finance-index.html"));
});

// Middleware centralizado de manejo de errores
app.use(errorHandler);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Control de Finanzas disponible en http://localhost:${port}`);
});
