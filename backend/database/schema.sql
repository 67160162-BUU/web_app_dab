-- ========================================================
-- DANCE DETECTOR DATABASE SCHEMA (for phpMyAdmin / MySQL)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `dance_detector` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dance_detector`;

-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NULL,
  `email` VARCHAR(100) UNIQUE NULL,
  `password_hash` VARCHAR(255) NULL,
  `display_name` VARCHAR(50) NOT NULL,
  `role` ENUM('player', 'admin') NOT NULL DEFAULT 'player',
  `is_guest` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_role` (`role`),
  INDEX `idx_is_guest` (`is_guest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `scores`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `pose_key` VARCHAR(50) NOT NULL DEFAULT 'dab',
  `score` INT NOT NULL DEFAULT 0,
  `count` INT NOT NULL DEFAULT 0,
  `pose_accuracy_details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_score` (`score`),
  INDEX `idx_pose_key` (`pose_key`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `user_sessions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token` TEXT NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
