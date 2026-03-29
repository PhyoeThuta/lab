const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ override: true });

const app = express();
const port = process.env.PORT || 3003;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Validation Middleware
async function validateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/auth/validate`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('Token validation error:', err.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Order database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Helper function to get user info from user-service
async function getUserInfo(userId) {
  try {
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL}/internal/users/${userId}`
    );
    return response.data.user;
  } catch (err) {
    console.error('Failed to fetch user info:', err.message);
    return null;
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

// Create order (protected)
app.post('/orders', validateToken, async (req, res) => {
  try {
    const { product_name, quantity, price } = req.body;
    const userId = req.user.userId;

    if (!product_name || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const total = quantity * price;

    // Get user info from user-service
    const userInfo = await getUserInfo(userId);

    const result = await pool.query(
      `INSERT INTO orders (user_id, product_name, quantity, price, total)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, product_name, quantity, price, total]
    );

    res.status(201).json({
      message: 'Order created successfully',
      order: result.rows[0],
      user: userInfo
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders for current user (protected)
app.get('/orders', validateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Get user info
    const userInfo = await getUserInfo(userId);

    res.json({
      orders: result.rows,
      user: userInfo
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID (protected)
app.get('/orders/:id', validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get user info
    const userInfo = await getUserInfo(userId);

    res.json({
      order: result.rows[0],
      user: userInfo
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get all orders (admin only)
app.get('/admin/orders', validateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin only)
app.patch('/orders/:id/status', validateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order status updated',
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Start server
app.listen(port, async () => {
  await initDB();
  console.log(`Order service running on port ${port}`);
});
