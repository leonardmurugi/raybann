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
// Static assets middleware moved below app initialization

await dbInit();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "terratrack-secret-key-2026";

const app = express();
app.use(cors());
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), "public")));
app.use(helmet({
  contentSecurityPolicy: false, // For development with Vite
}));
app.use(express.json({ limit: '10mb' })); // Support larger bulk uploads



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

async function syncSalePaymentTotals(client: any, saleId: number) {
  const totalPaidRes = await client.query(
    "SELECT SUM(amount) as total FROM payments WHERE reference_id = $1 AND reference_type = 'sale' AND is_approved = TRUE",
    [saleId]
  );
  const totalPaid = parseFloat(totalPaidRes.rows[0].total || 0);
  const saleUpdate = await client.query(
    "UPDATE sales SET paid_amount = $1 WHERE id = $2 RETURNING land_id, total_price",
    [totalPaid, saleId]
  );
  if (saleUpdate.rows.length > 0) {
    const { land_id, total_price } = saleUpdate.rows[0];
    const plotStatus = totalPaid >= parseFloat(total_price) ? 'sold' : 'reserved';
    await client.query(
      "UPDATE lands SET paid_amount = $1, status = $2 WHERE id = $3",
      [totalPaid, plotStatus, land_id]
    );
  }
}

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

