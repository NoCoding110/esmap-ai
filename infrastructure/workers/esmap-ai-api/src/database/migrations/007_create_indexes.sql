-- Migration 007: Create Indexes for Query Performance
-- Indexes for optimal query performance across all tables

-- Countries table indexes
CREATE INDEX idx_countries_iso2 ON countries(iso2_code);
CREATE INDEX idx_countries_iso3 ON countries(iso3_code);
CREATE INDEX idx_countries_region ON countries(region);
CREATE INDEX idx_countries_name ON countries(name);

-- Energy indicators indexes
CREATE INDEX idx_energy_indicators_code ON energy_indicators(code);
CREATE INDEX idx_energy_indicators_category ON energy_indicators(category);
CREATE INDEX idx_energy_indicators_source ON energy_indicators(source);
CREATE INDEX idx_energy_indicators_active ON energy_indicators(is_active);

-- Technologies indexes
CREATE INDEX idx_technologies_code ON technologies(code);
CREATE INDEX idx_technologies_category ON technologies(category);
CREATE INDEX idx_technologies_renewable ON technologies(is_renewable);

-- Energy data indexes (most frequently queried)
CREATE INDEX idx_energy_data_country_year ON energy_data(country_id, year);
CREATE INDEX idx_energy_data_indicator_year ON energy_data(indicator_id, year);
CREATE INDEX idx_energy_data_source ON energy_data(source);
CREATE INDEX idx_energy_data_year ON energy_data(year);
CREATE INDEX idx_energy_data_composite ON energy_data(country_id, indicator_id, year);

-- Renewable capacity indexes
CREATE INDEX idx_renewable_capacity_country_year ON renewable_capacity(country_id, year);
CREATE INDEX idx_renewable_capacity_technology_year ON renewable_capacity(technology_id, year);
CREATE INDEX idx_renewable_capacity_source ON renewable_capacity(source);
CREATE INDEX idx_renewable_capacity_composite ON renewable_capacity(country_id, technology_id, year);

-- Energy consumption indexes
CREATE INDEX idx_energy_consumption_country_year ON energy_consumption(country_id, year);
CREATE INDEX idx_energy_consumption_sector ON energy_consumption(sector);
CREATE INDEX idx_energy_consumption_fuel_type ON energy_consumption(fuel_type);
CREATE INDEX idx_energy_consumption_composite ON energy_consumption(country_id, year, sector);

-- Energy projects indexes
CREATE INDEX idx_energy_projects_country ON energy_projects(country_id);
CREATE INDEX idx_energy_projects_technology ON energy_projects(technology_id);
CREATE INDEX idx_energy_projects_status ON energy_projects(status);
CREATE INDEX idx_energy_projects_type ON energy_projects(project_type);
CREATE INDEX idx_energy_projects_location ON energy_projects(latitude, longitude);
CREATE INDEX idx_energy_projects_commissioning ON energy_projects(commissioning_date);

-- Climate data indexes
CREATE INDEX idx_climate_data_location ON climate_data(latitude, longitude);
CREATE INDEX idx_climate_data_country_year ON climate_data(country_id, year);
CREATE INDEX idx_climate_data_year_month ON climate_data(year, month);
CREATE INDEX idx_climate_data_source ON climate_data(data_source);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_organization ON users(organization);

-- API usage indexes
CREATE INDEX idx_api_usage_user_timestamp ON api_usage(user_id, timestamp);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_api_usage_status ON api_usage(status_code);

-- Data quality indexes
CREATE INDEX idx_data_quality_table_record ON data_quality(table_name, record_id);
CREATE INDEX idx_data_quality_score ON data_quality(quality_score);
CREATE INDEX idx_data_quality_validated ON data_quality(last_validated);

-- Data sync log indexes
CREATE INDEX idx_data_sync_source ON data_sync_log(source_name);
CREATE INDEX idx_data_sync_status ON data_sync_log(status);
CREATE INDEX idx_data_sync_start_time ON data_sync_log(start_time);

-- Country energy profiles indexes
CREATE INDEX idx_country_profiles_country_year ON country_energy_profiles(country_id, year);
CREATE INDEX idx_country_profiles_year ON country_energy_profiles(year);
CREATE INDEX idx_country_profiles_updated ON country_energy_profiles(last_updated);

-- SDG7 indicators indexes
CREATE INDEX idx_sdg7_country_year ON sdg7_indicators(country_id, year);
CREATE INDEX idx_sdg7_year ON sdg7_indicators(year);
CREATE INDEX idx_sdg7_progress ON sdg7_indicators(progress_status);