import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "family-finance-secret";

app.use(cors());
app.use(express.json());

// Database Connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Database Initialization
async function initDb() {
  const client = await pool.connect();
  try {
    console.log("Initializing database schema...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          last_login TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          must_change_password BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS personal_incomes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          amount DECIMAL(12,2) NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          description TEXT,
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS personal_expenses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          registered_by INTEGER REFERENCES users(id),
          amount DECIMAL(12,2) NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          description TEXT,
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS joint_expenses (
          id SERIAL PRIMARY KEY,
          amount DECIMAL(12,2) NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          description TEXT,
          date DATE NOT NULL,
          created_by INTEGER REFERENCES users(id),
          last_edited_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wedding_budget (
          id SERIAL PRIMARY KEY,
          total_budget DECIMAL(12,2) NOT NULL,
          budget_currency TEXT DEFAULT 'USD',
          event_date DATE,
          notes TEXT
      );

      CREATE TABLE IF NOT EXISTS wedding_expenses (
          id SERIAL PRIMARY KEY,
          budget_id INTEGER REFERENCES wedding_budget(id),
          category_id INTEGER REFERENCES categories(id),
          description TEXT,
          amount DECIMAL(12,2) NOT NULL,
          date DATE NOT NULL,
          registered_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          action TEXT,
          entity TEXT,
          entity_id INTEGER,
          old_values JSONB,
          new_values JSONB,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const userRes = await client.query("SELECT COUNT(*) FROM users");
    if (parseInt(userRes.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO users (username, password, must_change_password) VALUES ($1, $2, $3), ($4, $5, $6)",
        ["Bryan", hashedPassword, false, "Lyndel", hashedPassword, false]
      );
      console.log("Seeded initial users");
    }

    const catRes = await client.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catRes.rows[0].count) === 0) {
      const categories = [
        ["Salario", "income"],
        ["Venta", "income"],
        ["Independiente", "income"],
        ["Alimentación", "expense"],
        ["Transporte", "expense"],
        ["Renta", "expense"],
        ["Suscripción", "expense"],
        ["Ocio", "expense"],
        ["Internet", "expense"],
        ["Electricidad", "expense"],
        ["Boda - Salón", "wedding"],
        ["Boda - Vestido", "wedding"],
        ["Boda - Decoración", "wedding"],
      ];
      for (const [name, type] of categories) {
        await client.query("INSERT INTO categories (name, type) VALUES ($1, $2)", [name, type]);
      }
      console.log("Seeded initial categories");
    }

    const budgetRes = await client.query("SELECT COUNT(*) FROM wedding_budget");
    if (parseInt(budgetRes.rows[0].count) === 0) {
      await client.query("INSERT INTO wedding_budget (total_budget, budget_currency) VALUES ($1, $2)", [10000, "USD"]);
      console.log("Seeded initial wedding budget");
    }

    console.log("Database initialization complete.");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    client.release();
  }
}

async function logAudit(userId: number, action: string, entity: string, entityId: number | null, oldValues: any, newValues: any, req: any) {
  try {
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [userId, action, entity, entityId, oldValues, newValues, req.ip, req.get("user-agent")]
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ========== API ROUTES ==========

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is working" });
});

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1 AND is_active = TRUE", [username]);
    const user = result.rows[0];
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
      await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);
      await logAudit(user.id, "LOGIN", "users", user.id, null, { username: user.username }, req);
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Dashboard Stats
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const incomes = await pool.query("SELECT SUM(amount) FROM personal_incomes");
    const pExpenses = await pool.query("SELECT SUM(amount) FROM personal_expenses");
    const jExpenses = await pool.query("SELECT SUM(amount) FROM joint_expenses WHERE deleted_at IS NULL");
    const wExpenses = await pool.query("SELECT SUM(amount) FROM wedding_expenses");
    const budget = await pool.query("SELECT total_budget FROM wedding_budget LIMIT 1");

    const totalIncome = parseFloat(incomes.rows[0].sum || 0);
    const totalPersonalExpense = parseFloat(pExpenses.rows[0].sum || 0);
    const totalJointExpense = parseFloat(jExpenses.rows[0].sum || 0);
    const totalWeddingExpense = parseFloat(wExpenses.rows[0].sum || 0);
    const weddingBudget = parseFloat(budget.rows[0]?.total_budget || 0);

    res.json({
      totalIncome,
      totalExpense: totalPersonalExpense + totalJointExpense,
      balance: totalIncome - (totalPersonalExpense + totalJointExpense),
      wedding: {
        budget: weddingBudget,
        spent: totalWeddingExpense,
        remaining: weddingBudget - totalWeddingExpense,
        percent: weddingBudget > 0 ? (totalWeddingExpense / weddingBudget) * 100 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// Categories
app.get("/api/categories", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

// Personal Incomes
app.get("/api/personal/incomes", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, c.name as category_name, u.username 
      FROM personal_incomes i 
      JOIN categories c ON i.category_id = c.id 
      JOIN users u ON i.user_id = u.id 
      ORDER BY i.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ingresos" });
  }
});

app.post("/api/personal/incomes", authenticateToken, async (req: any, res) => {
  const { amount, category_id, description, date } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO personal_incomes (user_id, amount, category_id, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.id, amount, category_id, description, date]
    );
    await logAudit(req.user.id, "CREATE", "personal_incomes", result.rows[0].id, null, result.rows[0], req);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear ingreso" });
  }
});

