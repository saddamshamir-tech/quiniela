-- ============================================
-- QUINIELA MUNDIAL FIFA 2026
-- Script de inicialización de base de datos
-- v3 - Fully idempotent, safe for re-runs
-- ============================================

-- Tabla de tokens de registro (pre-autorizados por admin)
CREATE TABLE IF NOT EXISTS registration_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(10) NOT NULL UNIQUE,
    used BOOLEAN DEFAULT FALSE,
    used_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de selecciones/equipos
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(3) NOT NULL,
    flag_emoji TEXT,
    group_name VARCHAR(5),
    confederation VARCHAR(20)
);

-- Tabla de partidos
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    match_number INTEGER,
    round VARCHAR(50) NOT NULL,
    group_name VARCHAR(5),
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    home_score INTEGER,
    away_score INTEGER,
    match_date TIMESTAMP NOT NULL,
    venue VARCHAR(200),
    city VARCHAR(100),
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de predicciones de usuarios
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    predicted_home_score INTEGER,
    predicted_away_score INTEGER,
    predicted_winner VARCHAR(10),
    points_result INTEGER DEFAULT 0,
    points_exact INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- Tabla de ranking (vista materializada / actualización periódica)
CREATE TABLE IF NOT EXISTS ranking_cache (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    total_points INTEGER DEFAULT 0,
    correct_results INTEGER DEFAULT 0,
    exact_scores INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CONSTRAINTS ÚNICOS (idempotentes)
-- Se agregan solo si no existen, para que el
-- script sea seguro en re-ejecuciones
-- ============================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'teams_code_key' AND conrelid = 'teams'::regclass
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT teams_code_key UNIQUE (code);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'matches_match_number_key' AND conrelid = 'matches'::regclass
    ) THEN
        ALTER TABLE matches ADD CONSTRAINT matches_match_number_key UNIQUE (match_number);
    END IF;
END $$;

-- Ampliar flag_emoji si era VARCHAR(10) en una BD preexistente
DO $$ BEGIN
    ALTER TABLE teams ALTER COLUMN flag_emoji TYPE TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ============================================
-- TOKENS DE REGISTRO
-- ============================================
INSERT INTO registration_tokens (token) VALUES
('1926'), ('2026'), ('FIFA1'), ('GOL1'), ('MX26'), ('USA1'),
('CAN1'), ('4321'), ('9876'), ('1234'), ('5678'), ('PASS'),
('QUINI'), ('2626'), ('WORLD'), ('CUP26'), ('FTBL'), ('3333'),
('7777'), ('8888'), ('ADMIN'), ('TEST'), ('BETA'), ('JOIN'),
('PLAY'), ('LIVE'), ('GOAL'), ('WIN2'), ('FANS'), ('CLUB')
ON CONFLICT (token) DO NOTHING;

