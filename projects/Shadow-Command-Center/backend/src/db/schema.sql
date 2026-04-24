-- Shadow Command Center — MySQL Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS shadow_command_center;
USE shadow_command_center;

-- Metrics time-series (1 row per 10-second interval)
CREATE TABLE IF NOT EXISTS metrics (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  throughput  DECIMAL(12, 2) NOT NULL,   -- req/min
  latency_avg DECIMAL(8, 3) NOT NULL,    -- ms
  latency_p99 DECIMAL(8, 3) DEFAULT NULL,
  error_rate  DECIMAL(6, 3) NOT NULL,   -- errors/min
  uptime_pct  DECIMAL(5, 3) NOT NULL,    -- 0.000–100.000
  cpu_pct     DECIMAL(5, 2) DEFAULT NULL,
  mem_used_mb INT UNSIGNED DEFAULT NULL,
  INDEX idx_recorded (recorded_at),
  INDEX idx_recorded_desc (recorded_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Structured event log (self-heal actions, crashes, config changes)
CREATE TABLE IF NOT EXISTS events (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  level      ENUM('info', 'warn', 'error', 'critical') NOT NULL,
  source     VARCHAR(64) NOT NULL,          -- 'gateway', 'watchdog', 'healer', 'config'
  code       VARCHAR(32) NOT NULL,          -- 'CRASH', 'RESTART', 'HEAL_OK', 'CONFIG_CHANGE'
  message    TEXT NOT NULL,
  payload    JSON DEFAULT NULL,             -- extra structured data
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_level (level),
  INDEX idx_source (source),
  INDEX idx_recorded (recorded_at),
  INDEX idx_recorded_desc (recorded_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crash / restart history
CREATE TABLE IF NOT EXISTS crashes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  crashed_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  recovered_at  DATETIME(3) DEFAULT NULL,
  reason        VARCHAR(255) NOT NULL,
  duration_ms   INT UNSIGNED DEFAULT NULL,   -- how long the gateway was down
  stack_trace  TEXT DEFAULT NULL,
  watchdog_log  TEXT DEFAULT NULL,
  INDEX idx_crashed (crashed_at),
  INDEX idx_recovered (recovered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--的价值捕捉记录 (Value-Capture Records)
-- Persists business outcomes generated from gateway activity
CREATE TABLE IF NOT EXISTS value_records (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_code  VARCHAR(32) NOT NULL,          -- 'CODE_GENERATED', 'DEMAND_FULFILLED', 'INSIGHT_DELIVERED'
  category    VARCHAR(64) NOT NULL,           -- 'pipeline', 'research', 'review'
  description TEXT NOT NULL,
  impact      VARCHAR(64) DEFAULT NULL,       -- 'high', 'medium', 'low'
  metadata    JSON DEFAULT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_event_code (event_code),
  INDEX idx_category (category),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
