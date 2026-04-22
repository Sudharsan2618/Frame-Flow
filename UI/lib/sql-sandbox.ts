/**
 * SQL Sandbox — Browser-based SQLite via WebAssembly (sql.js)
 * Same technology W3Schools uses for their "Try it yourself" SQL editor.
 * Runs entirely in the browser. Zero backend calls.
 */

import initSqlJs from "sql.js";
import type { Database } from "sql.js";

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

const SEED_SQL = `
-- ============================================
-- SQL PRACTICE DATABASE
-- For SQL Masterclass Course
-- ============================================

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
  department_id INTEGER PRIMARY KEY,
  department_name TEXT NOT NULL,
  location TEXT NOT NULL,
  budget REAL DEFAULT 0
);

INSERT INTO departments VALUES (1, 'Engineering', 'Chennai', 500000);
INSERT INTO departments VALUES (2, 'Marketing', 'Mumbai', 300000);
INSERT INTO departments VALUES (3, 'Sales', 'Bangalore', 400000);
INSERT INTO departments VALUES (4, 'HR', 'Chennai', 200000);
INSERT INTO departments VALUES (5, 'Finance', 'Delhi', 350000);
INSERT INTO departments VALUES (6, 'Operations', 'Hyderabad', 280000);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
  employee_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  hire_date TEXT NOT NULL,
  salary REAL NOT NULL,
  department_id INTEGER,
  manager_id INTEGER,
  FOREIGN KEY (department_id) REFERENCES departments(department_id),
  FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

INSERT INTO employees VALUES (1, 'Rajesh', 'Kumar', 'rajesh@company.com', '2020-01-15', 85000, 1, NULL);
INSERT INTO employees VALUES (2, 'Priya', 'Sharma', 'priya@company.com', '2020-03-20', 72000, 1, 1);
INSERT INTO employees VALUES (3, 'Amit', 'Patel', 'amit@company.com', '2021-06-01', 65000, 2, NULL);
INSERT INTO employees VALUES (4, 'Sneha', 'Reddy', 'sneha@company.com', '2019-11-10', 90000, 1, 1);
INSERT INTO employees VALUES (5, 'Mohammed', 'Ali', 'mohammed@company.com', '2022-02-28', 55000, 3, NULL);
INSERT INTO employees VALUES (6, 'Kavitha', 'Nair', 'kavitha@company.com', '2021-08-15', 68000, 4, NULL);
INSERT INTO employees VALUES (7, 'Suresh', 'Menon', 'suresh@company.com', '2020-05-22', 78000, 5, NULL);
INSERT INTO employees VALUES (8, 'Deepa', 'Iyer', 'deepa@company.com', '2023-01-10', 52000, 2, 3);
INSERT INTO employees VALUES (9, 'Arjun', 'Singh', 'arjun@company.com', '2022-09-05', 61000, 3, 5);
INSERT INTO employees VALUES (10, 'Lakshmi', 'Rao', 'lakshmi@company.com', '2021-04-18', 73000, 1, 1);
INSERT INTO employees VALUES (11, 'Vikram', 'Joshi', 'vikram@company.com', '2023-07-01', 48000, 6, NULL);
INSERT INTO employees VALUES (12, 'Ananya', 'Gupta', 'ananya@company.com', '2020-12-03', 82000, 5, 7);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  supplier TEXT
);

INSERT INTO products VALUES (1, 'Laptop Pro', 'Electronics', 75000, 50, 'TechCorp');
INSERT INTO products VALUES (2, 'Wireless Mouse', 'Accessories', 1500, 200, 'GadgetWorld');
INSERT INTO products VALUES (3, 'Standing Desk', 'Furniture', 25000, 30, 'OfficeMart');
INSERT INTO products VALUES (4, 'Monitor 27"', 'Electronics', 32000, 80, 'TechCorp');
INSERT INTO products VALUES (5, 'Keyboard Mech', 'Accessories', 5000, 150, 'GadgetWorld');
INSERT INTO products VALUES (6, 'Office Chair', 'Furniture', 18000, 45, 'OfficeMart');
INSERT INTO products VALUES (7, 'Webcam HD', 'Accessories', 3500, 100, 'TechCorp');
INSERT INTO products VALUES (8, 'USB Hub', 'Accessories', 2000, 300, 'GadgetWorld');

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  order_id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  product_id INTEGER,
  quantity INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  total_amount REAL,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

INSERT INTO orders VALUES (1, 'Acme Corp', 1, 5, '2024-01-15', 375000, 'delivered');
INSERT INTO orders VALUES (2, 'Beta Inc', 2, 20, '2024-01-20', 30000, 'delivered');
INSERT INTO orders VALUES (3, 'Gamma LLC', 3, 10, '2024-02-01', 250000, 'shipped');
INSERT INTO orders VALUES (4, 'Delta Co', 4, 15, '2024-02-10', 480000, 'delivered');
INSERT INTO orders VALUES (5, 'Acme Corp', 5, 25, '2024-02-15', 125000, 'processing');
INSERT INTO orders VALUES (6, 'Beta Inc', 6, 8, '2024-03-01', 144000, 'shipped');
INSERT INTO orders VALUES (7, 'Epsilon Ltd', 1, 3, '2024-03-10', 225000, 'pending');
INSERT INTO orders VALUES (8, 'Gamma LLC', 7, 50, '2024-03-15', 175000, 'delivered');
INSERT INTO orders VALUES (9, 'Delta Co', 2, 100, '2024-04-01', 150000, 'processing');
INSERT INTO orders VALUES (10, 'Acme Corp', 8, 30, '2024-04-10', 60000, 'delivered');
`;

