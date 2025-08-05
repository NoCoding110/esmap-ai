-- Migration 008: Create R2 Storage Management Tables

-- File metadata table
CREATE TABLE IF NOT EXISTS file_metadata (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_at DATETIME NOT NULL,
    last_modified DATETIME NOT NULL,
    tags TEXT DEFAULT '{}',
    category TEXT NOT NULL,
    source TEXT NOT NULL,
    compression_info TEXT,
    checksums TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'internal',
    retention_policy TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File operations audit table
CREATE TABLE IF NOT EXISTS file_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    file_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES file_metadata(id)
);

-- Bulk operations tracking table
CREATE TABLE IF NOT EXISTS bulk_operations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    files TEXT NOT NULL, -- JSON array of file IDs
    status TEXT NOT NULL DEFAULT 'pending',
    progress_completed INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    progress_failed INTEGER DEFAULT 0,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    errors TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Storage quotas and limits table
CREATE TABLE IF NOT EXISTS storage_quotas (
    category TEXT PRIMARY KEY,
    max_size INTEGER NOT NULL,
    current_size INTEGER DEFAULT 0,
    max_files INTEGER NOT NULL,
    current_files INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_metadata_category ON file_metadata(category);
CREATE INDEX IF NOT EXISTS idx_file_metadata_source ON file_metadata(source);
CREATE INDEX IF NOT EXISTS idx_file_metadata_uploaded_at ON file_metadata(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_file_metadata_size ON file_metadata(size);
CREATE INDEX IF NOT EXISTS idx_file_metadata_access_level ON file_metadata(access_level);

CREATE INDEX IF NOT EXISTS idx_file_operations_file_id ON file_operations(file_id);
CREATE INDEX IF NOT EXISTS idx_file_operations_type ON file_operations(type);
CREATE INDEX IF NOT EXISTS idx_file_operations_timestamp ON file_operations(timestamp);
CREATE INDEX IF NOT EXISTS idx_file_operations_status ON file_operations(status);

CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_started_at ON bulk_operations(started_at);

-- Initial storage quotas for ESMAP categories
INSERT OR REPLACE INTO storage_quotas (category, max_size, max_files) VALUES
('energy-data', 107374182400, 50000),      -- 100GB, 50K files
('climate-data', 53687091200, 25000),      -- 50GB, 25K files  
('geospatial', 32212254720, 15000),        -- 30GB, 15K files
('survey-data', 21474836480, 10000),       -- 20GB, 10K files
('processed-reports', 10737418240, 5000),  -- 10GB, 5K files
('cache', 5368709120, 10000),              -- 5GB, 10K files
('backup', 53687091200, 5000),             -- 50GB, 5K files
('temporary', 1073741824, 1000);           -- 1GB, 1K files

-- Triggers to update quotas automatically
CREATE TRIGGER IF NOT EXISTS update_quota_on_insert
    AFTER INSERT ON file_metadata
BEGIN
    UPDATE storage_quotas 
    SET current_size = current_size + NEW.size,
        current_files = current_files + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE category = NEW.category;
END;

CREATE TRIGGER IF NOT EXISTS update_quota_on_delete
    AFTER DELETE ON file_metadata
BEGIN
    UPDATE storage_quotas 
    SET current_size = current_size - OLD.size,
        current_files = current_files - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE category = OLD.category;
END;

CREATE TRIGGER IF NOT EXISTS update_metadata_timestamp
    AFTER UPDATE ON file_metadata
BEGIN
    UPDATE file_metadata 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;