-- ============================================
-- EQUIPOS - FIFA WORLD CUP 2026
-- ============================================
INSERT INTO teams (name, code, flag_emoji, group_name, confederation) VALUES
-- Grupo A
('México', 'MEX', '🇲🇽', 'A', 'CONCACAF'),
('Polonia', 'POL', '🇵🇱', 'A', 'UEFA'),
('Arabia Saudita', 'KSA', '🇸🇦', 'A', 'AFC'),
('Argentina', 'ARG', '🇦🇷', 'A', 'CONMEBOL'),
-- Grupo B
('Holanda', 'NED', '🇳🇱', 'B', 'UEFA'),
('Senegal', 'SEN', '🇸🇳', 'B', 'CAF'),
('Ecuador', 'ECU', '🇪🇨', 'B', 'CONMEBOL'),
('Catar', 'QAT', '🇶🇦', 'B', 'AFC'),
-- Grupo C
('Estados Unidos', 'USA', '🇺🇸', 'C', 'CONCACAF'),
('Inglaterra', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'C', 'UEFA'),
('Irán', 'IRN', '🇮🇷', 'C', 'AFC'),
('Gales', 'WAL', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'C', 'UEFA'),
-- Grupo D
('Francia', 'FRA', '🇫🇷', 'D', 'UEFA'),
('Australia', 'AUS', '🇦🇺', 'D', 'AFC'),
('Dinamarca', 'DEN', '🇩🇰', 'D', 'UEFA'),
('Túnez', 'TUN', '🇹🇳', 'D', 'CAF'),
-- Grupo E
('España', 'ESP', '🇪🇸', 'E', 'UEFA'),
('Costa Rica', 'CRC', '🇨🇷', 'E', 'CONCACAF'),
('Alemania', 'GER', '🇩🇪', 'E', 'UEFA'),
('Japón', 'JPN', '🇯🇵', 'E', 'AFC'),
-- Grupo F
('Bélgica', 'BEL', '🇧🇪', 'F', 'UEFA'),
('Canadá', 'CAN', '🇨🇦', 'F', 'CONCACAF'),
('Marruecos', 'MAR', '🇲🇦', 'F', 'CAF'),
('Croacia', 'CRO', '🇭🇷', 'F', 'UEFA'),
-- Grupo G
('Brasil', 'BRA', '🇧🇷', 'G', 'CONMEBOL'),
('Serbia', 'SRB', '🇷🇸', 'G', 'UEFA'),
('Suiza', 'SUI', '🇨🇭', 'G', 'UEFA'),
('Camerún', 'CMR', '🇨🇲', 'G', 'CAF'),
-- Grupo H
('Portugal', 'POR', '🇵🇹', 'H', 'UEFA'),
('Ghana', 'GHA', '🇬🇭', 'H', 'CAF'),
('Uruguay', 'URU', '🇺🇾', 'H', 'CONMEBOL'),
('Corea del Sur', 'KOR', '🇰🇷', 'H', 'AFC'),
-- Grupo I
('Colombia', 'COL', '🇨🇴', 'I', 'CONMEBOL'),
('Venezuela', 'VEN', '🇻🇪', 'I', 'CONMEBOL'),
('Bolivia', 'BOL', '🇧🇴', 'I', 'CONMEBOL'),
('Rumania', 'ROU', '🇷🇴', 'I', 'UEFA'),
-- Grupo J
('Chile', 'CHI', '🇨🇱', 'J', 'CONMEBOL'),
('Perú', 'PER', '🇵🇪', 'J', 'CONMEBOL'),
('Paraguay', 'PAR', '🇵🇾', 'J', 'CONMEBOL'),
('Nueva Zelanda', 'NZL', '🇳🇿', 'J', 'OFC'),
-- Grupo K
('Nigeria', 'NGA', '🇳🇬', 'K', 'CAF'),
('Turquía', 'TUR', '🇹🇷', 'K', 'UEFA'),
('Costa de Marfil', 'CIV', '🇨🇮', 'K', 'CAF'),
('Eslovenia', 'SVN', '🇸🇮', 'K', 'UEFA'),
-- Grupo L
('Austria', 'AUT', '🇦🇹', 'L', 'UEFA'),
('Grecia', 'GRE', '🇬🇷', 'L', 'UEFA'),
('Sudáfrica', 'RSA', '🇿🇦', 'L', 'CAF'),
('Irlanda', 'IRL', '🇮🇪', 'L', 'UEFA')
ON CONFLICT ON CONSTRAINT teams_code_key DO NOTHING;

-- ============================================
-- PARTIDOS - FASE DE GRUPOS FIFA 2026
-- Horarios en UTC-6 (Hora Centro América / México)
-- ============================================

