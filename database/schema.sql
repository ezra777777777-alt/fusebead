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
  token_version INT NOT NULL DEFAULT 0,
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

-- ── Admin: user fields ──
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN contribution_points INT DEFAULT 0;

-- ── Admin: pattern fields ──
ALTER TABLE patterns ADD COLUMN is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE patterns ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE patterns ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_patterns_is_approved ON patterns(is_approved);
CREATE INDEX idx_patterns_is_featured ON patterns(is_featured);

-- ── Admin: operation logs ──
CREATE TABLE admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INT,
  detail TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);

-- ── Cyber community projects ──
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  category VARCHAR(40) NOT NULL,
  demo_url VARCHAR(1000) NOT NULL,
  repo_url VARCHAR(1000),
  tech_stack VARCHAR(200),
  confession TEXT,
  cover_url VARCHAR(1000),
  status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
  moderation_note TEXT,
  revision INT DEFAULT 1,
  is_featured BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  votes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE project_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_vote (project_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE project_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE project_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  reason VARCHAR(80) NOT NULL,
  detail TEXT,
  status ENUM('open', 'resolved') DEFAULT 'open',
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  checkin_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_daily_checkin (user_id, checkin_date)
) ENGINE=InnoDB;

CREATE TABLE contribution_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_key VARCHAR(200) NOT NULL,
  points INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contribution_event (user_id, event_key)
) ENGINE=InnoDB;

-- ── User feedback and admin replies ──
CREATE TABLE feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  reply TEXT,
  replied_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 帖子多图。生产 PostgreSQL 不由本文件自动执行，见 server/src/migrate-project-attachments.ts。
CREATE TABLE project_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  stored_name VARCHAR(80) NOT NULL UNIQUE,
  mime VARCHAR(40) NOT NULL,
  byte_size INT NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_project_attachments_project ON project_attachments(project_id, sort_order);

-- ── Admin: system settings ──
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
