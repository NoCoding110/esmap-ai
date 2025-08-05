-- Migration 003: Create Projects and Climate Data Tables
-- Tables for energy projects, infrastructure, and climate data

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