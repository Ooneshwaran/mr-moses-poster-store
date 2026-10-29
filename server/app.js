const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const { apiLimiter } = require('./middleware/rateLimiter');
const { connectDB, getMongoStatus } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const collectionRoutes = require('./routes/collection.routes');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static public directory & persistent uploads directory
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ensure database connection is ready for API routes (essential for Vercel serverless)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
  } catch (dbErr) {
    console.warn('[Database] API connection warning:', dbErr.message);
  }
  next();
});

// Rate-limited API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/orders', orderRoutes);

// System info endpoint
app.get('/api/system-status', (req, res) => {
  const dbStatus = getMongoStatus();
  return res.json({
    success: true,
    store: {
      name: process.env.STORE_NAME || 'Mr Moses Poster Store',
      tagline: process.env.STORE_TAGLINE || 'Your Moments, Our Frames',
      whatsapp: process.env.WHATSAPP_NUMBER || '8754126367'
    },
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Admin dashboard direct route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Catch-all route to serve the customer website
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error.'
  });
});

module.exports = app;