-- GRUPO A
INSERT INTO matches (match_number, round, group_name, home_team_id, away_team_id, match_date, venue, city) VALUES
(1, 'Fase de Grupos', 'A', (SELECT id FROM teams WHERE code='MEX'), (SELECT id FROM teams WHERE code='POL'), '2026-06-11 17:00:00', 'Estadio Azteca', 'Ciudad de México'),
(2, 'Fase de Grupos', 'A', (SELECT id FROM teams WHERE code='ARG'), (SELECT id FROM teams WHERE code='KSA'), '2026-06-11 20:00:00', 'SoFi Stadium', 'Los Ángeles'),
(3, 'Fase de Grupos', 'A', (SELECT id FROM teams WHERE code='POL'), (SELECT id FROM teams WHERE code='KSA'), '2026-06-15 14:00:00', 'Estadio Azteca', 'Ciudad de México'),
(4, 'Fase de Grupos', 'A', (SELECT id FROM teams WHERE code='ARG'), (SELECT id FROM teams WHERE code='MEX'), '2026-06-15 20:00:00', 'SoFi Stadium', 'Los Ángeles'),
(5, 'Fase de Grupos', 'A', (SELECT id FROM teams WHERE code='POL'), (SELECT id FROM teams WHERE code='ARG'), '2026-06-19 19:00:00', 'Rose Bowl', 'Los Ángeles'),
(6, 'Fase de Grupos', 'A', (SELECT id FROM teams WHERE code='MEX'), (SELECT id FROM teams WHERE code='KSA'), '2026-06-19 19:00:00', 'Estadio Azteca', 'Ciudad de México'),

-- GRUPO B
(7, 'Fase de Grupos', 'B', (SELECT id FROM teams WHERE code='NED'), (SELECT id FROM teams WHERE code='SEN'), '2026-06-12 14:00:00', 'MetLife Stadium', 'Nueva York'),
(8, 'Fase de Grupos', 'B', (SELECT id FROM teams WHERE code='ECU'), (SELECT id FROM teams WHERE code='QAT'), '2026-06-12 17:00:00', 'AT&T Stadium', 'Dallas'),
(9, 'Fase de Grupos', 'B', (SELECT id FROM teams WHERE code='SEN'), (SELECT id FROM teams WHERE code='QAT'), '2026-06-16 14:00:00', 'Levi''s Stadium', 'San Francisco'),
(10, 'Fase de Grupos', 'B', (SELECT id FROM teams WHERE code='NED'), (SELECT id FROM teams WHERE code='ECU'), '2026-06-16 17:00:00', 'MetLife Stadium', 'Nueva York'),
(11, 'Fase de Grupos', 'B', (SELECT id FROM teams WHERE code='QAT'), (SELECT id FROM teams WHERE code='NED'), '2026-06-20 19:00:00', 'AT&T Stadium', 'Dallas'),
(12, 'Fase de Grupos', 'B', (SELECT id FROM teams WHERE code='SEN'), (SELECT id FROM teams WHERE code='ECU'), '2026-06-20 19:00:00', 'Levi''s Stadium', 'San Francisco'),

-- GRUPO C
(13, 'Fase de Grupos', 'C', (SELECT id FROM teams WHERE code='USA'), (SELECT id FROM teams WHERE code='WAL'), '2026-06-12 20:00:00', 'MetLife Stadium', 'Nueva York'),
(14, 'Fase de Grupos', 'C', (SELECT id FROM teams WHERE code='ENG'), (SELECT id FROM teams WHERE code='IRN'), '2026-06-12 14:00:00', 'SoFi Stadium', 'Los Ángeles'),
(15, 'Fase de Grupos', 'C', (SELECT id FROM teams WHERE code='WAL'), (SELECT id FROM teams WHERE code='IRN'), '2026-06-16 14:00:00', 'Ahmad Bin Ali Stadium', 'Al Rayyan'),
(16, 'Fase de Grupos', 'C', (SELECT id FROM teams WHERE code='ENG'), (SELECT id FROM teams WHERE code='USA'), '2026-06-16 20:00:00', 'MetLife Stadium', 'Nueva York'),
(17, 'Fase de Grupos', 'C', (SELECT id FROM teams WHERE code='WAL'), (SELECT id FROM teams WHERE code='ENG'), '2026-06-21 19:00:00', 'Rose Bowl', 'Los Ángeles'),
(18, 'Fase de Grupos', 'C', (SELECT id FROM teams WHERE code='IRN'), (SELECT id FROM teams WHERE code='USA'), '2026-06-21 19:00:00', 'AT&T Stadium', 'Dallas'),

