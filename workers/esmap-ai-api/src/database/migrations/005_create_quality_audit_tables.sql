-- Migration 005: Create Data Quality and Audit Tables
-- Tables for data quality tracking, synchronization logs, and audit trails

-- Data quality metrics
CREATE TABLE data_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    quality_score DECIMAL(3,2), -- 0.00 to 1.00
    completeness_score DECIMAL(3,2),
    accuracy_score DECIMAL(3,2),
    timeliness_score DECIMAL(3,2),
    consistency_score DECIMAL(3,2),
    issues TEXT, -- JSON array of quality issues
    last_validated DATETIME DEFAULT CURRENT_TIMESTAMP,
    validator TEXT -- system or user who validated
);

-- Data source synchronization tracking
CREATE TABLE data_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    sync_type TEXT NOT NULL, -- 'full', 'incremental', 'backfill'
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata TEXT -- JSON field for additional sync metadata
);