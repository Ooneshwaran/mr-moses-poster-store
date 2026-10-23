const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const repository = require('../config/repository');
const { requireAdminAuth, JWT_SECRET } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both username and password.'
      });
    }

    const admin = await repository.getAdminByUsername(username);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Access denied.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Access denied.'
      });
    }

    // Update last login
    await repository.updateAdminLastLogin(admin.username);

    // Issue JWT
    const token = jwt.sign(
      { username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure HttpOnly cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login. Please try again.'
    });
  }
});

// GET /api/auth/me - Verify current session
router.get('/me', requireAdminAuth, async (req, res) => {
  return res.json({
    success: true,
    admin: req.admin
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// GET /api/auth/status - Returns if system has at least one admin configured
router.get('/status', async (req, res) => {
  try {
    const hasAdmin = await repository.hasAnyAdmin();
    return res.json({
      success: true,
      hasAdmin
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/init-admin - Only allowed when NO admin exists AND setup token matches
router.post('/init-admin', async (req, res) => {
  try {
    const hasAdmin = await repository.hasAnyAdmin();
    if (hasAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Administrator account already exists. Public registration is strictly prohibited.'
      });
    }

    const { username, password, setupToken } = req.body;
    const expectedToken = process.env.ADMIN_SETUP_TOKEN || 'mrmoses_init_token_2026';

    if (!setupToken || setupToken !== expectedToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin setup token. First-admin creation requires the secret token configured in .env'
      });
    }

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long.'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long for security.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await repository.createAdmin({
      username: username.trim().toLowerCase(),
      passwordHash
    });

    return res.status(201).json({
      success: true,
      message: 'First administrator account created successfully. You can now log in.'
    });
  } catch (err) {
    console.error('Init admin error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
