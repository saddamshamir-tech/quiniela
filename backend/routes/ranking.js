const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/ranking - Tabla de posiciones
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.nombre, u.apellido,
        COALESCE(r.total_points, 0) as total_points,
        COALESCE(r.correct_results, 0) as correct_results,
        COALESCE(r.exact_scores, 0) as exact_scores,
        RANK() OVER (ORDER BY COALESCE(r.total_points, 0) DESC, COALESCE(r.exact_scores, 0) DESC, COALESCE(r.correct_results, 0) DESC) as position
      FROM users u
      LEFT JOIN ranking_cache r ON r.user_id = u.id
      WHERE u.role = 'user'
      ORDER BY total_points DESC, exact_scores DESC, correct_results DESC
    `);
    
    res.json({ ranking: result.rows });
  } catch (error) {
    console.error('Ranking error:', error);
    res.status(500).json({ error: 'Error al obtener ranking.' });
  }
});

// ============ ADMIN ROUTES ============

// GET /api/admin/tokens - Ver tokens de registro
router.get('/admin/tokens', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.nombre, u.apellido, u.email
      FROM registration_tokens t
      LEFT JOIN users u ON t.used_by = u.id
      ORDER BY t.id ASC
    `);
    res.json({ tokens: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tokens.' });
  }
});

// POST /api/admin/tokens - Agregar nuevos tokens
router.post('/admin/tokens', authMiddleware, adminMiddleware, async (req, res) => {
  const { tokens } = req.body;
  
  if (!tokens || !Array.isArray(tokens)) {
    return res.status(400).json({ error: 'Se requiere array de tokens.' });
  }

  try {
    const values = tokens.map(t => `('${t.toUpperCase().substring(0, 10)}')`).join(',');
    await pool.query(`INSERT INTO registration_tokens (token) VALUES ${values} ON CONFLICT DO NOTHING`);
    res.json({ message: `${tokens.length} token(s) agregado(s).` });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar tokens.' });
  }
});

// GET /api/admin/users - Ver todos los usuarios
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.role, u.total_points, u.created_at,
             COUNT(p.id) as prediction_count
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id
      GROUP BY u.id
      ORDER BY u.total_points DESC
    `);
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

// POST /api/admin/create-admin - Crear usuario admin
router.post('/admin/create-admin', authMiddleware, adminMiddleware, async (req, res) => {
  const { nombre, apellido, email, password } = req.body;
  
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (nombre, apellido, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email',
      [nombre, apellido, email.toLowerCase(), hash, 'admin']
    );
    await pool.query('INSERT INTO ranking_cache (user_id, total_points) VALUES ($1, 0) ON CONFLICT DO NOTHING', [result.rows[0].id]);
    res.json({ message: 'Admin creado.', user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email ya registrado.' });
    }
    res.status(500).json({ error: 'Error al crear admin.' });
  }
});

// GET /api/admin/matches - Todos los partidos para admin
router.get('/admin/matches', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        ht.name as home_team_name, ht.flag_emoji as home_flag, ht.code as home_code,
        at.name as away_team_name, at.flag_emoji as away_flag, at.code as away_code,
        COUNT(p.id) as prediction_count
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN predictions p ON p.match_id = m.id
      GROUP BY m.id, ht.name, ht.flag_emoji, ht.code, at.name, at.flag_emoji, at.code
      ORDER BY m.match_date ASC
    `);
    res.json({ matches: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener partidos.' });
  }
});

module.exports = router;
