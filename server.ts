import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import pool, { dbInit } from "./src/server/db.ts";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import multer from "multer";
import { parseExcel } from "./src/lib/csvParser.js";

dotenv.config();

await dbInit();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "terratrack-secret-key-2026";

const app = express();
app.use(cors());
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), "public")));
app.use(helmet({
  contentSecurityPolicy: false, // For development with Vite
}));
app.use(express.json({ limit: '10mb' }));

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

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * Recalculates and syncs a sale's paid_amount from all approved payments,
 * then updates the associated land's status accordingly.
 */
async function syncSalePaymentTotals(conn: any, saleId: number) {
  const [totalPaidRes] = await conn.query(
    "SELECT SUM(amount) as total FROM payments WHERE reference_id = ? AND reference_type = 'sale' AND is_approved = TRUE",
    [saleId]
  );
  const totalPaid = parseFloat((totalPaidRes as any[])[0]?.total || 0);
  await conn.query("UPDATE sales SET paid_amount = ? WHERE id = ?", [totalPaid, saleId]);
  const [saleRows] = await conn.query("SELECT land_id, total_price FROM sales WHERE id = ?", [saleId]);
  if ((saleRows as any[]).length > 0) {
    const { land_id, total_price } = (saleRows as any[])[0];
    const plotStatus = totalPaid >= parseFloat(total_price) ? 'sold' : 'reserved';
    await conn.query(
      "UPDATE lands SET paid_amount = ?, status = ? WHERE id = ?",
      [totalPaid, plotStatus, land_id]
    );
  }
}

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [, metadata] = await pool.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, name, role || 'reception']
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT id, email, name, role FROM users WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if ((rows as any[]).length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = (rows as any[])[0];
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

// --- LAND & PROPERTY ROUTES ---
app.get("/api/properties", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM parent_properties ORDER BY created_at DESC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/properties", authenticateToken, async (req, res) => {
  const { name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes } = req.body;
  try {
    const [, metadata] = await pool.query(
      "INSERT INTO parent_properties (name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name ?? '', 
        location ?? '', 
        total_size ?? '', 
        ownership_status ?? 'partial', 
        buying_price ?? 0, 
        amount_paid_to_seller ?? 0, 
        notes ?? null
      ]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM parent_properties WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/properties/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes } = req.body;
  try {
    const [, metadata] = await pool.query(
      `UPDATE parent_properties
       SET name = ?, location = ?, total_size = ?, ownership_status = ?, buying_price = ?, amount_paid_to_seller = ?, notes = ?
       WHERE id = ?`,
      [name, location, total_size, ownership_status || 'partial', buying_price || 0, amount_paid_to_seller || 0, notes || null, id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Property not found" });
    const [rows] = await pool.query("SELECT * FROM parent_properties WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/properties/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [linkedPlots] = await pool.query("SELECT COUNT(*) AS count FROM lands WHERE parent_property_id = ?", [id]);
    const [linkedCosts] = await pool.query("SELECT COUNT(*) AS count FROM property_costs WHERE parent_property_id = ?", [id]);
    if ((linkedPlots as any[])[0].count > 0 || (linkedCosts as any[])[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete property with linked plots or costs. Remove those records first." });
    }
    const [result] = await pool.query("DELETE FROM parent_properties WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Property not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/lands", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, p.name as parent_name 
      FROM lands l 
      LEFT JOIN parent_properties p ON l.parent_property_id = p.id 
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/lands", authenticateToken, async (req, res) => {
  const { parent_property_id, plot_number, location, size, acquisition_type, status, total_cost, title_deed_status, title_deed_url } = req.body;
  try {
    const [, metadata] = await pool.query(
      "INSERT INTO lands (parent_property_id, plot_number, location, size, acquisition_type, status, total_cost, title_deed_status, title_deed_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        parent_property_id ? parseInt(parent_property_id) : null,
        plot_number ?? '',
        location ?? '',
        size ?? '',
        acquisition_type ?? 'purchase',
        status ?? 'available',
        total_cost ?? 0,
        title_deed_status ?? 'pending',
        title_deed_url ?? null
      ]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM lands WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/lands/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { parent_property_id, plot_number, location, size, acquisition_type, total_cost, title_deed_status, title_deed_url, status } = req.body;
  try {
    const [, metadata] = await pool.query(
      `UPDATE lands
       SET parent_property_id = ?, plot_number = ?, location = ?, size = ?, acquisition_type = ?, total_cost = ?,
           title_deed_status = ?, title_deed_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [parent_property_id ? parseInt(parent_property_id) : null, plot_number, location, size, acquisition_type || 'purchase', total_cost || 0, title_deed_status || 'pending', title_deed_url || null, status || 'available', id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Plot not found" });
    const [rows] = await pool.query("SELECT * FROM lands WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/lands/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [linkedSales] = await pool.query("SELECT COUNT(*) AS count FROM sales WHERE land_id = ?", [id]);
    const [linkedCosts] = await pool.query("SELECT COUNT(*) AS count FROM property_costs WHERE land_id = ?", [id]);
    if ((linkedSales as any[])[0].count > 0 || (linkedCosts as any[])[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete plot with linked sales or costs. Remove those records first." });
    }
    const [result] = await pool.query("DELETE FROM lands WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Plot not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- INVENTORY ROUTES ---
app.get("/api/inventory", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM inventory ORDER BY item_name ASC`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventory", authenticateToken, requireAdmin, async (req, res) => {
  const { item_name, quantity, unit_price, category } = req.body;
  try {
    const [, metadata] = await pool.query(
      "INSERT INTO inventory (item_name, quantity, unit_price, category) VALUES (?, ?, ?, ?)",
      [item_name, quantity, unit_price, category]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM inventory WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/inventory/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { item_name, quantity, unit_price, category } = req.body;
  try {
    await pool.query(
      `UPDATE inventory SET item_name = ?, quantity = ?, unit_price = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [item_name, quantity, unit_price, category, id]
    );
    const [rows] = await pool.query("SELECT * FROM inventory WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/inventory/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM inventory WHERE id = ?`, [id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- CUSTOMER ROUTES ---
app.get("/api/customers", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM customers ORDER BY name ASC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", authenticateToken, async (req, res) => {
  const { name, email, phone, id_number } = req.body;
  try {
    const [, metadata] = await pool.query(
      "INSERT INTO customers (name, email, phone, id_number) VALUES (?, ?, ?, ?)",
      [name, email, phone, id_number]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM customers WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/customers/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, id_number } = req.body;
  try {
    const [, metadata] = await pool.query(
      "UPDATE customers SET name = ?, email = ?, phone = ?, id_number = ? WHERE id = ?",
      [name, email || null, phone, id_number, id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Customer not found" });
    const [rows] = await pool.query("SELECT * FROM customers WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [linkedSales] = await pool.query("SELECT COUNT(*) AS count FROM sales WHERE customer_id = ?", [id]);
    const [linkedDocs] = await pool.query("SELECT COUNT(*) AS count FROM documents WHERE customer_id = ?", [id]);
    if ((linkedSales as any[])[0].count > 0 || (linkedDocs as any[])[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete customer with linked sales or documents." });
    }
    const [result] = await pool.query("DELETE FROM customers WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Customer not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- SALES & PAYMENTS ---
app.get("/api/sales", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.id_number as customer_id_number,
             l.plot_number, l.location, l.size, p.name as parent_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN lands l ON s.land_id = l.id
      LEFT JOIN parent_properties p ON l.parent_property_id = p.id
      ORDER BY s.date DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sales/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [saleRows] = await pool.query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.id_number as customer_id_number,
             l.plot_number, l.location, l.size, p.name as parent_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN lands l ON s.land_id = l.id
      LEFT JOIN parent_properties p ON l.parent_property_id = p.id
      WHERE s.id = ?
    `, [id]);

    if ((saleRows as any[]).length === 0) {
      return res.status(404).json({ error: "Sale record not found" });
    }

    const [paymentRows] = await pool.query(`
      SELECT p.*, r.receipt_number, r.status as receipt_status
      FROM payments p
      LEFT JOIN receipts r ON r.payment_id = p.id
      WHERE p.reference_id = ? AND p.reference_type = 'sale'
      ORDER BY p.date DESC
    `, [id]);

    res.json({
      sale: (saleRows as any[])[0],
      payments: paymentRows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales", authenticateToken, async (req, res) => {
  const { land_id, customer_id, total_price, paid_amount, method, transaction_ref } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [saleResult] = await conn.query(
      "INSERT INTO sales (land_id, customer_id, total_price, paid_amount, is_approved) VALUES (?, ?, ?, ?, FALSE)",
      [land_id, customer_id, total_price, 0]
    );
    const saleId = (saleResult as any).insertId;
    const [saleRows] = await conn.query("SELECT * FROM sales WHERE id = ?", [saleId]);
    const sale = (saleRows as any[])[0];

    await conn.query(
      "UPDATE lands SET status = 'reserved', customer_id = ? WHERE id = ?",
      [customer_id, land_id]
    );

    if (paid_amount > 0) {
      const [paymentResult] = await conn.query(
        "INSERT INTO payments (type, amount, method, category, description, reference_id, reference_type, transaction_ref, created_by, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
        ['received', paid_amount, method || 'cash', 'land_sale', `Deposit for plot ${land_id}`, saleId, 'sale', transaction_ref, (req as any).user.id]
      );
      const paymentId = (paymentResult as any).insertId;
      const receiptNum = `RCP-${Date.now()}`;
      await conn.query(
        "INSERT INTO receipts (receipt_number, payment_id, status) VALUES (?, ?, ?)",
        [receiptNum, paymentId, 'pending']
      );
    }

    await conn.commit();
    res.status(201).json(sale);
  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.put("/api/sales/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { land_id, customer_id, total_price, paid_amount, is_approved } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query("SELECT land_id FROM sales WHERE id = ?", [id]);
    if ((existing as any[]).length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Sale not found" });
    }
    await conn.query(
      `UPDATE sales SET land_id = ?, customer_id = ?, total_price = ?, paid_amount = ?, is_approved = ? WHERE id = ?`,
      [land_id, customer_id, total_price || 0, paid_amount || 0, !!is_approved, id]
    );
    if (Number((existing as any[])[0].land_id) !== Number(land_id)) {
      await conn.query("UPDATE lands SET status = 'available', customer_id = NULL, paid_amount = 0 WHERE id = ?", [(existing as any[])[0].land_id]);
    }
    const status = parseFloat(paid_amount || 0) >= parseFloat(total_price || 0) ? 'sold' : 'reserved';
    await conn.query("UPDATE lands SET status = ?, customer_id = ?, paid_amount = ? WHERE id = ?", [status, customer_id, paid_amount || 0, land_id]);
    await conn.commit();
    const [rows] = await conn.query("SELECT * FROM sales WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete("/api/sales/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query("SELECT land_id FROM sales WHERE id = ?", [id]);
    if ((existing as any[]).length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Sale not found" });
    }
    const [linkedPayments] = await conn.query("SELECT COUNT(*) AS count FROM payments WHERE reference_id = ? AND reference_type = 'sale'", [id]);
    if ((linkedPayments as any[])[0].count > 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Cannot delete sale with linked payments. Delete the payments first." });
    }
    await conn.query("DELETE FROM sales WHERE id = ?", [id]);
    await conn.query("UPDATE lands SET status = 'available', customer_id = NULL, paid_amount = 0 WHERE id = ?", [(existing as any[])[0].land_id]);
    await conn.commit();
    res.status(204).send();
  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// --- RECORD NEW PAYMENT (INSTALLMENT) ---
app.post("/api/payments", authenticateToken, async (req, res) => {
  const { type, amount, method, category, description, reference_id, reference_type, transaction_ref } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO payments (type, amount, method, category, description, reference_id, reference_type, transaction_ref, created_by, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [type || 'received', amount, method || 'cash', category || 'plot_installment', description, reference_id, reference_type, transaction_ref, (req as any).user.id]
    );
    const paymentId = (result as any).insertId;
    const [rows] = await pool.query("SELECT * FROM payments WHERE id = ?", [paymentId]);
    const payment = (rows as any[])[0];

    if (type === 'received' || reference_type === 'sale') {
      const receiptNum = `RCP-${Date.now()}`;
      await pool.query(
        "INSERT INTO receipts (receipt_number, payment_id, status) VALUES (?, ?, ?)",
        [receiptNum, paymentId, 'pending']
      );
    }

    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { type, amount, method, category, description, reference_id, reference_type, transaction_ref, is_approved } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE payments
       SET type = ?, amount = ?, method = ?, category = ?, description = ?, reference_id = ?,
           reference_type = ?, transaction_ref = ?, is_approved = ?
       WHERE id = ?`,
      [type || 'received', amount || 0, method || 'cash', category || 'plot_installment', description || null, reference_id || null, reference_type || null, transaction_ref || null, !!is_approved, id]
    );
    if ((result as any).affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Payment not found" });
    }
    const [rows] = await conn.query("SELECT * FROM payments WHERE id = ?", [id]);
    const payment = (rows as any[])[0];
    if (payment.reference_type === 'sale' && payment.reference_id) {
      await syncSalePaymentTotals(conn, payment.reference_id);
    }
    await conn.commit();
    res.json(payment);
  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query("SELECT * FROM payments WHERE id = ?", [id]);
    if ((existing as any[]).length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Payment not found" });
    }
    await conn.query("DELETE FROM receipts WHERE payment_id = ?", [id]);
    await conn.query("DELETE FROM payments WHERE id = ?", [id]);
    const payment = (existing as any[])[0];
    if (payment.reference_type === 'sale' && payment.reference_id) {
      await syncSalePaymentTotals(conn, payment.reference_id);
    }
    await conn.commit();
    res.status(204).send();
  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

/* Receipt upload endpoint */
app.post("/api/receipts", authenticateToken, async (req, res) => {
  const multerLib = require('multer');
  const storage = multerLib.memoryStorage();
  const upload = multerLib({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
  upload.fields([
    { name: "documents", maxCount: 5 }
  ])(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const { customerId, receiptData } = req.body;
    if (!customerId || !receiptData) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const files = ((req as any).files && (req as any).files.documents) || [];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const file of files) {
        const typeMap: any = {
          "saleAgreement": "saleAgreement",
          "idDocument": "idDocument",
          "kraCert": "kraCert",
          "passportPhoto": "passportPhoto",
          "titleDeed": "titleDeed"
        };
        const typeKey = Object.keys(typeMap).find(k => file.originalname.toLowerCase().includes(k.toLowerCase())) || "idDocument";
        await conn.query(
          "INSERT INTO documents (customer_id, type, file_blob) VALUES (?, ?, ?)",
          [customerId, typeKey, file.buffer]
        );
      }
      const receiptJson = JSON.parse(receiptData);
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      let y = 800;
      const draw = (label: string, value: string) => {
        page.drawText(`${label}: ${value}`, { x: 50, y, size: fontSize, font, color: rgb(0,0,0) });
        y -= 20;
      };
      draw('Receipt ID', `RCP-${Date.now()}`);
      for (const [key, val] of Object.entries(receiptJson)) {
        draw(key, String(val));
      }
      const pdfBytes = await pdfDoc.save();
      const receiptNumber = `receipt_${customerId}_${Date.now()}`;
      await conn.query(
        "INSERT INTO receipts (receipt_number, payment_id, status) VALUES (?, NULL, 'official')",
        [receiptNumber]
      );
      await conn.commit();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${receiptNumber}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (e: any) {
      await conn.rollback();
      res.status(500).json({ error: e.message });
    } finally {
      conn.release();
    }
  });
});

// --- CSV IMPORT ENDPOINT ---
app.post("/api/csv/import", authenticateToken, async (req, res) => {
  const multerLib = require('multer');
  const storage = multerLib.memoryStorage();
  const upload = multerLib({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
  upload.single('excel')(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'Excel file required' });
    }
    try {
      const sheets = parseExcel(file.buffer);
      const extraInfo = sheets.map((s: any) => ({
        sheetName: s.sheetName,
        extraColumns: s.columns.filter((col: any) => !col || col.trim() === '' ? false : false)
      }));
      res.json({ sheets, extraInfo });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
});

// --- RECEIPT GENERATION ENDPOINT (PDF) ---
app.post("/api/receipts/generate", authenticateToken, async (req, res) => {
  const { saleId } = req.body;
  if (!saleId) return res.status(400).json({ error: "saleId required" });
  try {
    const [saleRows] = await pool.query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.id_number as kra_number, l.plot_number, l.location, l.size
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN lands l ON s.land_id = l.id
      WHERE s.id = ?
    `, [saleId]);
    if ((saleRows as any[]).length === 0) return res.status(404).json({ error: "Sale not found" });
    const sale = (saleRows as any[])[0];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = 18;
    let y = height - 50;
    const draw = (label: string, value: string) => {
      page.drawText(`${label}: ${value}`, { x: 50, y, size: fontSize, font, color: rgb(0,0,0) });
      y -= lineHeight;
    };
    draw('Receipt ID', `RCP-${Date.now()}`);
    draw('Customer', sale.customer_name);
    draw('Phone', sale.customer_phone);
    draw('KRA Number', sale.kra_number);
    draw('Title Number', sale.plot_number);
    draw('Plot Description', sale.location);
    draw('Amount', sale.total_price.toString());
    draw('Actual Payment', sale.paid_amount.toString());
    draw('Date', new Date(sale.date).toISOString().split('T')[0]);
    draw('Status/Total Paid', sale.status_total_paid || '');
    draw('Balance', sale.balance || '');
    draw('Total Debt', sale.total_debt || '');

    const pdfBytes = await pdfDoc.save();
    const receiptNumber = `receipt_${saleId}_${Date.now()}`;
    await pool.query(
      "INSERT INTO receipts (receipt_number, payment_id, status) VALUES (?, NULL, 'official')",
      [receiptNumber]
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receiptNumber}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `
    SELECT p.*, r.receipt_number, r.status as receipt_status, c.name as customer_name
    FROM payments p
    LEFT JOIN receipts r ON r.payment_id = p.id
    LEFT JOIN sales s ON p.reference_id = s.id AND p.reference_type = 'sale'
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) {
    query += ` AND p.date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND p.date <= ?`;
    params.push(endDate);
  }
  query += " ORDER BY p.date DESC";
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSES ROUTES ---
app.get("/api/expenses", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  let query = "SELECT e.*, u.name as operator_name FROM expenses e LEFT JOIN users u ON e.operator_id = u.id WHERE 1=1";
  const params: any[] = [];
  if (startDate) {
    query += ` AND e.date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND e.date <= ?`;
    params.push(endDate);
  }
  query += " ORDER BY e.date DESC";
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", authenticateToken, async (req, res) => {
  const { category, amount, description } = req.body;
  try {
    const [, metadata] = await pool.query(
      "INSERT INTO expenses (category, amount, description, operator_id, is_approved) VALUES (?, ?, ?, ?, FALSE)",
      [category, amount, description, (req as any).user.id]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM expenses WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { category, amount, description, is_approved } = req.body;
  try {
    const [, metadata] = await pool.query(
      "UPDATE expenses SET category = ?, amount = ?, description = ?, is_approved = ? WHERE id = ?",
      [category, amount || 0, description || null, !!is_approved, id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Expense not found" });
    const [rows] = await pool.query("SELECT * FROM expenses WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM expenses WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Expense not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- PROPERTY COSTS ROUTES ---
app.get("/api/property-costs", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `
    SELECT pc.*, pp.name as property_name, l.plot_number
    FROM property_costs pc
    LEFT JOIN parent_properties pp ON pc.parent_property_id = pp.id
    LEFT JOIN lands l ON pc.land_id = l.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) {
    query += ` AND pc.date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND pc.date <= ?`;
    params.push(endDate);
  }
  query += " ORDER BY pc.date DESC";
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/property-costs", authenticateToken, async (req, res) => {
  const { parent_property_id, land_id, category, amount, description } = req.body;
  try {
    const [, metadata] = await pool.query(
      "INSERT INTO property_costs (parent_property_id, land_id, category, amount, description, is_approved) VALUES (?, ?, ?, ?, ?, FALSE)",
      [
        parent_property_id ? parseInt(parent_property_id) : null,
        land_id ? parseInt(land_id) : null,
        category,
        amount,
        description
      ]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM property_costs WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/property-costs/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { parent_property_id, land_id, category, amount, description, is_approved } = req.body;
  try {
    const [, metadata] = await pool.query(
      `UPDATE property_costs
       SET parent_property_id = ?, land_id = ?, category = ?, amount = ?, description = ?, is_approved = ?
       WHERE id = ?`,
      [parent_property_id || null, land_id || null, category, amount || 0, description || null, !!is_approved, id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Property cost not found" });
    const [rows] = await pool.query("SELECT * FROM property_costs WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/property-costs/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM property_costs WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Property cost not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- APPROVAL ROUTES (ADMIN ONLY) ---
app.get("/api/approvals/pending", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    const [payments] = await pool.query(`
      SELECT p.*, r.receipt_number, c.name as customer_name
      FROM payments p 
      LEFT JOIN receipts r ON r.payment_id = p.id 
      LEFT JOIN sales s ON p.reference_id = s.id AND p.reference_type = 'sale'
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE p.is_approved = FALSE AND p.type = 'received'
    `);
    const [expenses] = await pool.query(`
      SELECT e.*, u.name as operator_name 
      FROM expenses e 
      LEFT JOIN users u ON e.operator_id = u.id 
      WHERE e.is_approved = FALSE
    `);
    const [propertyCosts] = await pool.query(`
      SELECT pc.*, pp.name as property_name, l.plot_number
      FROM property_costs pc
      LEFT JOIN parent_properties pp ON pc.parent_property_id = pp.id
      LEFT JOIN lands l ON pc.land_id = l.id
      WHERE pc.is_approved = FALSE
    `);
    res.json({ payments, expenses, propertyCosts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/approvals/payment/:id", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("UPDATE payments SET is_approved = TRUE, approved_by = ? WHERE id = ?", [req.user.id, id]);
    await conn.query("UPDATE receipts SET status = 'official' WHERE payment_id = ?", [id]);

    const [pRows] = await conn.query("SELECT * FROM payments WHERE id = ?", [id]);
    const payment = (pRows as any[])[0];

    if (payment && payment.reference_type === 'sale' && payment.reference_id) {
      const saleId = payment.reference_id;

      await conn.query("UPDATE sales SET is_approved = TRUE, approved_by = ? WHERE id = ?", [req.user.id, saleId]);

      const [totalPaidRes] = await conn.query(
        "SELECT SUM(amount) as total FROM payments WHERE reference_id = ? AND reference_type = 'sale' AND is_approved = TRUE",
        [saleId]
      );
      const totalPaid = parseFloat((totalPaidRes as any[])[0]?.total || 0);

      await conn.query("UPDATE sales SET paid_amount = ? WHERE id = ?", [totalPaid, saleId]);

      const [saleRows] = await conn.query("SELECT land_id, total_price FROM sales WHERE id = ?", [saleId]);
      if ((saleRows as any[]).length > 0) {
        const { land_id, total_price } = (saleRows as any[])[0];
        const plotStatus = totalPaid >= parseFloat(total_price) ? 'sold' : 'reserved';
        await conn.query(
          "UPDATE lands SET paid_amount = ?, status = ? WHERE id = ?",
          [totalPaid, plotStatus, land_id]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Payment approved and ledger updated" });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.post("/api/approvals/expense/:id", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    await pool.query("UPDATE expenses SET is_approved = TRUE, approved_by = ? WHERE id = ?", [req.user.id, req.params.id]);
    res.json({ message: "Expense approved" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/approvals/property-cost/:id", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    await pool.query("UPDATE property_costs SET is_approved = TRUE, approved_by = ? WHERE id = ?", [req.user.id, req.params.id]);
    res.json({ message: "Property cost approved" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DATA MIGRATION IMPORT ---
function normalizeImportKey(key: string) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()/-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeImportRow(row: Record<string, any>) {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = normalizeImportKey(key);
    if (!normalizedKey) continue;
    normalized[normalizedKey] = value;
  }
  return normalized;
}

function pickImportValue(row: Record<string, any>, keys: string[], fallback: any = '') {
  for (const key of keys) {
    const normalizedKey = normalizeImportKey(key);
    const value = row[normalizedKey];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return fallback;
}

function parseImportMoney(value: any) {
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim();
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseImportDate(value: any) {
  if (value === undefined || value === null || String(value).trim() === '') return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch;
  }
  const parsed = new Date(String(value).trim());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

app.post("/api/migrations/import", authenticateToken, async (req, res) => {
  const { target } = req.body;
  const rawData = req.body.data;
  if (!rawData || !Array.isArray(rawData)) {
    return res.status(400).json({ error: "Invalid data. Expected an array of records." });
  }
  const data = rawData.map(normalizeImportRow);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const importedCount = data.length;

    if (target === 'customers') {
      for (const row of data) {
        const name = pickImportValue(row, ['name', 'client_name', 'customer_name'], '');
        const email = pickImportValue(row, ['email'], null);
        const phone = String(pickImportValue(row, ['phone', 'telephone', 'contact'], ''));
        const id_number = String(pickImportValue(row, ['id_number', 'id', 'passport', 'id_passport'], ''));

        if (!name || !phone || !id_number) continue;

        await conn.query(
          `INSERT INTO customers (name, email, phone, id_number) 
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), phone = VALUES(phone)`,
          [name, email, phone, id_number]
        );
      }
    } else if (target === 'properties') {
      for (const row of data) {
        const name = pickImportValue(row, ['name', 'property_name'], '');
        const location = pickImportValue(row, ['location'], '');
        const total_size = String(row.total_size || row.size || row.acres || '0');
        const buying_price = parseImportMoney(pickImportValue(row, ['buying_price', 'price', 'cost'], 0));
        const amount_paid_to_seller = parseImportMoney(pickImportValue(row, ['amount_paid', 'paid'], 0));
        const notes = pickImportValue(row, ['notes'], '');

        if (!name || !location) continue;

        await conn.query(
          `INSERT INTO parent_properties (name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, location, total_size, amount_paid_to_seller >= buying_price ? 'fully_owned' : 'partial', buying_price, amount_paid_to_seller, notes]
        );
      }
    } else if (target === 'lands') {
      for (const row of data) {
        const plot_number = String(pickImportValue(row, ['plot_number', 'plot', 'number', 'plot_description'], ''));
        const location = pickImportValue(row, ['location'], '');
        const size = String(row.size || row.Size || '50x100');
        const total_cost = parseImportMoney(pickImportValue(row, ['total_cost', 'price', 'cost', 'selling_price', 'amount'], 0));
        const paid_amount = parseImportMoney(pickImportValue(row, ['paid_amount', 'paid', 'actual_payment'], 0));
        const status = pickImportValue(row, ['status'], '') || (paid_amount >= total_cost ? 'sold' : paid_amount > 0 ? 'reserved' : 'available');
        const title_deed_status = pickImportValue(row, ['title_deed_status', 'deed'], 'pending');
        const parent_property_id = row.parent_property_id ? parseInt(row.parent_property_id) : null;

        if (!plot_number || !location) continue;

        await conn.query(
          `INSERT INTO lands (parent_property_id, plot_number, location, size, acquisition_type, status, total_cost, paid_amount, title_deed_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             location = VALUES(location), size = VALUES(size), total_cost = VALUES(total_cost),
             paid_amount = VALUES(paid_amount), status = VALUES(status), title_deed_status = VALUES(title_deed_status)`,
          [parent_property_id, plot_number, location, size, 'purchase', status, total_cost, paid_amount, title_deed_status]
        );
      }
    } else if (target === 'payroll') {
      for (const row of data) {
        const staff_name = pickImportValue(row, ['staff_name', 'name'], '');
        if (!staff_name || staff_name.toUpperCase() === 'TOTAL' || staff_name.toUpperCase().includes('RAYBANN')) continue;
        const month_year = pickImportValue(row, ['month_year'], 'August 2025');
        const basic = parseImportMoney(pickImportValue(row, ['basic'], 0));
        const commission = parseImportMoney(pickImportValue(row, ['commission'], 0));
        const transport = parseImportMoney(pickImportValue(row, ['transport'], 0));
        const deductions = parseImportMoney(pickImportValue(row, ['deductions'], 0));
        const gross_amount = parseImportMoney(pickImportValue(row, ['gross_amount', 'gross'], 0));
        const net_amount = parseImportMoney(pickImportValue(row, ['net_amount', 'net'], 0));
        const reporting_date = parseImportDate(pickImportValue(row, ['reporting_date', 'date'], new Date()));

        await conn.query(
          `INSERT INTO payroll (staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date]
        );
      }
    } else if (target === 'debts_payables') {
      let currentCreditor = "";
      let currentDesc = "";
      let currentTotalVal = 0;
      for (const row of data) {
        let creditor_name = pickImportValue(row, ['debt', 'name', 'creditor', 'creditor_name'], '');
        const description = pickImportValue(row, ['description', 'decscriptn', 'desc'], '');
        const total_amount = parseImportMoney(pickImportValue(row, ['amount', 'total_amount'], 0));
        const paid_amount = parseImportMoney(pickImportValue(row, ['paid', 'paid_amount'], 0));
        const date = parseImportDate(pickImportValue(row, ['date'], new Date()));
        const payment_method = pickImportValue(row, ['mode_from', 'mode', 'method', 'payment_method'], 'CASH');
        const balance = parseImportMoney(pickImportValue(row, ['balance'], 0));

        creditor_name = String(creditor_name).trim();
        if (creditor_name && creditor_name !== 'undefined' && creditor_name !== '') {
          currentCreditor = creditor_name;
          currentDesc = description;
          currentTotalVal = total_amount;
        }

        if (!currentCreditor) continue;

        await conn.query(
          `INSERT INTO debts_payables (creditor_name, description, total_amount, paid_amount, balance, date, payment_method, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            currentCreditor,
            currentDesc || 'Vendor Expense / Liability',
            currentTotalVal,
            paid_amount,
            balance,
            date,
            payment_method,
            balance === 0 ? 'cleared' : 'pending'
          ]
        );
      }
    } else if (target === 'petty_cash') {
      for (const row of data) {
        const d_date = pickImportValue(row, ['date_debit', 'date'], null);
        const d_desc = pickImportValue(row, ['desc_debit', 'description'], '');
        const d_ref = pickImportValue(row, ['ref_debit', 'cbn'], '');
        const d_amount = parseImportMoney(pickImportValue(row, ['amount_debit', 'amount'], 0));

        const c_date = pickImportValue(row, ['date_credit', 'date_1', 'date'], null);
        const c_desc = pickImportValue(row, ['desc_credit', 'description_1'], '');
        const c_ref = pickImportValue(row, ['ref_credit', 'vn'], '');
        const c_amount = parseImportMoney(pickImportValue(row, ['amount_credit', 'amount_1'], 0));

        if (d_date && d_amount > 0) {
          await conn.query(
            `INSERT INTO petty_cash (date, type, description, ref_number, amount) VALUES (?, 'debit', ?, ?, ?)`,
            [parseImportDate(d_date), d_desc, d_ref, d_amount]
          );
        }

        if (c_date && c_amount > 0) {
          await conn.query(
            `INSERT INTO petty_cash (date, type, description, ref_number, amount) VALUES (?, 'credit', ?, ?, ?)`,
            [parseImportDate(c_date), c_desc, c_ref, c_amount]
          );
        }
      }
    } else if (target === 'sales_ledger') {
      let currentCustomer = "";
      let currentPlot = "";
      let currentAmount = 0;

      for (const row of data) {
        const name = String(pickImportValue(row, ['customer_name', 'name'], '')).trim();
        const plot = String(pickImportValue(row, ['plot_description', 'plot', 'plot_number'], '')).trim();
        const amount = parseImportMoney(pickImportValue(row, ['amount', 'total_price', 'price'], 0));
        const payment = parseImportMoney(pickImportValue(row, ['actual_payment', 'paid', 'paid_amount', 'payment'], 0));
        const date = parseImportDate(pickImportValue(row, ['date'], new Date()));
        const status = String(pickImportValue(row, ['status_total_paid', 'status', 'total_paid'], '')).trim();
        const balance = parseImportMoney(pickImportValue(row, ['balance_c_f', 'balance'], 0));

        const hasCustomerRow = !!name;
        const looksLikeSummaryRow = !hasCustomerRow && payment === 0 && (status || balance > 0);

        if (hasCustomerRow) {
          currentCustomer = name;
          currentPlot = plot;
          currentAmount = amount;
        }

        if (!currentCustomer || looksLikeSummaryRow) continue;

        // Find or create customer (LIKE is case-insensitive in MySQL by default)
        const [custRes] = await conn.query("SELECT id FROM customers WHERE name LIKE ?", [currentCustomer]);
        let customer_id: number;
        if ((custRes as any[]).length === 0) {
          const fakeId = "MIG-" + Math.floor(100000 + Math.random() * 900000);
          const phone = "+2547" + Math.floor(10000000 + Math.random() * 90000000);
          const [insRes] = await conn.query(
            "INSERT INTO customers (name, phone, id_number) VALUES (?, ?, ?)",
            [currentCustomer, phone, fakeId]
          );
          customer_id = (insRes as any).insertId;
        } else {
          customer_id = (custRes as any[])[0].id;
        }

        let land_id: number | null = null;
        if (currentPlot) {
          const [landRes] = await conn.query("SELECT id FROM lands WHERE plot_number = ?", [currentPlot]);
          if ((landRes as any[]).length === 0) {
            const landStatus = balance <= 0 && status.toLowerCase().includes('cleared') ? 'sold' : 'reserved';
            const [insLand] = await conn.query(
              `INSERT INTO lands (plot_number, location, size, acquisition_type, status, total_cost, paid_amount, customer_id) 
               VALUES (?, 'Kajiado / Kenya', '50x100', 'purchase', ?, ?, ?, ?)`,
              [currentPlot, landStatus, currentAmount, payment, customer_id]
            );
            land_id = (insLand as any).insertId;
          } else {
            land_id = (landRes as any[])[0].id;
            await conn.query(
              `UPDATE lands
               SET total_cost = IF(? > 0, ?, total_cost),
                   paid_amount = paid_amount + ?,
                   customer_id = ?,
                   status = IF(paid_amount + ? >= IF(? > 0, ?, total_cost), 'sold', 'reserved')
               WHERE id = ?`,
              [currentAmount, currentAmount, payment, customer_id, payment, currentAmount, currentAmount, land_id]
            );
          }
        }

        let sale_id: number | null = null;
        if (land_id) {
          const [saleRes] = await conn.query("SELECT id FROM sales WHERE land_id = ? AND customer_id = ?", [land_id, customer_id]);
          if ((saleRes as any[]).length === 0) {
            const [insSale] = await conn.query(
              "INSERT INTO sales (land_id, customer_id, total_price, paid_amount, is_approved) VALUES (?, ?, ?, ?, TRUE)",
              [land_id, customer_id, currentAmount, payment]
            );
            sale_id = (insSale as any).insertId;
          } else {
            sale_id = (saleRes as any[])[0].id;
            await conn.query(
              `UPDATE sales
               SET total_price = IF(? > 0, ?, total_price),
                   paid_amount = paid_amount + ?
               WHERE id = ?`,
              [currentAmount, currentAmount, payment, sale_id]
            );
          }
        }

        if (payment > 0) {
          await conn.query(
            `INSERT INTO payments (type, amount, method, category, description, reference_id, reference_type, transaction_ref, is_approved, date) 
             VALUES ('received', ?, 'bank', 'plot_installment', ?, ?, 'sale', ?, TRUE, ?)`,
            [payment, `Installment payment imported for ${currentCustomer}`, sale_id, `MIG-${Math.floor(Math.random()*100000)}`, date]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, count: importedCount });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// --- DEBTS & PAYABLES ---
app.get("/api/debts-payables", authenticateToken, async (req: any, res: any) => {
  try {
    const [rows] = await pool.query("SELECT * FROM debts_payables ORDER BY date DESC, id DESC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/debts-payables", authenticateToken, async (req: any, res: any) => {
  const { creditor_name, description, total_amount, paid_amount, balance, date, payment_method, status } = req.body;
  try {
    const [, metadata] = await pool.query(
      `INSERT INTO debts_payables (creditor_name, description, total_amount, paid_amount, balance, date, payment_method, status) 
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?)`,
      [creditor_name, description, parseFloat(total_amount || 0), parseFloat(paid_amount || 0), parseFloat(balance || 0), date, payment_method || 'CASH', status || 'pending']
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM debts_payables WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/debts-payables/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { creditor_name, description, total_amount, paid_amount, date, payment_method, status } = req.body;
  const balance = parseFloat(total_amount || 0) - parseFloat(paid_amount || 0);
  try {
    const [, metadata] = await pool.query(
      `UPDATE debts_payables
       SET creditor_name = ?, description = ?, total_amount = ?, paid_amount = ?, balance = ?, date = COALESCE(?, date),
           payment_method = ?, status = ?
       WHERE id = ?`,
      [creditor_name, description, parseFloat(total_amount || 0), parseFloat(paid_amount || 0), balance, date, payment_method || 'CASH', status || (balance <= 0 ? 'cleared' : 'pending'), id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Debt record not found" });
    const [rows] = await pool.query("SELECT * FROM debts_payables WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/debts-payables/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM debts_payables WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Debt record not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- PAYROLL ---
app.get("/api/payroll", authenticateToken, async (req: any, res: any) => {
  try {
    const [rows] = await pool.query("SELECT * FROM payroll ORDER BY reporting_date DESC, id DESC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll", authenticateToken, async (req: any, res: any) => {
  const { staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date } = req.body;
  try {
    const [, metadata] = await pool.query(
      `INSERT INTO payroll (staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [staff_name, month_year, parseFloat(basic || 0), parseFloat(commission || 0), parseFloat(transport || 0), parseFloat(deductions || 0), parseFloat(gross_amount || 0), parseFloat(net_amount || 0), reporting_date]
    );
    const insertId = metadata.insertId;
    const [rows] = await pool.query("SELECT * FROM payroll WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/payroll/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { staff_name, month_year, basic, commission, transport, deductions, reporting_date } = req.body;
  const gross = parseFloat(basic || 0) + parseFloat(commission || 0) + parseFloat(transport || 0);
  const net = gross - parseFloat(deductions || 0);
  try {
    const [, metadata] = await pool.query(
      `UPDATE payroll
       SET staff_name = ?, month_year = ?, basic = ?, commission = ?, transport = ?, deductions = ?,
           gross_amount = ?, net_amount = ?, reporting_date = COALESCE(?, reporting_date)
       WHERE id = ?`,
      [staff_name, month_year, parseFloat(basic || 0), parseFloat(commission || 0), parseFloat(transport || 0), parseFloat(deductions || 0), gross, net, reporting_date, id]
    );
    if (metadata.affectedRows === 0) return res.status(404).json({ error: "Payroll record not found" });
    const [rows] = await pool.query("SELECT * FROM payroll WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/payroll/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM payroll WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Payroll record not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- SALARY PAYMENTS ---
app.get("/api/payroll/unpaid", authenticateToken, async (req: any, res: any) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM payroll WHERE is_paid = FALSE OR is_paid IS NULL ORDER BY reporting_date DESC, id DESC"
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/salary-payments", authenticateToken, async (req: any, res: any) => {
  try {
    const [rows] = await pool.query("SELECT * FROM salary_payments ORDER BY payment_date DESC, id DESC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/salary-payments", authenticateToken, async (req: any, res: any) => {
  const { payroll_id, staff_name, amount, payment_method, transaction_ref } = req.body;
  try {
    const [, metadata] = await pool.query(
      `INSERT INTO salary_payments (payroll_id, staff_name, amount, payment_method, transaction_ref, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payroll_id, staff_name, parseFloat(amount || 0), payment_method, transaction_ref, req.user.id]
    );
    const insertId = metadata.insertId;

    if (payroll_id) {
      await pool.query(
        "UPDATE payroll SET is_paid = TRUE, paid_date = CURRENT_TIMESTAMP, paid_method = ? WHERE id = ?",
        [payment_method, payroll_id]
      );
    }

    const [rows] = await pool.query("SELECT * FROM salary_payments WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/payroll/run", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { payment_method, transaction_ref } = req.body;
  try {
    const [unpaidResult] = await pool.query(
      "SELECT * FROM payroll WHERE is_paid = FALSE OR is_paid IS NULL"
    );
    const unpaidPayroll = unpaidResult as any[];

    if (unpaidPayroll.length === 0) {
      return res.json({ message: "No unpaid payroll to process", processed: 0 });
    }

    const payments = [];
    for (const payroll of unpaidPayroll) {
      const [paymentResult] = await pool.query(
        `INSERT INTO salary_payments (payroll_id, staff_name, amount, payment_method, transaction_ref, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [payroll.id, payroll.staff_name, payroll.net_amount, payment_method, transaction_ref, req.user.id]
      );
      const insertId = (paymentResult as any).insertId;

      await pool.query(
        "UPDATE payroll SET is_paid = TRUE, paid_date = CURRENT_TIMESTAMP, paid_method = ? WHERE id = ?",
        [payment_method, payroll.id]
      );

      const [rows] = await pool.query("SELECT * FROM salary_payments WHERE id = ?", [insertId]);
      payments.push((rows as any[])[0]);
    }

    res.json({
      message: `Payroll processed successfully for ${payments.length} staff`,
      processed: payments.length,
      payments
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- PETTY CASH ---
app.get("/api/petty-cash", authenticateToken, async (req: any, res: any) => {
  try {
    const [rows] = await pool.query("SELECT * FROM petty_cash ORDER BY date DESC, id DESC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/petty-cash", authenticateToken, async (req: any, res: any) => {
  const { date, type, description, ref_number, amount } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO petty_cash (date, type, description, ref_number, amount) VALUES (COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?)`,
      [date, type, description, ref_number, parseFloat(amount || 0)]
    );
    const insertId = (result as any).insertId;
    const [rows] = await pool.query("SELECT * FROM petty_cash WHERE id = ?", [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/petty-cash/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { date, type, description, ref_number, amount } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE petty_cash SET date = COALESCE(?, date), type = ?, description = ?, ref_number = ?, amount = ? WHERE id = ?`,
      [date, type, description, ref_number, parseFloat(amount || 0), id]
    );
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Petty cash record not found" });
    const [rows] = await pool.query("SELECT * FROM petty_cash WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/petty-cash/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM petty_cash WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Petty cash record not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- DASHBOARD & REPORTS STATS ---
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let dateFilter = "";
    const params: any[] = [];
    if (startDate) {
      dateFilter += ` AND date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND date <= ?`;
      params.push(endDate);
    }

    const [lands] = await pool.query("SELECT COUNT(*) as total, SUM(total_cost) - SUM(paid_amount) as total_debt FROM lands");
    const [sales] = await pool.query(`SELECT COUNT(*) as total, SUM(total_price) as revenue FROM sales WHERE is_approved = TRUE ${dateFilter}`, params);
    const [payments] = await pool.query(`SELECT SUM(amount) as total FROM payments WHERE is_approved = TRUE AND type = 'received' ${dateFilter}`, params);
    const [expenses] = await pool.query(`SELECT SUM(amount) as total FROM expenses WHERE is_approved = TRUE ${dateFilter}`, params);
    const [propertyCosts] = await pool.query(`SELECT SUM(amount) as total FROM property_costs WHERE is_approved = TRUE ${dateFilter}`, params);
    const [properties] = await pool.query("SELECT COUNT(*) as total, SUM(buying_price) - SUM(amount_paid_to_seller) as total_unpaid FROM parent_properties");

    res.json({
      landCount: parseInt((lands as any[])[0].total || 0),
      landDebt: parseFloat((lands as any[])[0].total_debt || 0),
      salesCount: parseInt((sales as any[])[0].total || 0),
      revenue: parseFloat((sales as any[])[0].revenue || 0),
      received: parseFloat((payments as any[])[0].total || 0),
      expenses: parseFloat((expenses as any[])[0].total || 0) + parseFloat((propertyCosts as any[])[0].total || 0),
      propertyCount: parseInt((properties as any[])[0].total || 0),
      propertyDebt: parseFloat((properties as any[])[0].total_unpaid || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed financial charts endpoint
app.get("/api/reports/analytics", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let dateFilter = "";
    const params: any[] = [];
    if (startDate) {
      dateFilter += ` AND p.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND p.date <= ?`;
      params.push(endDate);
    }

    // Group by month using MySQL's DATE_FORMAT (replaces PostgreSQL's TO_CHAR / DATE_TRUNC)
    const [paymentRows] = await pool.query(`
      SELECT DATE_FORMAT(p.date, '%b') as name, SUM(p.amount) as collections
      FROM payments p
      WHERE p.is_approved = TRUE AND p.type = 'received' ${dateFilter}
      GROUP BY DATE_FORMAT(p.date, '%b'), DATE_FORMAT(p.date, '%Y-%m')
      ORDER BY DATE_FORMAT(p.date, '%Y-%m')
    `, params);

    const expensesParams: any[] = [];
    let expFilter = "";
    if (startDate) {
      expFilter += ` AND date >= ?`;
      expensesParams.push(startDate);
    }
    if (endDate) {
      expFilter += ` AND date <= ?`;
      expensesParams.push(endDate);
    }

    const [expensesRows] = await pool.query(`
      SELECT DATE_FORMAT(date, '%b') as name, SUM(amount) as costs
      FROM expenses
      WHERE is_approved = TRUE ${expFilter}
      GROUP BY DATE_FORMAT(date, '%b'), DATE_FORMAT(date, '%Y-%m')
      ORDER BY DATE_FORMAT(date, '%Y-%m')
    `, expensesParams);

    const [propertyCostRows] = await pool.query(`
      SELECT DATE_FORMAT(date, '%b') as name, SUM(amount) as costs
      FROM property_costs
      WHERE is_approved = TRUE ${expFilter}
      GROUP BY DATE_FORMAT(date, '%b'), DATE_FORMAT(date, '%Y-%m')
      ORDER BY DATE_FORMAT(date, '%Y-%m')
    `, expensesParams);

    // Merge by month
    const monthMap: { [key: string]: { name: string, sales: number, collections: number, expenses: number } } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const m of months) {
      monthMap[m] = { name: m, sales: 0, collections: 0, expenses: 0 };
    }

    (paymentRows as any[]).forEach((r: any) => {
      if (monthMap[r.name]) {
        monthMap[r.name].collections = parseFloat(r.collections || 0);
        monthMap[r.name].sales = parseFloat(r.collections || 0);
      }
    });

    (expensesRows as any[]).forEach((r: any) => {
      if (monthMap[r.name]) {
        monthMap[r.name].expenses += parseFloat(r.costs || 0);
      }
    });

    (propertyCostRows as any[]).forEach((r: any) => {
      if (monthMap[r.name]) {
        monthMap[r.name].expenses += parseFloat(r.costs || 0);
      }
    });

    const chartData = Object.values(monthMap);

    const [categories] = await pool.query(`
      SELECT category as label, SUM(amount) as value 
      FROM payments WHERE is_approved = TRUE AND type = 'received'
      GROUP BY category
    `);

    const [expenseCategories] = await pool.query(`
      SELECT category as label, SUM(amount) as value 
      FROM expenses WHERE is_approved = TRUE
      GROUP BY category
    `);

    const [customerCount] = await pool.query("SELECT COUNT(*) as total FROM customers");

    res.json({
      chartData,
      categories,
      expenseCategories,
      customerCount: parseInt((customerCount as any[])[0].total || 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: Number(process.env.VITE_HMR_PORT || PORT + 1)
        }
      },
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
