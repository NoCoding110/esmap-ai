-- Migration 006: Create Aggregated Views and Reporting Tables
-- Tables for country profiles, SDG tracking, and reporting

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