export interface SqlResult {
  columns: string[];
  values: (string | number | null)[][];
}

export interface SqlExecutionResult {
  success: boolean;
  results: SqlResult[];
  error?: string;
  executionTimeMs: number;
  rowsAffected?: number;
}

/**
 * Initialize the SQL.js database with sample data.
 * Uses CDN-hosted WASM for reliability.
 */
export async function initSqlSandbox(): Promise<Database> {
  if (db) return db;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => `/sql-wasm.wasm`,
    });

    db = new SQL.Database();
    db.run(SEED_SQL);
    return db;
  })();

  return initPromise;
}

/**
 * Execute a SQL query against the in-browser SQLite database.
 */
export async function executeSql(query: string): Promise<SqlExecutionResult> {
  const start = performance.now();

  try {
    const database = await initSqlSandbox();
    const trimmed = query.trim();

    if (!trimmed) {
      return {
        success: false,
        results: [],
        error: "Please enter a SQL query.",
        executionTimeMs: 0,
      };
    }

    const results = database.exec(trimmed);
    const elapsed = performance.now() - start;

    // For non-SELECT statements (INSERT, UPDATE, CREATE, etc.)
    if (results.length === 0) {
      const changes = database.getRowsModified();
      return {
        success: true,
        results: [],
        executionTimeMs: Math.round(elapsed * 100) / 100,
        rowsAffected: changes,
      };
    }

    return {
      success: true,
      results: results.map((r: { columns: string[]; values: any[][] }) => ({
        columns: r.columns,
        values: r.values as (string | number | null)[][],
      })),
      executionTimeMs: Math.round(elapsed * 100) / 100,
    };
  } catch (err: any) {
    const elapsed = performance.now() - start;
    return {
      success: false,
      results: [],
      error: err.message || "SQL execution error",
      executionTimeMs: Math.round(elapsed * 100) / 100,
    };
  }
}

/**
 * Reset the database — drops all tables and re-seeds.
 */
export async function resetSqlSandbox(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    initPromise = null;
  }
  await initSqlSandbox();
}

/**
 * Get list of available tables in the sandbox.
 */
export async function getAvailableTables(): Promise<string[]> {
  const database = await initSqlSandbox();
  const result = database.exec(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );
  if (result.length === 0) return [];
  return result[0].values.map((row: any[]) => row[0] as string);
}
