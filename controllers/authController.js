const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, executeQuery } = require('../config/db');

/** POST /api/auth/signup */
async function signup(req, res) {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    // Only allow 'user' role from signup; admins are created via DB directly
    const safeRole = role === 'admin' ? 'user' : (role || 'user');

    // Check for duplicate username or email
    const existing = await executeQuery(
      `SELECT id FROM Users WHERE username = @username OR email = @email`,
      {
        username: { type: sql.VarChar(50), value: username },
        email: { type: sql.VarChar(100), value: email || null },
      }
    );

    if (existing.recordset.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username or email already exists.' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await executeQuery(
      `INSERT INTO Users (username, email, password, role)
       OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.role
       VALUES (@username, @email, @password, @role)`,
      {
        username: { type: sql.VarChar(50), value: username },
        email: { type: sql.VarChar(100), value: email || null },
        password: { type: sql.VarChar(255), value: hashedPassword },
        role: { type: sql.VarChar(20), value: safeRole },
      }
    );

    const user = result.recordset[0];
    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role 
        }, 
        token 
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup.' 
    });
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const result = await executeQuery(
      `SELECT id, username, email, password, role FROM Users WHERE username = @username`,
      { 
        username: { type: sql.VarChar(50), value: username } 
      }
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password.' 
      });
    }

    const user = result.recordset[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password.' 
      });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role 
        },
        token,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login.' 
    });
  }
}

/** GET /api/auth/me — returns logged-in user profile */
async function getMe(req, res) {
  try {
    const result = await executeQuery(
      `SELECT id, username, email, role, created_at FROM Users WHERE id = @id`,
      { 
        id: { type: sql.Int, value: req.user.id } 
      }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    res.json({ 
      success: true, 
      data: result.recordset[0] 
    });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
}

// Helper function to sign JWT token
function signToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { signup, login, getMe };