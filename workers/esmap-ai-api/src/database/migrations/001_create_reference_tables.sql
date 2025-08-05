-- Migration 001: Create Reference and Metadata Tables
-- Reference tables for countries, indicators, and technologies

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