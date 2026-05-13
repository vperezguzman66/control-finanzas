import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import sqlite3Module from "sqlite3";
import dotenv from "dotenv";
import {
  validateParamId,
  validateCreateTransaction,
  validateUpdateTransaction,
  validateTransactionQuery,
  validateCreateSubscription,
  validateUpdateSubscription,
  validateMonthQuery,
} from "./src/validators/index.js";
import errorHandler from "./src/middleware/errorHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "finance.db");
const sqlite3 = sqlite3Module.verbose();
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onResult(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function asMonth(value) {
  const fallback = new Date().toISOString().slice(0, 7);
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) return fallback;
  return normalized;
}

function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El importe debe ser un número mayor que cero");
  }
  return Math.round(amount);
}

function parseDate(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("La fecha no es válida");
  }
  return normalized;
}

function billingMonths(cycle) {
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

function addMonths(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

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
        connectSrc: ["'self'"],
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
        return callback(null, false);
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      maxAge: 86400,
    })
  );
}

app.use(compression());
app.use(express.json({ limit: "100kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta nuevamente en unos minutos." },
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/api", apiLimiter);

app.use((error, _req, res, next) => {
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origen no permitido" });
  }
  return next(error);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT,
      notes TEXT,
      recurring INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly', 'quarterly', 'annual')),
      next_charge_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'paused')) DEFAULT 'active',
      payment_method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);
});

