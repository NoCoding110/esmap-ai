-- Migration 004: Create User Management and API Usage Tables
-- Tables for users, authentication, and API usage tracking

-- Users table for platform access
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    role TEXT DEFAULT 'user', -- 'admin', 'analyst', 'user', 'viewer'
    country_focus TEXT, -- JSON array of country codes
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    api_key_hash TEXT,
    rate_limit_tier TEXT DEFAULT 'standard', -- 'standard', 'premium', 'enterprise'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking
CREATE TABLE api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    data_source TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);