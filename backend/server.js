require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const pool = require('./config/db');
const fs   = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rate limiting ────────────────────────────────────────────────────────────
// express-rate-limit v7 ships as ESM with a CJS compat shim; the default
// export is the factory function, but require() may return the module object.
const _rl       = require('express-rate-limit');
const rateLimit = (typeof _rl === 'function') ? _rl : (_rl.default || _rl.rateLimit);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc:  ["'self'"],
      imgSrc:      ["'self'", "data:", "https:"],
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || true)
    : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting by path ────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api',      generalLimiter);

// ── Health check (public – used by Render) ───────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────────────────────
// Each route file does module.exports = router  (verified).
// ranking.js defines both /ranking (GET /) and /admin/* routes,
// so it is mounted once at /api to serve both prefixes.
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/matches',     require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api',             require('./routes/ranking'));   // covers /api/ranking + /api/admin/*

// ── Static frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  }
});

// ── DB initialisation ────────────────────────────────────────────────────────
async function initDatabase() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'config/init.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Base de datos inicializada correctamente.');
  } catch (err) {
    console.error('⚠️  Error al inicializar BD:', err.message);
  }
}

async function createDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  const ADMIN_EMAIL    = 'saddam.shamir@gmail.com';
  const ADMIN_NOMBRE   = 'Saddam';
  const ADMIN_APELLIDO = 'Torres';
  const ADMIN_PASSWORD = '123456';

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
    if (exists.rows.length > 0) {
      console.log('ℹ️  Admin ya existe, omitiendo creación.');
      return;
    }
    const hash   = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const result = await pool.query(
      `INSERT INTO users (nombre, apellido, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'admin') RETURNING id`,
      [ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_EMAIL, hash]
    );
    await pool.query(
      `INSERT INTO ranking_cache (user_id, total_points) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
      [result.rows[0].id]
    );
    console.log(`✅ Admin creado: ${ADMIN_EMAIL}`);
  } catch (err) {
    console.error('⚠️  Error al crear admin:', err.message);
  }
}

// ── Start ────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL establecida.');
    await initDatabase();
    await createDefaultAdmin();
    app.listen(PORT, () => {
      console.log(`🌍 Servidor en puerto ${PORT}`);
      console.log(`🏆 Quiniela Mundial FIFA 2026 lista!`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar servidor:', err);
    process.exit(1);
  }
}

startServer();
module.exports = app;

// ── Startup route validation (dev helper) ────────────────────────────────────
// Uncomment to debug undefined-middleware errors:
// ['./routes/auth','./routes/matches','./routes/predictions','./routes/ranking']
//   .forEach(p => { const r = require(p); console.log(p, typeof r); });
