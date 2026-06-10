const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// POST /api/predictions - Crear o actualizar predicción
router.post('/', authMiddleware, async (req, res) => {
  const { match_id, predicted_home_score, predicted_away_score } = req.body;

  if (!match_id || predicted_home_score === undefined || predicted_away_score === undefined) {
    return res.status(400).json({ error: 'Se requieren match_id, predicted_home_score y predicted_away_score.' });
  }

  if (predicted_home_score < 0 || predicted_away_score < 0 || 
      predicted_home_score > 20 || predicted_away_score > 20) {
    return res.status(400).json({ error: 'Marcador inválido (0-20).' });
  }

  try {
    // Verificar que el partido existe y está disponible
    const matchResult = await pool.query(
      'SELECT * FROM matches WHERE id = $1',
      [match_id]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado.' });
    }

    const match = matchResult.rows[0];

    // Verificar si el partido está bloqueado (5 min antes)
    const now = new Date();
    const matchTime = new Date(match.match_date);
    const minutesUntilMatch = (matchTime - now) / (1000 * 60);

    if (minutesUntilMatch <= 5) {
      return res.status(403).json({ 
        error: 'Las predicciones para este partido están bloqueadas. El partido comienza en menos de 5 minutos.' 
      });
    }

    if (match.status !== 'scheduled') {
      return res.status(403).json({ error: 'No se pueden hacer predicciones para partidos en curso o finalizados.' });
    }

    // Determinar ganador predicho
    let predicted_winner;
    if (predicted_home_score > predicted_away_score) {
      predicted_winner = 'home';
    } else if (predicted_home_score < predicted_away_score) {
      predicted_winner = 'away';
    } else {
      predicted_winner = 'draw';
    }

    // Insertar o actualizar predicción
    const result = await pool.query(`
      INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score, predicted_winner, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, match_id) 
      DO UPDATE SET 
        predicted_home_score = $3,
        predicted_away_score = $4,
        predicted_winner = $5,
        updated_at = NOW()
      RETURNING *
    `, [req.user.id, match_id, predicted_home_score, predicted_away_score, predicted_winner]);

    res.json({ 
      message: '¡Predicción guardada exitosamente!',
      prediction: result.rows[0]
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Error al guardar predicción.' });
  }
});

// GET /api/predictions/my - Predicciones del usuario actual
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        m.match_date, m.status, m.home_score, m.away_score,
        ht.name as home_team, ht.flag_emoji as home_flag,
        at.name as away_team, at.flag_emoji as away_flag
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE p.user_id = $1
      ORDER BY m.match_date ASC
    `, [req.user.id]);

    res.json({ predictions: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener predicciones.' });
  }
});

// GET /api/predictions/match/:matchId - Predicciones de un partido (solo después de jugado)
router.get('/match/:matchId', authMiddleware, async (req, res) => {
  const { matchId } = req.params;
  
  try {
    const matchResult = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partido no encontrado.' });
    }
    
    const match = matchResult.rows[0];
    
    // Solo mostrar predicciones de otros si el partido ya terminó
    if (match.status !== 'finished') {
      return res.status(403).json({ error: 'Las predicciones solo son visibles después de que el partido termine.' });
    }

    const result = await pool.query(`
      SELECT 
        u.nombre, u.apellido,
        p.predicted_home_score, p.predicted_away_score,
        p.points_result, p.points_exact
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      WHERE p.match_id = $1
      ORDER BY (p.points_result + p.points_exact) DESC, u.apellido ASC
    `, [matchId]);

    res.json({ predictions: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener predicciones.' });
  }
});

module.exports = router;