// --- LAND & PROPERTY ROUTES ---
app.get("/api/properties", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM parent_properties ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/properties", authenticateToken, async (req, res) => {
  const { name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO parent_properties (name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/properties/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE parent_properties
       SET name = $1, location = $2, total_size = $3, ownership_status = $4, buying_price = $5, amount_paid_to_seller = $6, notes = $7
       WHERE id = $8 RETURNING *`,
      [name, location, total_size, ownership_status || 'partial', buying_price || 0, amount_paid_to_seller || 0, notes || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Property not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/properties/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const linkedPlots = await pool.query("SELECT COUNT(*)::int AS count FROM lands WHERE parent_property_id = $1", [id]);
    const linkedCosts = await pool.query("SELECT COUNT(*)::int AS count FROM property_costs WHERE parent_property_id = $1", [id]);
    if (linkedPlots.rows[0].count > 0 || linkedCosts.rows[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete property with linked plots or costs. Remove those records first." });
    }

    const result = await pool.query("DELETE FROM parent_properties WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Property not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/lands", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, p.name as parent_name 
      FROM lands l 
      LEFT JOIN parent_properties p ON l.parent_property_id = p.id 
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/lands", authenticateToken, async (req, res) => {
  const { parent_property_id, plot_number, location, size, acquisition_type, status, total_cost, title_deed_status, title_deed_url } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO lands (parent_property_id, plot_number, location, size, acquisition_type, status, total_cost, title_deed_status, title_deed_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        parent_property_id ? parseInt(parent_property_id) : null,
        plot_number,
        location,
        size,
        acquisition_type || 'purchase',
        status || 'available',
        total_cost || 0,
        title_deed_status || 'pending',
        title_deed_url || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/lands/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { parent_property_id, plot_number, location, size, acquisition_type, total_cost, title_deed_status, title_deed_url, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lands
       SET parent_property_id = $1, plot_number = $2, location = $3, size = $4, acquisition_type = $5, total_cost = $6,
           title_deed_status = $7, title_deed_url = $8, status = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [parent_property_id ? parseInt(parent_property_id) : null, plot_number, location, size, acquisition_type || 'purchase', total_cost || 0, title_deed_status || 'pending', title_deed_url || null, status || 'available', id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Plot not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/lands/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const linkedSales = await pool.query("SELECT COUNT(*)::int AS count FROM sales WHERE land_id = $1", [id]);
    const linkedCosts = await pool.query("SELECT COUNT(*)::int AS count FROM property_costs WHERE land_id = $1", [id]);
    if (linkedSales.rows[0].count > 0 || linkedCosts.rows[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete plot with linked sales or costs. Remove those records first." });
    }

    const result = await pool.query("DELETE FROM lands WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Plot not found" });
    res.status(204).send();
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

  // --- INVENTORY ROUTES ---
  app.get("/api/inventory", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM inventory ORDER BY item_name ASC`);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/inventory", authenticateToken, requireAdmin, async (req, res) => {
    const { item_name, quantity, unit_price, category } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO inventory (item_name, quantity, unit_price, category) VALUES ($1, $2, $3, $4) RETURNING *",
        [item_name, quantity, unit_price, category]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/inventory/:id", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { item_name, quantity, unit_price, category } = req.body;
    try {
      const result = await pool.query(
        `UPDATE inventory SET item_name = $1, quantity = $2, unit_price = $3, category = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
        [item_name, quantity, unit_price, category, id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/inventory/:id", authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query(`DELETE FROM inventory WHERE id = $1`, [id]);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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

app.put("/api/customers/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, id_number } = req.body;
  try {
    const result = await pool.query(
      "UPDATE customers SET name = $1, email = $2, phone = $3, id_number = $4 WHERE id = $5 RETURNING *",
      [name, email || null, phone, id_number, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Customer not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const linkedSales = await pool.query("SELECT COUNT(*)::int AS count FROM sales WHERE customer_id = $1", [id]);
    const linkedDocs = await pool.query("SELECT COUNT(*)::int AS count FROM documents WHERE customer_id = $1", [id]);
    if (linkedSales.rows[0].count > 0 || linkedDocs.rows[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete customer with linked sales or documents." });
    }
    const result = await pool.query("DELETE FROM customers WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Customer not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
// Duplicate customer POST blocks removed

// --- SALES & PAYMENTS ---
app.get("/api/sales", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.id_number as customer_id_number,
             l.plot_number, l.location, l.size, p.name as parent_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN lands l ON s.land_id = l.id
      LEFT JOIN parent_properties p ON l.parent_property_id = p.id
      ORDER BY s.date DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sales/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const saleRes = await pool.query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.id_number as customer_id_number,
             l.plot_number, l.location, l.size, p.name as parent_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN lands l ON s.land_id = l.id
      LEFT JOIN parent_properties p ON l.parent_property_id = p.id
      WHERE s.id = $1
    `, [id]);

    if (saleRes.rows.length === 0) {
      return res.status(404).json({ error: "Sale record not found" });
    }

    const paymentsRes = await pool.query(`
      SELECT p.*, r.receipt_number, r.status as receipt_status
      FROM payments p
      LEFT JOIN receipts r ON r.payment_id = p.id
      WHERE p.reference_id = $1 AND p.reference_type = 'sale'
      ORDER BY p.date DESC
    `, [id]);

    res.json({
      sale: saleRes.rows[0],
      payments: paymentsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales", authenticateToken, async (req, res) => {
  const { land_id, customer_id, total_price, paid_amount, method, transaction_ref } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // We register the sale as pending admin approval
    const saleResult = await client.query(
      "INSERT INTO sales (land_id, customer_id, total_price, paid_amount, is_approved) VALUES ($1, $2, $3, $4, FALSE) RETURNING *",
      [land_id, customer_id, total_price, 0] // approved payments start at 0
    );
    const sale = saleResult.rows[0];
    
    // Update land status to pending/reserved so others don't purchase it
    await client.query(
      "UPDATE lands SET status = 'reserved', customer_id = $1 WHERE id = $2",
      [customer_id, land_id]
    );

    // Record initial deposit payment (as pending admin approval)
    if (paid_amount > 0) {
      const paymentResult = await client.query(
        "INSERT INTO payments (type, amount, method, category, description, reference_id, reference_type, transaction_ref, created_by, is_approved) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE) RETURNING *",
        ['received', paid_amount, method || 'cash', 'land_sale', `Deposit for plot ${land_id}`, sale.id, 'sale', transaction_ref, (req as any).user.id]
      );
      
      const payment = paymentResult.rows[0];
      
      // Generate temp receipt
      const receiptNum = `RCP-${Date.now()}`;
      await client.query(
        "INSERT INTO receipts (receipt_number, payment_id, status) VALUES ($1, $2, $3)",
        [receiptNum, payment.id, 'pending']
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

app.put("/api/sales/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { land_id, customer_id, total_price, paid_amount, is_approved } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT land_id FROM sales WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sale not found" });
    }
    const result = await client.query(
      `UPDATE sales
       SET land_id = $1, customer_id = $2, total_price = $3, paid_amount = $4, is_approved = $5
       WHERE id = $6 RETURNING *`,
      [land_id, customer_id, total_price || 0, paid_amount || 0, !!is_approved, id]
    );
    if (Number(existing.rows[0].land_id) !== Number(land_id)) {
      await client.query("UPDATE lands SET status = 'available', customer_id = NULL, paid_amount = 0 WHERE id = $1", [existing.rows[0].land_id]);
    }
    const status = parseFloat(paid_amount || 0) >= parseFloat(total_price || 0) ? 'sold' : 'reserved';
    await client.query("UPDATE lands SET status = $1, customer_id = $2, paid_amount = $3 WHERE id = $4", [status, customer_id, paid_amount || 0, land_id]);
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/sales/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT land_id FROM sales WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sale not found" });
    }
    const linkedPayments = await client.query("SELECT COUNT(*)::int AS count FROM payments WHERE reference_id = $1 AND reference_type = 'sale'", [id]);
    if (linkedPayments.rows[0].count > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot delete sale with linked payments. Delete the payments first." });
    }
    await client.query("DELETE FROM sales WHERE id = $1", [id]);
    await client.query("UPDATE lands SET status = 'available', customer_id = NULL, paid_amount = 0 WHERE id = $1", [existing.rows[0].land_id]);
    await client.query("COMMIT");
    res.status(204).send();
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- RECORD NEW PAYMENT (INSTALLMENT) ---
app.post("/api/payments", authenticateToken, async (req, res) => {
  const { type, amount, method, category, description, reference_id, reference_type, transaction_ref } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO payments (type, amount, method, category, description, reference_id, reference_type, transaction_ref, created_by, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE) RETURNING *`,
      [type || 'received', amount, method || 'cash', category || 'plot_installment', description, reference_id, reference_type, transaction_ref, (req as any).user.id]
    );
    
    const payment = result.rows[0];

    if (type === 'received' || reference_type === 'sale') {
      const receiptNum = `RCP-${Date.now()}`;
      await pool.query(
        "INSERT INTO receipts (receipt_number, payment_id, status) VALUES ($1, $2, $3)",
        [receiptNum, payment.id, 'pending']
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE payments
       SET type = $1, amount = $2, method = $3, category = $4, description = $5, reference_id = $6,
           reference_type = $7, transaction_ref = $8, is_approved = $9
       WHERE id = $10 RETURNING *`,
      [type || 'received', amount || 0, method || 'cash', category || 'plot_installment', description || null, reference_id || null, reference_type || null, transaction_ref || null, !!is_approved, id]
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }
    const payment = result.rows[0];
    if (payment.reference_type === 'sale' && payment.reference_id) {
      await syncSalePaymentTotals(client, payment.reference_id);
    }
    await client.query("COMMIT");
    res.json(payment);
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT * FROM payments WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }
    await client.query("DELETE FROM receipts WHERE payment_id = $1", [id]);
    await client.query("DELETE FROM payments WHERE id = $1", [id]);
    const payment = existing.rows[0];
    if (payment.reference_type === 'sale' && payment.reference_id) {
      await syncSalePaymentTotals(client, payment.reference_id);
    }
    await client.query("COMMIT");
    res.status(204).send();
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

  /* New Receipt Generation Endpoint */
app.post("/api/receipts", authenticateToken, async (req, res) => {
  // Use multer to parse multipart/form-data
  const multer = require('multer');
  const storage = multer.memoryStorage();
  const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
  upload.fields([
    { name: "documents", maxCount: 5 }
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const { customerId, receiptData } = req.body;
    if (!customerId || !receiptData) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const files = ((req as any).files && (req as any).files.documents) || [];
    // Validate and store each document as blob
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const file of files) {
        const typeMap: any = {
          "saleAgreement": "saleAgreement",
          "idDocument": "idDocument",
          "kraCert": "kraCert",
          "passportPhoto": "passportPhoto",
          "titleDeed": "titleDeed"
        };
        // Determine document type from originalname prefix
        const typeKey = Object.keys(typeMap).find(k => file.originalname.toLowerCase().includes(k.toLowerCase())) || "unknown";
        await client.query(
          "INSERT INTO documents (customer_id, type, blob) VALUES ($1, $2, $3)",
          [customerId, typeKey, file.buffer]
        );
      }
      // Generate PDF receipt
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
      await client.query(
        "INSERT INTO receipts (receipt_number, pdf_blob, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)",
        [receiptNumber, Buffer.from(pdfBytes)]
      );
      await client.query('COMMIT');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${receiptNumber}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (e: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: e.message });
    } finally {
      client.release();
    }
  });
});


// --- CSV IMPORT ENDPOINT ---
app.post("/api/csv/import", authenticateToken, async (req, res) => {
  const multer = require('multer');
  const storage = multer.memoryStorage();
  const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
  upload.single('excel')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'Excel file required' });
    }
    try {
      const sheets = parseExcel(file.buffer);
      // Detect extra columns (any column beyond the first column set per sheet)
      const extraInfo = sheets.map(s => ({
        sheetName: s.sheetName,
        extraColumns: s.columns.filter(col => !col || col.trim() === '' ? false : false) // placeholder, can be customized
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
      const saleRes = await pool.query(`
        SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.id_number as kra_number, l.plot_number, l.location, l.size
        FROM sales s
        JOIN customers c ON s.customer_id = c.id
        JOIN lands l ON s.land_id = l.id
        WHERE s.id = $1
      `, [saleId]);
      if (saleRes.rows.length === 0) return res.status(404).json({ error: "Sale not found" });
      const sale = saleRes.rows[0];

      // Build PDF using pdf-lib (already installed)
      const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();
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
      // Additional fields from Sheet1 if present in sale record
      draw('Status/Total Paid', sale.status_total_paid || '');
      draw('Balance', sale.balance || '');
      draw('Total Debt', sale.total_debt || '');

      const pdfBytes = await pdfDoc.save();
      const receiptNumber = `receipt_${saleId}_${Date.now()}`;
      await pool.query(
        "INSERT INTO receipts (receipt_number, payment_id, status) VALUES ($1, NULL, 'official')",
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
    params.push(startDate);
    query += ` AND p.date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    query += ` AND p.date <= $${params.length}`;
  }
  query += " ORDER BY p.date DESC";
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
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
    params.push(startDate);
    query += ` AND e.date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    query += ` AND e.date <= $${params.length}`;
  }
  query += " ORDER BY e.date DESC";
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", authenticateToken, async (req, res) => {
  const { category, amount, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO expenses (category, amount, description, operator_id, is_approved) VALUES ($1, $2, $3, $4, FALSE) RETURNING *",
      [category, amount, description, (req as any).user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { category, amount, description, is_approved } = req.body;
  try {
    const result = await pool.query(
      "UPDATE expenses SET category = $1, amount = $2, description = $3, is_approved = $4 WHERE id = $5 RETURNING *",
      [category, amount || 0, description || null, !!is_approved, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Expense not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM expenses WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Expense not found" });
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
    params.push(startDate);
    query += ` AND pc.date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    query += ` AND pc.date <= $${params.length}`;
  }
  query += " ORDER BY pc.date DESC";
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/property-costs", authenticateToken, async (req, res) => {
  const { parent_property_id, land_id, category, amount, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO property_costs (parent_property_id, land_id, category, amount, description, is_approved) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *",
      [
        parent_property_id ? parseInt(parent_property_id) : null,
        land_id ? parseInt(land_id) : null,
        category,
        amount,
        description
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/property-costs/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { parent_property_id, land_id, category, amount, description, is_approved } = req.body;
  try {
    const result = await pool.query(
      `UPDATE property_costs
       SET parent_property_id = $1, land_id = $2, category = $3, amount = $4, description = $5, is_approved = $6
       WHERE id = $7 RETURNING *`,
      [parent_property_id || null, land_id || null, category, amount || 0, description || null, !!is_approved, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Property cost not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/property-costs/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM property_costs WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Property cost not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- APPROVAL ROUTES (ADMIN ONLY) ---
app.get("/api/approvals/pending", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    const payments = await pool.query(`
      SELECT p.*, r.receipt_number, c.name as customer_name
      FROM payments p 
      LEFT JOIN receipts r ON r.payment_id = p.id 
      LEFT JOIN sales s ON p.reference_id = s.id AND p.reference_type = 'sale'
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE p.is_approved = FALSE AND p.type = 'received'
    `);
    const expenses = await pool.query(`
      SELECT e.*, u.name as operator_name 
      FROM expenses e 
      LEFT JOIN users u ON e.operator_id = u.id 
      WHERE e.is_approved = FALSE
    `);
    const propertyCosts = await pool.query(`
      SELECT pc.*, pp.name as property_name, l.plot_number
      FROM property_costs pc
      LEFT JOIN parent_properties pp ON pc.parent_property_id = pp.id
      LEFT JOIN lands l ON pc.land_id = l.id
      WHERE pc.is_approved = FALSE
    `);
    res.json({ payments: payments.rows, expenses: expenses.rows, propertyCosts: propertyCosts.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/approvals/payment/:id", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Update payment to approved
    await client.query("UPDATE payments SET is_approved = TRUE, approved_by = $1 WHERE id = $2", [req.user.id, id]);
    await client.query("UPDATE receipts SET status = 'official' WHERE payment_id = $1", [id]);
    
    // Fetch payment to check reference
    const pRes = await client.query("SELECT * FROM payments WHERE id = $1", [id]);
    const payment = pRes.rows[0];

    if (payment && payment.reference_type === 'sale' && payment.reference_id) {
      const saleId = payment.reference_id;
      
      // Approve the sale itself if it is not already approved
      await client.query("UPDATE sales SET is_approved = TRUE, approved_by = $1 WHERE id = $2", [req.user.id, saleId]);

      // Calculate total approved paid amount for this sale
      const totalPaidRes = await client.query(
        "SELECT SUM(amount) as total FROM payments WHERE reference_id = $1 AND reference_type = 'sale' AND is_approved = TRUE",
        [saleId]
      );
      const totalPaid = parseFloat(totalPaidRes.rows[0].total || 0);

      // Update sale paid amount
      const saleUpdate = await client.query(
        "UPDATE sales SET paid_amount = $1 WHERE id = $2 RETURNING land_id, total_price",
        [totalPaid, saleId]
      );
      
      if (saleUpdate.rows.length > 0) {
        const { land_id, total_price } = saleUpdate.rows[0];
        
        // Update plot paid amount
        const plotStatus = totalPaid >= parseFloat(total_price) ? 'sold' : 'reserved';
        await client.query(
          "UPDATE lands SET paid_amount = $1, status = $2 WHERE id = $3",
          [totalPaid, plotStatus, land_id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Payment approved and ledger updated" });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/approvals/expense/:id", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    await pool.query("UPDATE expenses SET is_approved = TRUE, approved_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
    res.json({ message: "Expense approved" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/approvals/property-cost/:id", authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    await pool.query("UPDATE property_costs SET is_approved = TRUE, approved_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const importedCount = data.length;
// Ensure lands table has parent_property_id column (migration safety)
await client.query(`DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lands' AND column_name='parent_property_id'
  ) THEN
    ALTER TABLE lands ADD COLUMN parent_property_id INTEGER REFERENCES parent_properties(id);
  END IF;
END $$;`);
    if (target === 'customers') {
      for (const row of data) {
        // Find columns matching id_number, phone, email, name
        const name = pickImportValue(row, ['name', 'client_name', 'customer_name'], '');
        const email = pickImportValue(row, ['email'], null);
        const phone = String(pickImportValue(row, ['phone', 'telephone', 'contact'], ''));
        const id_number = String(pickImportValue(row, ['id_number', 'id', 'passport', 'id_passport'], ''));
        
        if (!name || !phone || !id_number) continue;

        await client.query(
          `INSERT INTO customers (name, email, phone, id_number) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id_number) DO UPDATE 
           SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone`,
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

        await client.query(
          `INSERT INTO parent_properties (name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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

        await client.query(
          `INSERT INTO lands (parent_property_id, plot_number, location, size, acquisition_type, status, total_cost, paid_amount, title_deed_status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (plot_number) DO UPDATE
           SET location = EXCLUDED.location, size = EXCLUDED.size, total_cost = EXCLUDED.total_cost, paid_amount = EXCLUDED.paid_amount, status = EXCLUDED.status, title_deed_status = EXCLUDED.title_deed_status`,
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
        let reporting_date = parseImportDate(pickImportValue(row, ['reporting_date', 'date'], new Date()));

        await client.query(
          `INSERT INTO payroll (staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date]
        );
      }
    } else if (target === 'debts_payables') {
      let currentCreditor = "";
      let currentDesc = "";
      let currentTotalVal = 0;
      for (const row of data) {
        let creditor_name = pickImportValue(row, ['debt', 'name', 'creditor', 'creditor_name'], '');
        let description = pickImportValue(row, ['description', 'decscriptn', 'desc'], '');
        let total_amount = parseImportMoney(pickImportValue(row, ['amount', 'total_amount'], 0));
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

        await client.query(
          `INSERT INTO debts_payables (creditor_name, description, total_amount, paid_amount, balance, date, payment_method, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
          await client.query(
            `INSERT INTO petty_cash (date, type, description, ref_number, amount) 
             VALUES ($1, 'debit', $2, $3, $4)`,
            [parseImportDate(d_date), d_desc, d_ref, d_amount]
          );
        }

        if (c_date && c_amount > 0) {
          await client.query(
            `INSERT INTO petty_cash (date, type, description, ref_number, amount) 
             VALUES ($1, 'credit', $2, $3, $4)`,
            [parseImportDate(c_date), c_desc, c_ref, c_amount]
          );
        }
      }
    } else if (target === 'sales_ledger') {
      let currentCustomer = "";
      let currentPlot = "";
      let currentAmount = 0;
      
      for (const row of data) {
        let name = String(pickImportValue(row, ['customer_name', 'name'], '')).trim();
        let plot = String(pickImportValue(row, ['plot_description', 'plot', 'plot_number'], '')).trim();
        let amount = parseImportMoney(pickImportValue(row, ['amount', 'total_price', 'price'], 0));
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

        let custRes = await client.query("SELECT id FROM customers WHERE name ILIKE $1", [currentCustomer]);
        let customer_id;
        if (custRes.rows.length === 0) {
          const fakeId = "MIG-" + Math.floor(100000 + Math.random() * 900000);
          const phone = "+2547" + Math.floor(10000000 + Math.random() * 90000000);
          const insRes = await client.query(
            "INSERT INTO customers (name, phone, id_number) VALUES ($1, $2, $3) RETURNING id",
            [currentCustomer, phone, fakeId]
          );
          customer_id = insRes.rows[0].id;
        } else {
          customer_id = custRes.rows[0].id;
        }

        let land_id = null;
        if (currentPlot) {
          let landRes = await client.query("SELECT id FROM lands WHERE plot_number = $1", [currentPlot]);
          if (landRes.rows.length === 0) {
            const landStatus = balance <= 0 && status.toLowerCase().includes('cleared') ? 'sold' : 'reserved';
            const insLand = await client.query(
              `INSERT INTO lands (plot_number, location, size, acquisition_type, status, total_cost, paid_amount, customer_id) 
               VALUES ($1, 'Kajiado / Kenya', '50x100', 'purchase', $2, $3, $4, $5) RETURNING id`,
              [currentPlot, landStatus, currentAmount, payment, customer_id]
            );
            land_id = insLand.rows[0].id;
          } else {
            land_id = landRes.rows[0].id;
            await client.query(
              `UPDATE lands
               SET total_cost = CASE WHEN $1::numeric > 0 THEN $1 ELSE total_cost END,
                   paid_amount = paid_amount + $2,
                   customer_id = $3,
                   status = CASE
                     WHEN paid_amount + $2 >= CASE WHEN $1::numeric > 0 THEN $1 ELSE total_cost END THEN 'sold'
                     ELSE 'reserved'
                   END
               WHERE id = $4`,
              [currentAmount, payment, customer_id, land_id]
            );
          }
        }

        let sale_id = null;
        if (land_id) {
          let saleRes = await client.query("SELECT id FROM sales WHERE land_id = $1 AND customer_id = $2", [land_id, customer_id]);
          if (saleRes.rows.length === 0) {
            const insSale = await client.query(
              "INSERT INTO sales (land_id, customer_id, total_price, paid_amount, is_approved) VALUES ($1, $2, $3, $4, TRUE) RETURNING id",
              [land_id, customer_id, currentAmount, payment]
            );
            sale_id = insSale.rows[0].id;
          } else {
            sale_id = saleRes.rows[0].id;
            await client.query(
              `UPDATE sales
               SET total_price = CASE WHEN $1::numeric > 0 THEN $1 ELSE total_price END,
                   paid_amount = paid_amount + $2
               WHERE id = $3`,
              [currentAmount, payment, sale_id]
            );
          }
        }

        if (payment > 0) {
          await client.query(
            `INSERT INTO payments (type, amount, method, category, description, reference_id, reference_type, transaction_ref, is_approved, date) 
             VALUES ('received', $1, 'bank', 'plot_installment', $2, $3, 'sale', $4, TRUE, $5)`,
            [payment, `Installment payment imported for ${currentCustomer}`, sale_id, `MIG-${Math.floor(Math.random()*100000)}`, date]
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, count: importedCount });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- NEW FINANCIAL ENTITY ENDPOINTS (DEBTS, PAYROLL, PETTY CASH) ---
app.get("/api/debts-payables", authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query("SELECT * FROM debts_payables ORDER BY date DESC, id DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/debts-payables", authenticateToken, async (req: any, res: any) => {
  const { creditor_name, description, total_amount, paid_amount, balance, date, payment_method, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO debts_payables (creditor_name, description, total_amount, paid_amount, balance, date, payment_method, status) 
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP), $7, $8) RETURNING *`,
      [creditor_name, description, parseFloat(total_amount || 0), parseFloat(paid_amount || 0), parseFloat(balance || 0), date, payment_method || 'CASH', status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/debts-payables/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { creditor_name, description, total_amount, paid_amount, date, payment_method, status } = req.body;
  const balance = parseFloat(total_amount || 0) - parseFloat(paid_amount || 0);
  try {
    const result = await pool.query(
      `UPDATE debts_payables
       SET creditor_name = $1, description = $2, total_amount = $3, paid_amount = $4, balance = $5, date = COALESCE($6, date),
           payment_method = $7, status = $8
       WHERE id = $9 RETURNING *`,
      [creditor_name, description, parseFloat(total_amount || 0), parseFloat(paid_amount || 0), balance, date, payment_method || 'CASH', status || (balance <= 0 ? 'cleared' : 'pending'), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Debt record not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/debts-payables/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM debts_payables WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Debt record not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/payroll", authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query("SELECT * FROM payroll ORDER BY reporting_date DESC, id DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll", authenticateToken, async (req: any, res: any) => {
  const { staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO payroll (staff_name, month_year, basic, commission, transport, deductions, gross_amount, net_amount, reporting_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP)) RETURNING *`,
      [staff_name, month_year, parseFloat(basic || 0), parseFloat(commission || 0), parseFloat(transport || 0), parseFloat(deductions || 0), parseFloat(gross_amount || 0), parseFloat(net_amount || 0), reporting_date]
    );
    res.status(201).json(result.rows[0]);
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
    const result = await pool.query(
      `UPDATE payroll
       SET staff_name = $1, month_year = $2, basic = $3, commission = $4, transport = $5, deductions = $6,
           gross_amount = $7, net_amount = $8, reporting_date = COALESCE($9, reporting_date)
       WHERE id = $10 RETURNING *`,
      [staff_name, month_year, parseFloat(basic || 0), parseFloat(commission || 0), parseFloat(transport || 0), parseFloat(deductions || 0), gross, net, reporting_date, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Payroll record not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/payroll/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM payroll WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Payroll record not found" });
    res.status(204).send();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/petty-cash", authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query("SELECT * FROM petty_cash ORDER BY date DESC, id DESC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/petty-cash", authenticateToken, async (req: any, res: any) => {
  const { date, type, description, ref_number, amount } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO petty_cash (date, type, description, ref_number, amount) 
       VALUES (COALESCE($1, CURRENT_TIMESTAMP), $2, $3, $4, $5) RETURNING *`,
      [date, type, description, ref_number, parseFloat(amount || 0)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/petty-cash/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { date, type, description, ref_number, amount } = req.body;
  try {
    const result = await pool.query(
      `UPDATE petty_cash SET date = COALESCE($1, date), type = $2, description = $3, ref_number = $4, amount = $5
       WHERE id = $6 RETURNING *`,
      [date, type, description, ref_number, parseFloat(amount || 0), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Petty cash record not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/petty-cash/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM petty_cash WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Petty cash record not found" });
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
      params.push(startDate);
      dateFilter += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND date <= $${params.length}`;
    }

    // Lands
    const lands = await pool.query("SELECT COUNT(*) as total, SUM(total_cost) - SUM(paid_amount) as total_debt FROM lands");
    
    // Approved Sales & Payments
    const sales = await pool.query(`SELECT COUNT(*) as total, SUM(total_price) as revenue FROM sales WHERE is_approved = TRUE ${dateFilter.replace(/date/g, 'date')}`, params);
    const payments = await pool.query(`SELECT SUM(amount) as total FROM payments WHERE is_approved = TRUE AND type = 'received' ${dateFilter.replace(/date/g, 'date')}`, params);
    
    // Approved Expenses & Property costs
    const expenses = await pool.query(`SELECT SUM(amount) as total FROM expenses WHERE is_approved = TRUE ${dateFilter.replace(/date/g, 'date')}`, params);
    const propertyCosts = await pool.query(`SELECT SUM(amount) as total FROM property_costs WHERE is_approved = TRUE ${dateFilter.replace(/date/g, 'date')}`, params);
    
    // Properties
    const properties = await pool.query("SELECT COUNT(*) as total, SUM(buying_price) - SUM(amount_paid_to_seller) as total_unpaid FROM parent_properties");

    res.json({
      landCount: parseInt(lands.rows[0].total || 0),
      landDebt: parseFloat(lands.rows[0].total_debt || 0),
      salesCount: parseInt(sales.rows[0].total || 0),
      revenue: parseFloat(sales.rows[0].revenue || 0),
      received: parseFloat(payments.rows[0].total || 0),
      expenses: parseFloat(expenses.rows[0].total || 0) + parseFloat(propertyCosts.rows[0].total || 0),
      propertyCount: parseInt(properties.rows[0].total || 0),
      propertyDebt: parseFloat(properties.rows[0].total_unpaid || 0),
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
      params.push(startDate);
      dateFilter += ` AND p.date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND p.date <= $${params.length}`;
    }

    // Subdivisions cost, customer payments, operational expenses
    // Grouped by month
    const payments = await pool.query(`
      SELECT TO_CHAR(p.date, 'Mon') as name, SUM(p.amount) as collections
      FROM payments p
      WHERE p.is_approved = TRUE AND p.type = 'received' ${dateFilter}
      GROUP BY TO_CHAR(p.date, 'Mon'), DATE_TRUNC('month', p.date)
      ORDER BY DATE_TRUNC('month', p.date)
    `, params);

    const expensesParams: any[] = [];
    let expFilter = "";
    if (startDate) {
      expensesParams.push(startDate);
      expFilter += ` AND date >= $${expensesParams.length}`;
    }
    if (endDate) {
      expensesParams.push(endDate);
      expFilter += ` AND date <= $${expensesParams.length}`;
    }

    const expenses = await pool.query(`
      SELECT TO_CHAR(date, 'Mon') as name, SUM(amount) as costs
      FROM expenses
      WHERE is_approved = TRUE ${expFilter}
      GROUP BY TO_CHAR(date, 'Mon'), DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date)
    `, expensesParams);

    const propertyCosts = await pool.query(`
      SELECT TO_CHAR(date, 'Mon') as name, SUM(amount) as costs
      FROM property_costs
      WHERE is_approved = TRUE ${expFilter}
      GROUP BY TO_CHAR(date, 'Mon'), DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date)
    `, expensesParams);

    // Merge by month
    const monthMap: { [key: string]: { name: string, sales: number, collections: number, expenses: number } } = {};
    
    // Fill empty months helper
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const m of months) {
      monthMap[m] = { name: m, sales: 0, collections: 0, expenses: 0 };
    }

    payments.rows.forEach((r: any) => {
      if (monthMap[r.name]) {
        monthMap[r.name].collections = parseFloat(r.collections || 0);
        monthMap[r.name].sales = parseFloat(r.collections || 0); // Sales indicator
      }
    });

    expenses.rows.forEach((r: any) => {
      if (monthMap[r.name]) {
        monthMap[r.name].expenses += parseFloat(r.costs || 0);
      }
    });

    propertyCosts.rows.forEach((r: any) => {
      if (monthMap[r.name]) {
        monthMap[r.name].expenses += parseFloat(r.costs || 0);
      }
    });

    const chartData = Object.values(monthMap);

    // Categories breakdown
    const categories = await pool.query(`
      SELECT category as label, SUM(amount) as value 
      FROM payments WHERE is_approved = TRUE AND type = 'received'
      GROUP BY category
    `);

    const expenseCategories = await pool.query(`
      SELECT category as label, SUM(amount) as value 
      FROM expenses WHERE is_approved = TRUE
      GROUP BY category
    `);

    const customerCount = await pool.query("SELECT COUNT(*) as total FROM customers");

    res.json({
      chartData,
      categories: categories.rows,
      expenseCategories: expenseCategories.rows,
      customerCount: parseInt(customerCount.rows[0].total || 0)
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
