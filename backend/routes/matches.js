const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/matches - Obtener todos los partidos con predicciones del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { round, group_name } = req.query;
    
    let query = `
      SELECT 
        m.id, m.match_number, m.round, m.group_name,
        m.home_score, m.away_score, m.match_date, m.venue, m.city, m.status,
        ht.id as home_team_id, ht.name as home_team_name, ht.code as home_team_code, ht.flag_emoji as home_flag,
        at.id as away_team_id, at.name as away_team_name, at.code as away_team_code, at.flag_emoji as away_flag,
        p.id as prediction_id,
        p.predicted_home_score, p.predicted_away_score,
        p.points_result, p.points_exact
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
      WHERE 1=1
    `;
    
    const params = [req.user.id];
    let paramIdx = 2;

    if (round) {
      query += ` AND m.round = $${paramIdx}`;
      params.push(round);
      paramIdx++;
    }

    if (group_name) {
      query += ` AND m.group_name = $${paramIdx}`;
      params.push(group_name);
      paramIdx++;
    }

    query += ' ORDER BY m.match_date ASC, m.match_number ASC';

    const result = await pool.query(query, params);
    
    // Agregar flag de bloqueo (5 min antes del partido)
    const now = new Date();
    const matchesWithLock = result.rows.map(match => {
      const matchTime = new Date(match.match_date);
      const minutesUntilMatch = (matchTime - now) / (1000 * 60);
      return {
        ...match,
        is_locked: minutesUntilMatch <= 5 || match.status !== 'scheduled'
      };
    });

    res.json({ matches: matchesWithLock });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Error al obtener partidos.' });
  }
});

// GET /api/matches/groups - Partidos agrupados por fase
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT round, group_name
      FROM matches
      ORDER BY 
        CASE round
          WHEN 'Fase de Grupos' THEN 1
          WHEN 'Octavos de Final' THEN 2
          WHEN 'Cuartos de Final' THEN 3
          WHEN 'Semifinal' THEN 4
          WHEN 'Tercer Lugar' THEN 5
          WHEN 'Final' THEN 6
          ELSE 7
        END,
        group_name ASC
    `);
    res.json({ groups: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener grupos.' });
  }
});

// PUT /api/matches/:id/result - Admin: actualizar resultado
router.put('/:id/result', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { home_score, away_score } = req.body;

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'Se requieren home_score y away_score.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE matches SET home_score = $1, away_score = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [home_score, away_score, 'finished', id]
    );

    // Calcular puntos de predicciones
    await client.query('SELECT update_match_points($1)', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Resultado actualizado y puntos calculados correctamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update result error:', error);
    res.status(500).json({ error: 'Error al actualizar resultado: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/matches/:id/status - Admin: cambiar estado
router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['scheduled', 'live', 'finished', 'postponed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  try {
    await pool.query('UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    res.json({ message: 'Estado actualizado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado.' });
  }
});

module.exports = router;
