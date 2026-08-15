-- ========================================================
-- DANCE DETECTOR INITIAL SEED DATA (for PostgreSQL 15+)
-- Default Admin credentials:
-- Username: admin
-- Password: adminpassword123 (hashed using bcrypt)
-- ========================================================

-- Clean up existing seed data if needed
TRUNCATE TABLE scores, users RESTART IDENTITY CASCADE;

-- Insert Admin User
INSERT INTO users (id, username, email, password_hash, display_name, role, is_guest, created_at) VALUES
(1, 'admin', 'admin@dancedetector.com', '$2b$12$tpR6hHLGOhWzpNmPixNoMey2KaHpgcRJnFUvzr6DiGhO1O/fxPi8a', 'Admin Manager', 'admin', false, NOW());

-- Insert Sample Players
INSERT INTO users (id, username, email, password_hash, display_name, role, is_guest, created_at) VALUES
(2, 'player1', 'player1@gmail.com', '$2b$12$tpR6hHLGOhWzpNmPixNoMey2KaHpgcRJnFUvzr6DiGhO1O/fxPi8a', 'ProDabber99', 'player', false, NOW()),
(3, NULL, NULL, NULL, 'TestDabPro', 'player', true, NOW()),
(4, NULL, NULL, NULL, 'TestSixSevenStar', 'player', true, NOW()),
(5, NULL, NULL, NULL, 'TestScubaChamp', 'player', true, NOW());

-- Insert Sample Scores (Dab, Six-Seven, Scuba)
INSERT INTO scores (user_id, pose_key, score, count, pose_accuracy_details, created_at) VALUES
(2, 'dab', 850, 9, '{"avg_accuracy": 94.4}'::jsonb, NOW() - INTERVAL '2 days'),
(3, 'dab', 1650, 22, '{"avg_accuracy": 98.5}'::jsonb, NOW()),
(4, 'six_seven', 1820, 25, '{"avg_accuracy": 99.1}'::jsonb, NOW()),
(5, 'scuba', 2100, 28, '{"avg_accuracy": 99.6}'::jsonb, NOW());

-- Update Sequence counters so subsequent inserts do not clash with explicit IDs
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('scores_id_seq', (SELECT COALESCE(MAX(id), 1) FROM scores));
