-- ========================================================
-- DANCE DETECTOR DATABASE SCHEMA (for PostgreSQL 15+)
-- ========================================================

-- Create Type for User Role if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('player', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- --------------------------------------------------------
-- Table structure for users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NULL,
  email VARCHAR(100) UNIQUE NULL,
  password_hash VARCHAR(255) NULL,
  display_name VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'player',
  is_guest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);

-- --------------------------------------------------------
-- Table structure for scores
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pose_key VARCHAR(50) NOT NULL DEFAULT 'dab',
  score INT NOT NULL DEFAULT 0,
  count INT NOT NULL DEFAULT 0,
  pose_accuracy_details JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score);
CREATE INDEX IF NOT EXISTS idx_scores_pose_key ON scores(pose_key);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at);

-- --------------------------------------------------------
-- Table structure for user_sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