-- GRUPO D
(19, 'Fase de Grupos', 'D', (SELECT id FROM teams WHERE code='FRA'), (SELECT id FROM teams WHERE code='AUS'), '2026-06-13 14:00:00', 'BC Place', 'Vancouver'),
(20, 'Fase de Grupos', 'D', (SELECT id FROM teams WHERE code='DEN'), (SELECT id FROM teams WHERE code='TUN'), '2026-06-13 17:00:00', 'BMO Field', 'Toronto'),
(21, 'Fase de Grupos', 'D', (SELECT id FROM teams WHERE code='AUS'), (SELECT id FROM teams WHERE code='TUN'), '2026-06-17 14:00:00', 'BC Place', 'Vancouver'),
(22, 'Fase de Grupos', 'D', (SELECT id FROM teams WHERE code='FRA'), (SELECT id FROM teams WHERE code='DEN'), '2026-06-17 20:00:00', 'BMO Field', 'Toronto'),
(23, 'Fase de Grupos', 'D', (SELECT id FROM teams WHERE code='AUS'), (SELECT id FROM teams WHERE code='DEN'), '2026-06-22 19:00:00', 'Lumen Field', 'Seattle'),
(24, 'Fase de Grupos', 'D', (SELECT id FROM teams WHERE code='TUN'), (SELECT id FROM teams WHERE code='FRA'), '2026-06-22 19:00:00', 'BC Place', 'Vancouver'),

-- GRUPO E
(25, 'Fase de Grupos', 'E', (SELECT id FROM teams WHERE code='ESP'), (SELECT id FROM teams WHERE code='CRC'), '2026-06-13 14:00:00', 'MetLife Stadium', 'Nueva York'),
(26, 'Fase de Grupos', 'E', (SELECT id FROM teams WHERE code='GER'), (SELECT id FROM teams WHERE code='JPN'), '2026-06-13 20:00:00', 'Gillette Stadium', 'Boston'),
(27, 'Fase de Grupos', 'E', (SELECT id FROM teams WHERE code='CRC'), (SELECT id FROM teams WHERE code='JPN'), '2026-06-17 17:00:00', 'Estadio Azteca', 'Ciudad de México'),
(28, 'Fase de Grupos', 'E', (SELECT id FROM teams WHERE code='ESP'), (SELECT id FROM teams WHERE code='GER'), '2026-06-17 20:00:00', 'MetLife Stadium', 'Nueva York'),
(29, 'Fase de Grupos', 'E', (SELECT id FROM teams WHERE code='JPN'), (SELECT id FROM teams WHERE code='ESP'), '2026-06-22 19:00:00', 'AT&T Stadium', 'Dallas'),
(30, 'Fase de Grupos', 'E', (SELECT id FROM teams WHERE code='CRC'), (SELECT id FROM teams WHERE code='GER'), '2026-06-22 19:00:00', 'Estadio Azteca', 'Ciudad de México'),

-- GRUPO F
(31, 'Fase de Grupos', 'F', (SELECT id FROM teams WHERE code='BEL'), (SELECT id FROM teams WHERE code='CAN'), '2026-06-14 14:00:00', 'Lincoln Financial Field', 'Filadelfia'),
(32, 'Fase de Grupos', 'F', (SELECT id FROM teams WHERE code='MAR'), (SELECT id FROM teams WHERE code='CRO'), '2026-06-14 17:00:00', 'SoFi Stadium', 'Los Ángeles'),
(33, 'Fase de Grupos', 'F', (SELECT id FROM teams WHERE code='BEL'), (SELECT id FROM teams WHERE code='MAR'), '2026-06-18 14:00:00', 'Lincoln Financial Field', 'Filadelfia'),
(34, 'Fase de Grupos', 'F', (SELECT id FROM teams WHERE code='CAN'), (SELECT id FROM teams WHERE code='CRO'), '2026-06-18 17:00:00', 'BC Place', 'Vancouver'),
(35, 'Fase de Grupos', 'F', (SELECT id FROM teams WHERE code='MAR'), (SELECT id FROM teams WHERE code='CAN'), '2026-06-23 19:00:00', 'Gillette Stadium', 'Boston'),
(36, 'Fase de Grupos', 'F', (SELECT id FROM teams WHERE code='CRO'), (SELECT id FROM teams WHERE code='BEL'), '2026-06-23 19:00:00', 'Rose Bowl', 'Los Ángeles'),

