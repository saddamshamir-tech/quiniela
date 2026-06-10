require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./config/db');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// ============ HEALTH CHECK (público) ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ RUTAS API ============
app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
// ranking y admin comparten el mismo router, montado una sola vez en /api
// Esto expone: /api/ranking  y  /api/admin/*
app.use('/api', require('./routes/ranking'));

// ============ FRONTEND STATIC FILES ============
app.use(express.static(path.join(__dirname, '../frontend/public')));

// SPA fallback - servir index.html para todas las rutas no API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  }
});

// ============ INICIALIZACIÓN BD ============
async function initDatabase() {
  try {
    const sqlFile = path.join(__dirname, 'config/init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    await pool.query(sql);
    console.log('✅ Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('⚠️  Error al inicializar BD:', error.message);
    // No detener el servidor si la BD ya está inicializada
  }
}

// ============ CREAR ADMIN POR DEFECTO ============
async function createDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  const ADMIN_EMAIL    = 'saddam.shamir@gmail.com';
  const ADMIN_NOMBRE   = 'Saddam';
  const ADMIN_APELLIDO = 'Torres';
  const ADMIN_PASSWORD = '123456';

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (exists.rows.length > 0) {
      console.log('ℹ️  Admin principal ya existe, omitiendo creación.');
      return;
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const result = await pool.query(
      `INSERT INTO users (nombre, apellido, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id`,
      [ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_EMAIL, hash]
    );

    await pool.query(
      `INSERT INTO ranking_cache (user_id, total_points)
       VALUES ($1, 0) ON CONFLICT DO NOTHING`,
      [result.rows[0].id]
    );

    console.log(`✅ Admin creado: ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('⚠️  Error al crear admin por defecto:', error.message);
  }
}

// ============ START SERVER ============
async function startServer() {
  try {
    // Test DB connection
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL establecida.');
    
    // Init DB
    await initDatabase();

    // Crear admin por defecto si no existe
    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`🌍 Servidor corriendo en puerto ${PORT}`);
      console.log(`🏆 Quiniela Mundial FIFA 2026 lista!`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
