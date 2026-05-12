const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "finance.db");
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

app.use(express.json());
app.use(express.static(__dirname, { index: false }));

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

app.get("/api/dashboard", async (req, res) => {
  try {
    const month = asMonth(req.query.month);
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
    return res.status(400).json({ error: error.message });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const month = asMonth(req.query.month);
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
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const kind = req.body.kind === "income" ? "income" : "expense";
    const category = String(req.body.category || "").trim();
    const description = String(req.body.description || "").trim();
    const amount = parseAmount(req.body.amount);
    const date = parseDate(req.body.date);
    const paymentMethod = String(req.body.paymentMethod || "").trim();
    const notes = String(req.body.notes || "").trim();
    const recurring = req.body.recurring ? 1 : 0;

    if (!category) return res.status(400).json({ error: "La categoría es obligatoria" });
    if (!description) return res.status(400).json({ error: "La descripción es obligatoria" });

    await run(
      `
        INSERT INTO transactions(kind, category, description, amount, date, payment_method, notes, recurring, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [kind, category, description, amount, date, paymentMethod || null, notes || null, recurring, new Date().toISOString()]
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch("/api/transactions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const kind = req.body.kind === "income" ? "income" : "expense";
    const category = String(req.body.category || "").trim();
    const description = String(req.body.description || "").trim();
    const amount = parseAmount(req.body.amount);
    const date = parseDate(req.body.date);
    const paymentMethod = String(req.body.paymentMethod || "").trim();
    const notes = String(req.body.notes || "").trim();
    const recurring = req.body.recurring ? 1 : 0;

    if (!category) return res.status(400).json({ error: "La categoría es obligatoria" });
    if (!description) return res.status(400).json({ error: "La descripción es obligatoria" });

    const existing = await get("SELECT id FROM transactions WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Movimiento no encontrado" });

    await run(
      `
        UPDATE transactions
        SET kind = ?, category = ?, description = ?, amount = ?, date = ?, payment_method = ?, notes = ?, recurring = ?
        WHERE id = ?
      `,
      [kind, category, description, amount, date, paymentMethod || null, notes || null, recurring, id]
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    await run("DELETE FROM transactions WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
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

app.post("/api/subscriptions", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const amount = parseAmount(req.body.amount);
    const billingCycle = ["monthly", "quarterly", "annual"].includes(req.body.billingCycle)
      ? req.body.billingCycle
      : "monthly";
    const nextChargeDate = parseDate(req.body.nextChargeDate);
    const status = req.body.status === "paused" ? "paused" : "active";
    const paymentMethod = String(req.body.paymentMethod || "").trim();
    const notes = String(req.body.notes || "").trim();

    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    if (!category) return res.status(400).json({ error: "La categoría es obligatoria" });

    await run(
      `
        INSERT INTO subscriptions(name, category, amount, billing_cycle, next_charge_date, status, payment_method, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [name, category, amount, billingCycle, nextChargeDate, status, paymentMethod || null, notes || null, new Date().toISOString()]
    );

    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch("/api/subscriptions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const amount = parseAmount(req.body.amount);
    const billingCycle = ["monthly", "quarterly", "annual"].includes(req.body.billingCycle)
      ? req.body.billingCycle
      : "monthly";
    const nextChargeDate = parseDate(req.body.nextChargeDate);
    const status = req.body.status === "paused" ? "paused" : "active";
    const paymentMethod = String(req.body.paymentMethod || "").trim();
    const notes = String(req.body.notes || "").trim();

    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    if (!category) return res.status(400).json({ error: "La categoría es obligatoria" });

    const existing = await get("SELECT id FROM subscriptions WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Suscripción no encontrada" });

    await run(
      `
        UPDATE subscriptions
        SET name = ?, category = ?, amount = ?, billing_cycle = ?, next_charge_date = ?, status = ?, payment_method = ?, notes = ?
        WHERE id = ?
      `,
      [name, category, amount, billingCycle, nextChargeDate, status, paymentMethod || null, notes || null, id]
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch("/api/subscriptions/:id/toggle", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const subscription = await get("SELECT status, billing_cycle, next_charge_date FROM subscriptions WHERE id = ?", [id]);
    if (!subscription) return res.status(404).json({ error: "Suscripción no encontrada" });

    const nextStatus = subscription.status === "active" ? "paused" : "active";
    const nextChargeDate = nextStatus === "active"
      ? addMonths(subscription.next_charge_date, billingMonths(subscription.billing_cycle))
      : subscription.next_charge_date;

    await run("UPDATE subscriptions SET status = ?, next_charge_date = ? WHERE id = ?", [nextStatus, nextChargeDate, id]);
    return res.json({ ok: true, status: nextStatus, nextChargeDate });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/api/subscriptions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    await run("DELETE FROM subscriptions WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "finance-index.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "finance-index.html"));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Control de Finanzas disponible en http://localhost:${port}`);
});
