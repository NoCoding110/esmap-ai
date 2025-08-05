-- Migration 002: Create Energy Data Tables
-- Core tables for storing energy indicators, capacity, and consumption data

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