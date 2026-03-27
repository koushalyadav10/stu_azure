require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const { getPool } = require('./config/db');
const authRoutes    = require('./routes/auth');
const studentRoutes = require('./routes/students');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Azure/Proxy Trust Setting (CRITICAL FOR AZURE) ───────────────────
app.set('trust proxy', 1); // 🔥 IMPORTANT - Prevents proxy issues

// ─── Security Middleware ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'ui-avatars.com'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || '*']
    }
  } : false
}));

// ─── CORS (Dynamic + Azure Safe) ─────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'));
  },
  credentials: true
}));

// ─── Rate Limiting ───────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});

// ─── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Static Files ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/students', studentRoutes);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SMS API is running',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ─── SPA fallback ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ─── Start Server ────────────────────────────────────────────────────
async function startServer() {
  try {
    await getPool();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;