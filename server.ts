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
const PORT = 3000;
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

app.put("/api/lands/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { plot_number, location, size, total_cost, title_deed_status, title_deed_url, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lands SET plot_number = $1, location = $2, size = $3, total_cost = $4, title_deed_status = $5, title_deed_url = $6, status = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [plot_number, location, size, total_cost, title_deed_status, title_deed_url, status, id]
    );
    res.json(result.rows[0]);
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
  app.get("/api/inventory", authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM inventory ORDER BY item_name ASC`);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/inventory", authenticateToken, async (req, res) => {
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

  app.put("/api/inventory/:id", authenticateToken, async (req, res) => {
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

  app.delete("/api/inventory/:id", authenticateToken, async (req, res) => {
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
app.post("/api/migrations/import", authenticateToken, async (req, res) => {
  const { target, data } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data. Expected an array of records." });
  }

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
        const name = row.name || row.Name || row.client_name || '';
        const email = row.email || row.Email || null;
        const phone = String(row.phone || row.Phone || row.telephone || row.contact || '');
        const id_number = String(row.id_number || row.id || row.ID || row.passport || row.Passport || row.id_passport || '');
        
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
        const name = row.name || row.Name || row.property_name || '';
        const location = row.location || row.Location || '';
        const total_size = String(row.total_size || row.size || row.acres || '0');
        const buying_price = parseFloat(row.buying_price || row.price || row.cost || '0');
        const amount_paid_to_seller = parseFloat(row.amount_paid || row.paid || '0');
        const notes = row.notes || row.Notes || '';

        if (!name || !location) continue;

        await client.query(
          `INSERT INTO parent_properties (name, location, total_size, ownership_status, buying_price, amount_paid_to_seller, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [name, location, total_size, amount_paid_to_seller >= buying_price ? 'fully_owned' : 'partial', buying_price, amount_paid_to_seller, notes]
        );
      }
    } else if (target === 'lands') {
      for (const row of data) {
        const plot_number = String(row.plot_number || row.plot || row.Plot || row.number || '');
        const location = row.location || row.Location || '';
        const size = String(row.size || row.Size || '50x100');
        const total_cost = parseFloat(row.total_cost || row.price || row.cost || row.selling_price || '0');
        const paid_amount = parseFloat(row.paid_amount || row.paid || '0');
        const status = row.status || row.Status || (paid_amount >= total_cost ? 'sold' : paid_amount > 0 ? 'reserved' : 'available');
        const title_deed_status = row.title_deed_status || row.deed || 'pending';
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
        const staff_name = row.staff_name || row.NAME || row.Name || row.name || '';
        if (!staff_name || staff_name.toUpperCase() === 'TOTAL' || staff_name.toUpperCase().includes('RAYBANN')) continue;
        const month_year = row.month_year || 'August 2025';
        const basic = parseFloat(row.basic || row.BASIC || '0');
        const commission = parseFloat(row.commission || row.COMMISSION || '0');
        const transport = parseFloat(row.transport || row.TRANSPORT || '0');
        const deductions = parseFloat(row.deductions || row.DEDUCTIONS || '0');
        const gross_amount = parseFloat(row.gross_amount || row.gross || row.GROSS || '0');
        const net_amount = parseFloat(row.net_amount || row.net || row.NET || '0');
        let reporting_date = row.reporting_date || row['REPORTING DATE'] || row.date || new Date();

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
        let creditor_name = row.DEBT || row.name || row.Name || row.creditor || '';
        let description = row.description || row.decscriptn || row.desc || '';
        let total_amount = parseFloat(row.AMOUNT || row.amount || '0');
        const paid_amount = parseFloat(row.PAID || row.paid || '0');
        const date = row.DATE || row.date || new Date();
        const payment_method = row['MODE(FROM)'] || row.mode || row.method || 'CASH';
        const balance = parseFloat(row.BALANCE || row.balance || '0');

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
        const d_date = row.date_debit || row.Date || row.date || null;
        const d_desc = row.desc_debit || row.Description || row.description || '';
        const d_ref = row.ref_debit || row.CBN || '';
        const d_amount = parseFloat(row.amount_debit || row.Amount || '0');

        const c_date = row.date_credit || row.Date_1 || row.date || null;
        const c_desc = row.desc_credit || row.Description_1 || '';
        const c_ref = row.ref_credit || row.VN || '';
        const c_amount = parseFloat(row.amount_credit || row.Amount_1 || '0');

        if (d_date && d_amount > 0) {
          await client.query(
            `INSERT INTO petty_cash (date, type, description, ref_number, amount) 
             VALUES ($1, 'debit', $2, $3, $4)`,
            [d_date, d_desc, d_ref, d_amount]
          );
        }

        if (c_date && c_amount > 0) {
          await client.query(
            `INSERT INTO petty_cash (date, type, description, ref_number, amount) 
             VALUES ($1, 'credit', $2, $3, $4)`,
            [c_date, c_desc, c_ref, c_amount]
          );
        }
      }
    } else if (target === 'sales_ledger') {
      let currentCustomer = "";
      let currentPlot = "";
      let currentAmount = 0;
      
      for (const row of data) {
        let name = row['CUSTOMER NAME'] || row.customer_name || row.Name || row.name || '';
        let plot = row['PLOT DESCRIPTION'] || row.plot_description || row.plot || '';
        let amount = parseFloat(row.AMOUNT || row.amount || '0');
        const payment = parseFloat(row['ACTUAL PAYMENT'] || row.actual_payment || row.paid || '0');
        const date = row.DATE || row.date || new Date();
        const status = row['STATUS/TOTAL PAID'] || row.status || '';
        const balance = parseFloat(row['BALANCE(C-F)'] || row.balance || '0');

        name = String(name).trim();
        plot = String(plot).trim();

        if (name && name !== 'undefined' && name !== '') {
          currentCustomer = name;
          currentPlot = plot;
          currentAmount = amount;
        }

        if (!currentCustomer) continue;

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
            const insLand = await client.query(
              `INSERT INTO lands (plot_number, location, size, acquisition_type, status, total_cost, paid_amount, customer_id) 
               VALUES ($1, 'Kajiado / Kenya', '50x100', 'purchase', 'reserved', $2, $3, $4) RETURNING id`,
              [currentPlot, currentAmount, payment, customer_id]
            );
            land_id = insLand.rows[0].id;
          } else {
            land_id = landRes.rows[0].id;
            await client.query(
              "UPDATE lands SET paid_amount = paid_amount + $1, customer_id = $2 WHERE id = $3",
              [payment, customer_id, land_id]
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
            await client.query("UPDATE sales SET paid_amount = paid_amount + $1 WHERE id = $2", [payment, sale_id]);
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