// Personal Expenses
app.get("/api/personal/expenses", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, c.name as category_name, u.username 
      FROM personal_expenses e 
      JOIN categories c ON e.category_id = c.id 
      JOIN users u ON e.user_id = u.id 
      ORDER BY e.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});

app.post("/api/personal/expenses", authenticateToken, async (req: any, res) => {
  const { amount, category_id, description, date, user_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO personal_expenses (user_id, registered_by, amount, category_id, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user_id || req.user.id, req.user.id, amount, category_id, description, date]
    );
    await logAudit(req.user.id, "CREATE", "personal_expenses", result.rows[0].id, null, result.rows[0], req);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear gasto" });
  }
});

// Joint Expenses
app.get("/api/joint/expenses", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, c.name as category_name, u.username as creator_name 
      FROM joint_expenses e 
      JOIN categories c ON e.category_id = c.id 
      JOIN users u ON e.created_by = u.id 
      WHERE e.deleted_at IS NULL 
      ORDER BY e.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener gastos conjuntos" });
  }
});

app.post("/api/joint/expenses", authenticateToken, async (req: any, res) => {
  const { amount, category_id, description, date } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO joint_expenses (amount, category_id, description, date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [amount, category_id, description, date, req.user.id]
    );
    await logAudit(req.user.id, "CREATE", "joint_expenses", result.rows[0].id, null, result.rows[0], req);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear gasto conjunto" });
  }
});

// Wedding Budget & Expenses
app.get("/api/wedding/budget", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM wedding_budget LIMIT 1");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener presupuesto" });
  }
});

app.post("/api/wedding/budget", authenticateToken, async (req: any, res) => {
  const { total_budget, budget_currency, event_date, notes } = req.body;
  try {
    const old = await pool.query("SELECT * FROM wedding_budget LIMIT 1");
    const result = await pool.query(
      "UPDATE wedding_budget SET total_budget = $1, budget_currency = $2, event_date = $3, notes = $4 WHERE id = (SELECT id FROM wedding_budget LIMIT 1) RETURNING *",
      [total_budget, budget_currency, event_date, notes]
    );
    await logAudit(req.user.id, "UPDATE", "wedding_budget", result.rows[0].id, old.rows[0], result.rows[0], req);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar presupuesto" });
  }
});

app.get("/api/wedding/expenses", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, c.name as category_name, u.username 
      FROM wedding_expenses e 
      JOIN categories c ON e.category_id = c.id 
      JOIN users u ON e.registered_by = u.id 
      ORDER BY e.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener gastos de boda" });
  }
});

app.post("/api/wedding/expenses", authenticateToken, async (req: any, res) => {
  const { amount, category_id, description, date } = req.body;
  try {
    const budget = await pool.query("SELECT id FROM wedding_budget LIMIT 1");
    const result = await pool.query(
      "INSERT INTO wedding_expenses (budget_id, category_id, description, amount, date, registered_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [budget.rows[0].id, category_id, description, amount, date, req.user.id]
    );
    await logAudit(req.user.id, "CREATE", "wedding_expenses", result.rows[0].id, null, result.rows[0], req);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al crear gasto de boda" });
  }
});

// Audit Logs
app.get("/api/audit", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.username 
      FROM audit_logs a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener auditoría" });
  }
});

// Inicializar la base de datos
await initDb();

// Exportar para Vercel
export default app;