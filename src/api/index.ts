import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "family-finance-secret";

app.use(cors());
app.use(express.json());

// Database Connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Auth Middleware
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

// Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1 AND is_active = TRUE", [username]);
    const user = result.rows[0];
    
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is working" });
});

// Dashboard Stats
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const incomes = await pool.query("SELECT SUM(amount) FROM personal_incomes");
    const pExpenses = await pool.query("SELECT SUM(amount) FROM personal_expenses");
    const jExpenses = await pool.query("SELECT SUM(amount) FROM joint_expenses WHERE deleted_at IS NULL");
    const wExpenses = await pool.query("SELECT SUM(amount) FROM wedding_expenses");
    const budget = await pool.query("SELECT total_budget FROM wedding_budget LIMIT 1");

    res.json({
      totalIncome: parseFloat(incomes.rows[0].sum || 0),
      totalExpense: parseFloat(pExpenses.rows[0].sum || 0) + parseFloat(jExpenses.rows[0].sum || 0),
      balance: parseFloat(incomes.rows[0].sum || 0) - (parseFloat(pExpenses.rows[0].sum || 0) + parseFloat(jExpenses.rows[0].sum || 0)),
      wedding: {
        budget: parseFloat(budget.rows[0]?.total_budget || 0),
        spent: parseFloat(wExpenses.rows[0].sum || 0),
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
    const result = await pool.query(
      "UPDATE wedding_budget SET total_budget = $1, budget_currency = $2, event_date = $3, notes = $4 WHERE id = (SELECT id FROM wedding_budget LIMIT 1) RETURNING *",
      [total_budget, budget_currency, event_date, notes]
    );
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

export default app;