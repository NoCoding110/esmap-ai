-- ESMAP AI Platform Database Schema
-- Comprehensive schema for energy data, metadata, and user management

-- ===============================
-- REFERENCE AND METADATA TABLES
-- ===============================

-- Countries table with ISO codes and geographic data
CREATE TABLE countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso2_code TEXT UNIQUE NOT NULL,
    iso3_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    official_name TEXT,
    region TEXT,
    sub_region TEXT,
    income_group TEXT,
    population BIGINT,
    gdp_usd DECIMAL(15,2),
    area_km2 DECIMAL(12,2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(11,7),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Energy indicators reference table
CREATE TABLE energy_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    category TEXT NOT NULL, -- 'access', 'renewable', 'efficiency', 'emissions', etc.
    source TEXT NOT NULL,   -- 'world_bank', 'iea', 'irena', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Technology types for renewable energy
CREATE TABLE technologies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'solar', 'wind', 'hydro', 'geothermal', 'biomass', etc.
    description TEXT,
    is_renewable BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- ENERGY DATA TABLES
-- ===============================

-- Historical energy indicators data
CREATE TABLE energy_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL,
    indicator_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    value DECIMAL(15,4),
    unit TEXT,
    source TEXT NOT NULL,
    source_dataset TEXT,
    confidence_level TEXT, -- 'high', 'medium', 'low'
    is_estimated BOOLEAN DEFAULT FALSE,
    metadata TEXT, -- JSON field for additional metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    FOREIGN KEY (indicator_id) REFERENCES energy_indicators(id),
    UNIQUE(country_id, indicator_id, year, source)
);

-- Renewable energy capacity data
CREATE TABLE renewable_capacity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL,
    technology_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    capacity_mw DECIMAL(12,2) NOT NULL,
    capacity_additions_mw DECIMAL(12,2),
    capacity_retirements_mw DECIMAL(12,2),
    generation_gwh DECIMAL(15,2),
    capacity_factor DECIMAL(5,4), -- 0.0 to 1.0
    source TEXT NOT NULL,
    data_quality TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    FOREIGN KEY (technology_id) REFERENCES technologies(id),
    UNIQUE(country_id, technology_id, year, source)
);

-- Energy consumption data by sector
CREATE TABLE energy_consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    sector TEXT NOT NULL, -- 'residential', 'commercial', 'industrial', 'transport', 'other'
    fuel_type TEXT NOT NULL, -- 'electricity', 'natural_gas', 'oil', 'coal', 'renewables', etc.
    consumption_mtoe DECIMAL(12,4), -- Million tonnes oil equivalent
    consumption_twh DECIMAL(12,4),  -- Terawatt hours (for electricity)
    per_capita_consumption DECIMAL(10,4),
    source TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    UNIQUE(country_id, year, sector, fuel_type, source)
);

-- ===============================
-- PROJECT AND INFRASTRUCTURE
-- ===============================

-- Energy projects and infrastructure
CREATE TABLE energy_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country_id INTEGER NOT NULL,
    technology_id INTEGER,
    project_type TEXT NOT NULL, -- 'power_plant', 'transmission', 'distribution', 'storage', etc.
    status TEXT NOT NULL, -- 'planned', 'under_construction', 'operational', 'decommissioned'
    capacity_mw DECIMAL(12,2),
    estimated_generation_gwh DECIMAL(12,2),
    investment_usd DECIMAL(15,2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(11,7),
    start_date DATE,
    commissioning_date DATE,
    decommissioning_date DATE,
    developer TEXT,
    operator TEXT,
    financing_type TEXT, -- 'public', 'private', 'blended', 'multilateral'
    description TEXT,
    data_source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    FOREIGN KEY (technology_id) REFERENCES technologies(id)
);

-- Climate and resource data for locations
CREATE TABLE climate_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(11,7) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER, -- NULL for annual data
    solar_irradiance_kwh_m2 DECIMAL(8,4),
    wind_speed_ms DECIMAL(6,3),
    temperature_avg_c DECIMAL(6,3),
    temperature_min_c DECIMAL(6,3),
    temperature_max_c DECIMAL(6,3),
    precipitation_mm DECIMAL(8,2),
    humidity_percent DECIMAL(5,2),
    data_source TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    UNIQUE(latitude, longitude, year, month, data_source)
);

-- ===============================
-- USER AND ACCESS MANAGEMENT
-- ===============================

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

-- ===============================
-- DATA QUALITY AND AUDIT
-- ===============================

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

-- ===============================
-- AGGREGATED VIEWS AND REPORTS
-- ===============================

-- Country energy profiles (materialized view concept)
CREATE TABLE country_energy_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    electricity_access_percent DECIMAL(5,2),
    renewable_capacity_mw DECIMAL(12,2),
    renewable_share_percent DECIMAL(5,2),
    energy_intensity_mj_gdp DECIMAL(10,4),
    co2_emissions_mt DECIMAL(12,2),
    per_capita_consumption_mwh DECIMAL(8,2),
    energy_security_index DECIMAL(3,2), -- calculated index 0-1
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    UNIQUE(country_id, year)
);

-- SDG7 tracking (Sustainable Development Goal 7)
CREATE TABLE sdg7_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    sdg_7_1_1 DECIMAL(5,2), -- Proportion of population with access to electricity
    sdg_7_1_2 DECIMAL(5,2), -- Proportion with primary reliance on clean fuels/tech
    sdg_7_2_1 DECIMAL(5,2), -- Renewable energy share in total final energy consumption
    sdg_7_3_1 DECIMAL(8,4), -- Energy intensity (MJ per $2017 PPP GDP)
    progress_status TEXT,    -- 'on_track', 'needs_acceleration', 'critical'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    UNIQUE(country_id, year)
);