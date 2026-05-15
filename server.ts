import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import pool, { dbInit } from "./src/server/db.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "terratrack-secret-key-2026";

app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // For development with Vite
}));
app.use(express.json());

// Initialize Database
dbInit();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [email, hashedPassword, name, role || 'reception']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- LAND ROUTES ---
app.get("/api/lands", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM lands ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/lands", authenticateToken, async (req, res) => {
  const { plot_number, location, size, acquisition_type, status, total_cost } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO lands (plot_number, location, size, acquisition_type, status, total_cost) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [plot_number, location, size, acquisition_type, status, total_cost]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- CUSTOMER ROUTES ---
app.get("/api/customers", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customers ORDER BY name ASC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", authenticateToken, async (req, res) => {
  const { name, email, phone, id_number } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO customers (name, email, phone, id_number) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, phone, id_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- SALES & PAYMENTS ---
app.post("/api/sales", authenticateToken, async (req, res) => {
  const { land_id, customer_id, total_price, paid_amount } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const saleResult = await client.query(
      "INSERT INTO sales (land_id, customer_id, total_price, paid_amount) VALUES ($1, $2, $3, $4) RETURNING *",
      [land_id, customer_id, total_price, paid_amount]
    );
    const sale = saleResult.rows[0];
    
    // Update land status
    await client.query(
      "UPDATE lands SET status = 'sold', customer_id = $1, paid_amount = $2 WHERE id = $3",
      [customer_id, paid_amount, land_id]
    );

    // Record payment
    if (paid_amount > 0) {
      await client.query(
        "INSERT INTO payments (type, amount, category, description, reference_id, reference_type, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ['received', paid_amount, 'land_sale', `Sale of plot ${land_id}`, sale.id, 'sale', (req as any).user.id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(sale);
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- DASHBOARD STATS ---
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const lands = await pool.query("SELECT COUNT(*) as total, SUM(total_cost) - SUM(paid_amount) as total_debt FROM lands");
    const sales = await pool.query("SELECT COUNT(*) as total, SUM(total_price) as revenue, SUM(paid_amount) as received FROM sales");
    const expenses = await pool.query("SELECT SUM(amount) as total FROM expenses");
    
    res.json({
      landCount: parseInt(lands.rows[0].total),
      landDebt: parseFloat(lands.rows[0].total_debt || 0),
      salesCount: parseInt(sales.rows[0].total),
      revenue: parseFloat(sales.rows[0].revenue || 0),
      received: parseFloat(sales.rows[0].received || 0),
      expenses: parseFloat(expenses.rows[0].total || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
