-- FuseBead Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS fusebead
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fusebead;

-- ── Users ──
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  plan ENUM('free', 'pro', 'team') DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Patterns ──
CREATE TABLE patterns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  brand VARCHAR(20) DEFAULT 'perler',
  grid_size INT NOT NULL,
  grid_data JSON NOT NULL,
  color_counts JSON,
  thumbnail_url VARCHAR(500),
  likes_count INT DEFAULT 0,
  downloads_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Favorites ──
CREATE TABLE favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pattern_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, pattern_id)
) ENGINE=InnoDB;

-- ── Generation Logs ──
CREATE TABLE generation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  pattern_id INT,
  source_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Comments ──
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pattern_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Indexes ──
CREATE INDEX idx_patterns_user_id ON patterns(user_id);
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_is_public ON patterns(is_public);
CREATE INDEX idx_patterns_created_at ON patterns(created_at);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_comments_pattern_id ON comments(pattern_id);
