import fs from "fs";
import sqlite3Module from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const configuredDbPath = process.env.DATABASE_PATH;
const dbPath = configuredDbPath
  ? path.isAbsolute(configuredDbPath)
    ? configuredDbPath
    : path.join(projectRoot, configuredDbPath)
  : path.join(projectRoot, "finance.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite3 = sqlite3Module.verbose();
const db = new sqlite3.Database(dbPath);

/**
 * Clase para manejar la base de datos
 */
class Database {
  /**
   * Ejecuta una query INSERT, UPDATE o DELETE
   */
  static run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function onResult(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  /**
   * Obtiene múltiples filas
   */
  static all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Obtiene una sola fila
   */
  static get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Inicializa las tablas de la base de datos
   */
  static async initializeTables() {
    await Database.run(`
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

    await Database.run(`
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

    await Database.run(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date_kind
      ON transactions(date, kind)
    `);

    await Database.run(`
      CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(category)
    `);

    await Database.run(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status_next_charge_date
      ON subscriptions(status, next_charge_date)
    `);
  }

  /**
   * Verifica que la base de datos responda correctamente
   */
  static async healthCheck() {
    const row = await Database.get("SELECT 1 AS ok");
    return {
      ok: row?.ok === 1,
    };
  }
}

// Exportaciones nombradas para los repositorios
export const run = Database.run;
export const all = Database.all;
export const get = Database.get;
export const healthCheck = Database.healthCheck;

export default Database;