-- GRUPO G
(37, 'Fase de Grupos', 'G', (SELECT id FROM teams WHERE code='BRA'), (SELECT id FROM teams WHERE code='SRB'), '2026-06-14 14:00:00', 'Lumen Field', 'Seattle'),
(38, 'Fase de Grupos', 'G', (SELECT id FROM teams WHERE code='SUI'), (SELECT id FROM teams WHERE code='CMR'), '2026-06-14 17:00:00', 'AT&T Stadium', 'Dallas'),
(39, 'Fase de Grupos', 'G', (SELECT id FROM teams WHERE code='SRB'), (SELECT id FROM teams WHERE code='CMR'), '2026-06-18 14:00:00', 'Levi''s Stadium', 'San Francisco'),
(40, 'Fase de Grupos', 'G', (SELECT id FROM teams WHERE code='BRA'), (SELECT id FROM teams WHERE code='SUI'), '2026-06-18 17:00:00', 'Lumen Field', 'Seattle'),
(41, 'Fase de Grupos', 'G', (SELECT id FROM teams WHERE code='CMR'), (SELECT id FROM teams WHERE code='BRA'), '2026-06-23 19:00:00', 'MetLife Stadium', 'Nueva York'),
(42, 'Fase de Grupos', 'G', (SELECT id FROM teams WHERE code='SRB'), (SELECT id FROM teams WHERE code='SUI'), '2026-06-23 19:00:00', 'Gillette Stadium', 'Boston'),

-- GRUPO H
(43, 'Fase de Grupos', 'H', (SELECT id FROM teams WHERE code='POR'), (SELECT id FROM teams WHERE code='GHA'), '2026-06-15 14:00:00', 'Gillette Stadium', 'Boston'),
(44, 'Fase de Grupos', 'H', (SELECT id FROM teams WHERE code='URU'), (SELECT id FROM teams WHERE code='KOR'), '2026-06-15 17:00:00', 'Arrowhead Stadium', 'Kansas City'),
(45, 'Fase de Grupos', 'H', (SELECT id FROM teams WHERE code='GHA'), (SELECT id FROM teams WHERE code='KOR'), '2026-06-19 14:00:00', 'Arrowhead Stadium', 'Kansas City'),
(46, 'Fase de Grupos', 'H', (SELECT id FROM teams WHERE code='POR'), (SELECT id FROM teams WHERE code='URU'), '2026-06-19 20:00:00', 'Gillette Stadium', 'Boston'),
(47, 'Fase de Grupos', 'H', (SELECT id FROM teams WHERE code='GHA'), (SELECT id FROM teams WHERE code='POR'), '2026-06-24 19:00:00', 'Lincoln Financial Field', 'Filadelfia'),
(48, 'Fase de Grupos', 'H', (SELECT id FROM teams WHERE code='KOR'), (SELECT id FROM teams WHERE code='URU'), '2026-06-24 19:00:00', 'SoFi Stadium', 'Los Ángeles'),

-- GRUPO I
(49, 'Fase de Grupos', 'I', (SELECT id FROM teams WHERE code='COL'), (SELECT id FROM teams WHERE code='VEN'), '2026-06-15 14:00:00', 'MetLife Stadium', 'Nueva York'),
(50, 'Fase de Grupos', 'I', (SELECT id FROM teams WHERE code='BOL'), (SELECT id FROM teams WHERE code='ROU'), '2026-06-15 17:00:00', 'Levi''s Stadium', 'San Francisco'),
(51, 'Fase de Grupos', 'I', (SELECT id FROM teams WHERE code='VEN'), (SELECT id FROM teams WHERE code='ROU'), '2026-06-19 14:00:00', 'MetLife Stadium', 'Nueva York'),
(52, 'Fase de Grupos', 'I', (SELECT id FROM teams WHERE code='COL'), (SELECT id FROM teams WHERE code='BOL'), '2026-06-19 17:00:00', 'AT&T Stadium', 'Dallas'),
(53, 'Fase de Grupos', 'I', (SELECT id FROM teams WHERE code='VEN'), (SELECT id FROM teams WHERE code='COL'), '2026-06-24 19:00:00', 'Estadio Azteca', 'Ciudad de México'),
(54, 'Fase de Grupos', 'I', (SELECT id FROM teams WHERE code='ROU'), (SELECT id FROM teams WHERE code='BOL'), '2026-06-24 19:00:00', 'BC Place', 'Vancouver'),

