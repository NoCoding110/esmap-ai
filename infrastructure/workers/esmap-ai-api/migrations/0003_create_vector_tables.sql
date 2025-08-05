-- Vector metadata and analytics tables for Vectorize integration
-- Migration: 0003_create_vector_tables.sql

-- Vector metadata table for storing additional metadata not supported by Vectorize
CREATE TABLE IF NOT EXISTS vector_metadata (
    vector_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    country TEXT,
    indicator TEXT,
    year INTEGER,
    language TEXT DEFAULT 'en',
    quality_score REAL DEFAULT 0,
    tags TEXT, -- JSON array of tags
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    namespace TEXT DEFAULT 'default',
    content_hash TEXT,
    dimensions INTEGER DEFAULT 1536,
    model_used TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vector_metadata_type ON vector_metadata(type);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_category ON vector_metadata(category);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_source ON vector_metadata(source);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_country ON vector_metadata(country);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_year ON vector_metadata(year);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_namespace ON vector_metadata(namespace);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_created_at ON vector_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_vector_metadata_quality_score ON vector_metadata(quality_score);

-- Query analytics table for tracking search performance
CREATE TABLE IF NOT EXISTS query_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_id TEXT NOT NULL,
    query_text TEXT,
    query_type TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    response_time_ms REAL,
    user_satisfaction_score REAL,
    clicked_results TEXT, -- JSON array of clicked result IDs
    timestamp TEXT NOT NULL,
    namespace TEXT DEFAULT 'default',
    filters_used TEXT, -- JSON object of filters applied
    cache_hit BOOLEAN DEFAULT FALSE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_query_analytics_timestamp ON query_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_query_analytics_query_type ON query_analytics(query_type);
CREATE INDEX IF NOT EXISTS idx_query_analytics_response_time ON query_analytics(response_time_ms);

-- Embedding generation log for tracking API usage and costs
CREATE TABLE IF NOT EXISTS embedding_generation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    model_used TEXT NOT NULL,
    text_count INTEGER NOT NULL,
    token_count INTEGER,
    dimensions INTEGER DEFAULT 1536,
    processing_time_ms REAL,
    api_cost_estimate REAL,
    timestamp TEXT NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Index for cost tracking
CREATE INDEX IF NOT EXISTS idx_embedding_log_timestamp ON embedding_generation_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_embedding_log_model ON embedding_generation_log(model_used);

-- Vector similarity cache for frequently accessed similarity searches
CREATE TABLE IF NOT EXISTS vector_similarity_cache (
    cache_key TEXT PRIMARY KEY,
    query_vector_hash TEXT NOT NULL,
    result_ids TEXT NOT NULL, -- JSON array of result IDs
    similarity_scores TEXT NOT NULL, -- JSON array of scores
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1
);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_similarity_cache_expires ON vector_similarity_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_created ON vector_similarity_cache(created_at);

-- Document embeddings source tracking
CREATE TABLE IF NOT EXISTS document_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vector_id TEXT NOT NULL,
    document_id TEXT,
    document_url TEXT,
    content_excerpt TEXT,
    content_length INTEGER,
    chunk_index INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    embedding_model TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (vector_id) REFERENCES vector_metadata(vector_id) ON DELETE CASCADE
);

-- Indexes for document tracking
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector_id ON document_embeddings(vector_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk ON document_embeddings(chunk_index);

-- Energy domain specific metadata extension
CREATE TABLE IF NOT EXISTS energy_vector_metadata (
    vector_id TEXT PRIMARY KEY,
    energy_indicators TEXT, -- JSON array
    sdg_targets TEXT, -- JSON array
    geographic_scope TEXT CHECK (geographic_scope IN ('global', 'regional', 'national', 'subnational')),
    temporal_start_year INTEGER,
    temporal_end_year INTEGER,
    data_completeness REAL CHECK (data_completeness >= 0 AND data_completeness <= 1),
    data_accuracy REAL CHECK (data_accuracy >= 0 AND data_accuracy <= 1),
    data_timeliness REAL CHECK (data_timeliness >= 0 AND data_timeliness <= 1),
    esmap_program TEXT, -- JSON array
    partner_organizations TEXT, -- JSON array
    FOREIGN KEY (vector_id) REFERENCES vector_metadata(vector_id) ON DELETE CASCADE
);

-- Indexes for energy-specific queries
CREATE INDEX IF NOT EXISTS idx_energy_metadata_geographic_scope ON energy_vector_metadata(geographic_scope);
CREATE INDEX IF NOT EXISTS idx_energy_metadata_temporal_start ON energy_vector_metadata(temporal_start_year);
CREATE INDEX IF NOT EXISTS idx_energy_metadata_temporal_end ON energy_vector_metadata(temporal_end_year);
CREATE INDEX IF NOT EXISTS idx_energy_metadata_completeness ON energy_vector_metadata(data_completeness);