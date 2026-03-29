const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ override: true });

const app = express();
const port = process.env.PORT || 3002;

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
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        full_name VARCHAR(200),
        phone VARCHAR(50),
        address TEXT,
        avatar_url VARCHAR(500),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// Get all users (protected)
app.get('/users', validateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_profiles ORDER BY id');
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (protected)
app.get('/users/:id', validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create or update user profile (protected)
app.put('/users/:id', validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, address, avatar_url } = req.body;

    // Check if user owns this profile or is admin
    if (req.user.userId != id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, full_name, phone, address, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         full_name = $2,
         phone = $3,
         address = $4,
         avatar_url = $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, full_name, phone, address, avatar_url]
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Internal endpoint for order service to get user info
app.get('/internal/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Start server
app.listen(port, async () => {
  await initDB();
  console.log(`User service running on port ${port}`);
});