app.get("/api/dashboard", validateMonthQuery, async (req, res, next) => {
  try {
    const month = req.validatedQuery.month;
    const totals = await get(
      `
        SELECT
          COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
          COUNT(*) AS transactionCount,
          COALESCE(SUM(recurring), 0) AS recurringTransactions
        FROM transactions
        WHERE substr(date, 1, 7) = ?
      `,
      [month]
    );

    const subscriptions = await get(
      `
        SELECT
          COUNT(*) AS totalSubscriptions,
          COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS activeSubscriptions,
          COALESCE(SUM(CASE WHEN status = 'active' THEN amount / CASE billing_cycle WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3 WHEN 'annual' THEN 12 END ELSE 0 END), 0) AS monthlyRecurring
        FROM subscriptions
      `
    );

    const income = Number(totals?.income || 0);
    const expenses = Number(totals?.expenses || 0);
    const monthlyRecurring = Number(subscriptions?.monthlyRecurring || 0);

    return res.json({
      month,
      income,
      expenses,
      balance: income - expenses,
      netAfterSubscriptions: income - expenses - monthlyRecurring,
      monthlyRecurring,
      transactionCount: Number(totals?.transactionCount || 0),
      recurringTransactions: Number(totals?.recurringTransactions || 0),
      activeSubscriptions: Number(subscriptions?.activeSubscriptions || 0),
      totalSubscriptions: Number(subscriptions?.totalSubscriptions || 0),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/transactions", validateTransactionQuery, async (req, res, next) => {
  try {
    const month = req.validatedQuery.month || new Date().toISOString().slice(0, 7);
    const rows = await all(
      `
        SELECT
          id,
          kind,
          category,
          description,
          amount,
          date,
          payment_method AS paymentMethod,
          notes,
          recurring,
          created_at AS createdAt
        FROM transactions
        WHERE substr(date, 1, 7) = ?
        ORDER BY date DESC, id DESC
      `,
      [month]
    );

    return res.json({
      month,
      transactions: rows.map((row) => ({
        ...row,
        recurring: Boolean(row.recurring),
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/transactions", validateCreateTransaction, async (req, res, next) => {
  try {
    const {
      kind,
      category,
      description,
      amount,
      date,
      paymentMethod,
      notes,
      recurring,
    } = req.validatedBody;

    await run(
      `
        INSERT INTO transactions(kind, category, description, amount, date, payment_method, notes, recurring, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        kind,
        category,
        description,
        amount,
        date,
        paymentMethod || null,
        notes || null,
        recurring ? 1 : 0,
        new Date().toISOString(),
      ]
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/transactions/:id",
  validateParamId,
  validateUpdateTransaction,
  async (req, res, next) => {
    try {
      const { id } = req.validatedParams;
      const {
        kind,
        category,
        description,
        amount,
        date,
        paymentMethod,
        notes,
        recurring,
      } = req.validatedBody;

      const existing = await get("SELECT id FROM transactions WHERE id = ?", [id]);
      if (!existing) return res.status(404).json({ error: "Movimiento no encontrado" });

      await run(
        `
          UPDATE transactions
          SET kind = ?, category = ?, description = ?, amount = ?, date = ?, payment_method = ?, notes = ?, recurring = ?
          WHERE id = ?
        `,
        [
          kind,
          category,
          description,
          amount,
          date,
          paymentMethod || null,
          notes || null,
          recurring ? 1 : 0,
          id,
        ]
      );

      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

app.delete("/api/transactions/:id", validateParamId, async (req, res, next) => {
  try {
    const { id } = req.validatedParams;
    await run("DELETE FROM transactions WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/subscriptions", async (_req, res) => {
  try {
    const rows = await all(
      `
        SELECT
          id,
          name,
          category,
          amount,
          billing_cycle AS billingCycle,
          next_charge_date AS nextChargeDate,
          status,
          payment_method AS paymentMethod,
          notes,
          created_at AS createdAt
        FROM subscriptions
        ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, next_charge_date ASC, id DESC
      `
    );

    return res.json({
      subscriptions: rows.map((row) => ({ ...row })),
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/subscriptions", validateCreateSubscription, async (req, res, next) => {
  try {
    const {
      name,
      category,
      amount,
      billingCycle,
      nextChargeDate,
      status,
      paymentMethod,
      notes,
    } = req.validatedBody;

    await run(
      `
        INSERT INTO subscriptions(name, category, amount, billing_cycle, next_charge_date, status, payment_method, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        category,
        amount,
        billingCycle,
        nextChargeDate,
        status,
        paymentMethod || null,
        notes || null,
        new Date().toISOString(),
      ]
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/subscriptions/:id",
  validateParamId,
  validateUpdateSubscription,
  async (req, res, next) => {
    try {
      const { id } = req.validatedParams;
      const {
        name,
        category,
        amount,
        billingCycle,
        nextChargeDate,
        status,
        paymentMethod,
        notes,
      } = req.validatedBody;

      const existing = await get("SELECT id FROM subscriptions WHERE id = ?", [id]);
      if (!existing) return res.status(404).json({ error: "Suscripción no encontrada" });

      await run(
        `
          UPDATE subscriptions
          SET name = ?, category = ?, amount = ?, billing_cycle = ?, next_charge_date = ?, status = ?, payment_method = ?, notes = ?
          WHERE id = ?
        `,
        [
          name,
          category,
          amount,
          billingCycle,
          nextChargeDate,
          status,
          paymentMethod || null,
          notes || null,
          id,
        ]
      );

      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

app.patch("/api/subscriptions/:id/toggle", validateParamId, async (req, res, next) => {
  try {
    const { id } = req.validatedParams;
    const subscription = await get(
      "SELECT status, billing_cycle, next_charge_date FROM subscriptions WHERE id = ?",
      [id]
    );
    if (!subscription) return res.status(404).json({ error: "Suscripción no encontrada" });

    const nextStatus = subscription.status === "active" ? "paused" : "active";
    const nextChargeDate =
      nextStatus === "active"
        ? addMonths(
            subscription.next_charge_date,
            billingMonths(subscription.billing_cycle)
          )
        : subscription.next_charge_date;

    await run("UPDATE subscriptions SET status = ?, next_charge_date = ? WHERE id = ?", [
      nextStatus,
      nextChargeDate,
      id,
    ]);
    return res.json({ ok: true, status: nextStatus, nextChargeDate });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/subscriptions/:id", validateParamId, async (req, res, next) => {
  try {
    const { id } = req.validatedParams;
    await run("DELETE FROM subscriptions WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/chart/monthly-trend", async (_req, res, next) => {
  try {
    const months = [];
    const data = { labels: [], income: [], expenses: [] };

    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().slice(0, 7);
      months.push(month);
    }

    for (const month of months) {
      const result = await get(
        `
          SELECT
            COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS expenses
          FROM transactions
          WHERE substr(date, 1, 7) = ?
        `,
        [month]
      );

      data.labels.push(month);
      data.income.push(Number(result?.income || 0));
      data.expenses.push(Number(result?.expenses || 0));
    }

    return res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/api/chart/expense-breakdown", validateMonthQuery, async (req, res, next) => {
  try {
    const month = req.validatedQuery.month;
    const rows = await all(
      `
        SELECT
          category,
          COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE substr(date, 1, 7) = ? AND kind = 'expense'
        GROUP BY category
        ORDER BY total DESC
      `,
      [month]
    );

    const data = {
      labels: rows.map((r) => r.category),
      values: rows.map((r) => Number(r.total)),
    };

    return res.json(data);
  } catch (error) {
    next(error);
  }
});

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