-- GRUPO J
(55, 'Fase de Grupos', 'J', (SELECT id FROM teams WHERE code='CHI'), (SELECT id FROM teams WHERE code='PER'), '2026-06-16 14:00:00', 'Arrowhead Stadium', 'Kansas City'),
(56, 'Fase de Grupos', 'J', (SELECT id FROM teams WHERE code='PAR'), (SELECT id FROM teams WHERE code='NZL'), '2026-06-16 17:00:00', 'Lumen Field', 'Seattle'),
(57, 'Fase de Grupos', 'J', (SELECT id FROM teams WHERE code='PER'), (SELECT id FROM teams WHERE code='NZL'), '2026-06-20 14:00:00', 'Lumen Field', 'Seattle'),
(58, 'Fase de Grupos', 'J', (SELECT id FROM teams WHERE code='CHI'), (SELECT id FROM teams WHERE code='PAR'), '2026-06-20 17:00:00', 'Arrowhead Stadium', 'Kansas City'),
(59, 'Fase de Grupos', 'J', (SELECT id FROM teams WHERE code='NZL'), (SELECT id FROM teams WHERE code='CHI'), '2026-06-25 19:00:00', 'BMO Field', 'Toronto'),
(60, 'Fase de Grupos', 'J', (SELECT id FROM teams WHERE code='PER'), (SELECT id FROM teams WHERE code='PAR'), '2026-06-25 19:00:00', 'Lincoln Financial Field', 'Filadelfia'),

-- GRUPO K
(61, 'Fase de Grupos', 'K', (SELECT id FROM teams WHERE code='NGA'), (SELECT id FROM teams WHERE code='TUR'), '2026-06-16 14:00:00', 'SoFi Stadium', 'Los Ángeles'),
(62, 'Fase de Grupos', 'K', (SELECT id FROM teams WHERE code='CIV'), (SELECT id FROM teams WHERE code='SVN'), '2026-06-16 17:00:00', 'Rose Bowl', 'Los Ángeles'),
(63, 'Fase de Grupos', 'K', (SELECT id FROM teams WHERE code='TUR'), (SELECT id FROM teams WHERE code='SVN'), '2026-06-20 14:00:00', 'Gillette Stadium', 'Boston'),
(64, 'Fase de Grupos', 'K', (SELECT id FROM teams WHERE code='NGA'), (SELECT id FROM teams WHERE code='CIV'), '2026-06-20 17:00:00', 'SoFi Stadium', 'Los Ángeles'),
(65, 'Fase de Grupos', 'K', (SELECT id FROM teams WHERE code='SVN'), (SELECT id FROM teams WHERE code='NGA'), '2026-06-25 19:00:00', 'Levi''s Stadium', 'San Francisco'),
(66, 'Fase de Grupos', 'K', (SELECT id FROM teams WHERE code='TUR'), (SELECT id FROM teams WHERE code='CIV'), '2026-06-25 19:00:00', 'MetLife Stadium', 'Nueva York'),

