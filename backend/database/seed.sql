-- ========================================================
-- DANCE DETECTOR INITIAL SEED DATA
-- Default Admin credentials:
-- Username: admin
-- Password: adminpassword123 (hashed using bcrypt)
-- ========================================================

USE `dance_detector`;

-- Clean up existing seed data if needed
DELETE FROM `scores`;
DELETE FROM `users`;

-- Insert Admin User
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `display_name`, `role`, `is_guest`, `created_at`) VALUES
(1, 'admin', 'admin@dancedetector.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Admin Manager', 'admin', 0, NOW());

-- Insert Sample Players
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `display_name`, `role`, `is_guest`, `created_at`) VALUES
(2, 'player1', 'player1@gmail.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'ProDabber99', 'player', 0, NOW()),
(3, NULL, NULL, NULL, 'TestDabPro', 'player', 1, NOW()),
(4, NULL, NULL, NULL, 'TestSixSevenStar', 'player', 1, NOW()),
(5, NULL, NULL, NULL, 'TestScubaChamp', 'player', 1, NOW());

-- Insert Sample Scores (Dab, Six-Seven, Scuba)
INSERT INTO `scores` (`user_id`, `pose_key`, `score`, `count`, `pose_accuracy_details`, `created_at`) VALUES
(2, 'dab', 850, 9, '{"avg_accuracy": 94.4}', NOW() - INTERVAL 2 DAY),
(3, 'dab', 1650, 22, '{"avg_accuracy": 98.5}', NOW()),
(4, 'six_seven', 1820, 25, '{"avg_accuracy": 99.1}', NOW()),
(5, 'scuba', 2100, 28, '{"avg_accuracy": 99.6}', NOW());