-- GRUPO L
(67, 'Fase de Grupos', 'L', (SELECT id FROM teams WHERE code='AUT'), (SELECT id FROM teams WHERE code='GRE'), '2026-06-17 14:00:00', 'Estadio Azteca', 'Ciudad de México'),
(68, 'Fase de Grupos', 'L', (SELECT id FROM teams WHERE code='RSA'), (SELECT id FROM teams WHERE code='IRL'), '2026-06-17 17:00:00', 'BMO Field', 'Toronto'),
(69, 'Fase de Grupos', 'L', (SELECT id FROM teams WHERE code='GRE'), (SELECT id FROM teams WHERE code='IRL'), '2026-06-21 14:00:00', 'Estadio Azteca', 'Ciudad de México'),
(70, 'Fase de Grupos', 'L', (SELECT id FROM teams WHERE code='AUT'), (SELECT id FROM teams WHERE code='RSA'), '2026-06-21 17:00:00', 'Arrowhead Stadium', 'Kansas City'),
(71, 'Fase de Grupos', 'L', (SELECT id FROM teams WHERE code='IRL'), (SELECT id FROM teams WHERE code='AUT'), '2026-06-26 19:00:00', 'BMO Field', 'Toronto'),
(72, 'Fase de Grupos', 'L', (SELECT id FROM teams WHERE code='GRE'), (SELECT id FROM teams WHERE code='RSA'), '2026-06-26 19:00:00', 'Estadio Azteca', 'Ciudad de México')
ON CONFLICT ON CONSTRAINT matches_match_number_key DO NOTHING;

-- ============================================
-- FUNCIÓN PARA CALCULAR PUNTOS
-- ============================================
CREATE OR REPLACE FUNCTION calculate_prediction_points(
    p_predicted_home INTEGER,
    p_predicted_away INTEGER,
    p_actual_home INTEGER,
    p_actual_away INTEGER
) RETURNS TABLE(result_points INTEGER, exact_points INTEGER) AS $$
DECLARE
    v_predicted_winner VARCHAR;
    v_actual_winner VARCHAR;
BEGIN
    IF p_predicted_home > p_predicted_away THEN
        v_predicted_winner := 'home';
    ELSIF p_predicted_home < p_predicted_away THEN
        v_predicted_winner := 'away';
    ELSE
        v_predicted_winner := 'draw';
    END IF;

    IF p_actual_home > p_actual_away THEN
        v_actual_winner := 'home';
    ELSIF p_actual_home < p_actual_away THEN
        v_actual_winner := 'away';
    ELSE
        v_actual_winner := 'draw';
    END IF;

    result_points := 0;
    exact_points := 0;

    IF v_predicted_winner = v_actual_winner THEN
        result_points := 1;
    END IF;

    IF p_predicted_home = p_actual_home AND p_predicted_away = p_actual_away THEN
        exact_points := 1;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR PUNTOS TRAS RESULTADO
-- ============================================
CREATE OR REPLACE FUNCTION update_match_points(p_match_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
    v_pred RECORD;
    v_points RECORD;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id AND status = 'finished';

    IF v_match IS NULL THEN
        RAISE EXCEPTION 'Partido no encontrado o no finalizado';
    END IF;

    FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
        SELECT * INTO v_points FROM calculate_prediction_points(
            v_pred.predicted_home_score,
            v_pred.predicted_away_score,
            v_match.home_score,
            v_match.away_score
        );

        UPDATE predictions
        SET points_result = v_points.result_points,
            points_exact = v_points.exact_points
        WHERE id = v_pred.id;
    END LOOP;

    UPDATE users u SET
        total_points = (
            SELECT COALESCE(SUM(points_result + points_exact), 0)
            FROM predictions p WHERE p.user_id = u.id
        ),
        updated_at = NOW();

    INSERT INTO ranking_cache (user_id, total_points, correct_results, exact_scores, updated_at)
    SELECT
        u.id,
        COALESCE(SUM(p.points_result + p.points_exact), 0),
        COALESCE(SUM(p.points_result), 0),
        COALESCE(SUM(p.points_exact), 0),
        NOW()
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id
    GROUP BY u.id
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        correct_results = EXCLUDED.correct_results,
        exact_scores = EXCLUDED.exact_scores,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADMIN POR DEFECTO
-- El servidor crea automáticamente este usuario al primer arranque
-- via la función createDefaultAdmin() en server.js:
--   Email:    saddam.shamir@gmail.com
--   Nombre:   Saddam Torres
--   Clave:    123456
--   Rol:      admin
-- ============================================
