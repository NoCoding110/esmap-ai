-- Seed 002: Sample Energy Data Population
-- Populate sample energy data, renewable capacity, and projects

-- Sample energy data (electricity access rates for key countries)
INSERT INTO energy_data (country_id, indicator_id, year, value, unit, source, source_dataset, confidence_level) VALUES
-- USA electricity access (100% for recent years)
(1, 1, 2020, 100.0, '%', 'world_bank', 'WDI', 'high'),
(1, 1, 2021, 100.0, '%', 'world_bank', 'WDI', 'high'),
(1, 1, 2022, 100.0, '%', 'world_bank', 'WDI', 'high'),
-- China electricity access
(2, 1, 2020, 100.0, '%', 'world_bank', 'WDI', 'high'),
(2, 1, 2021, 100.0, '%', 'world_bank', 'WDI', 'high'),
(2, 1, 2022, 100.0, '%', 'world_bank', 'WDI', 'high'),
-- India electricity access
(3, 1, 2020, 95.2, '%', 'world_bank', 'WDI', 'high'),
(3, 1, 2021, 96.1, '%', 'world_bank', 'WDI', 'high'),
(3, 1, 2022, 97.0, '%', 'world_bank', 'WDI', 'medium'),
-- Nigeria electricity access
(6, 1, 2020, 55.4, '%', 'world_bank', 'WDI', 'medium'),
(6, 1, 2021, 57.2, '%', 'world_bank', 'WDI', 'medium'),
(6, 1, 2022, 59.0, '%', 'world_bank', 'WDI', 'medium'),
-- Bangladesh electricity access
(7, 1, 2020, 92.2, '%', 'world_bank', 'WDI', 'high'),
(7, 1, 2021, 94.1, '%', 'world_bank', 'WDI', 'high'),
(7, 1, 2022, 96.0, '%', 'world_bank', 'WDI', 'high'),
-- Kenya electricity access
(11, 1, 2020, 71.4, '%', 'world_bank', 'WDI', 'medium'),
(11, 1, 2021, 75.8, '%', 'world_bank', 'WDI', 'medium'),
(11, 1, 2022, 80.2, '%', 'world_bank', 'WDI', 'medium'),
-- Ethiopia electricity access
(12, 1, 2020, 44.3, '%', 'world_bank', 'WDI', 'medium'),
(12, 1, 2021, 47.9, '%', 'world_bank', 'WDI', 'medium'),
(12, 1, 2022, 51.5, '%', 'world_bank', 'WDI', 'medium');

-- Sample renewable energy consumption data
INSERT INTO energy_data (country_id, indicator_id, year, value, unit, source, source_dataset, confidence_level) VALUES
-- Renewable energy share data
(1, 4, 2020, 12.2, '%', 'world_bank', 'WDI', 'high'),    -- USA
(1, 4, 2021, 12.9, '%', 'world_bank', 'WDI', 'high'),
(1, 4, 2022, 13.6, '%', 'world_bank', 'WDI', 'high'),
(2, 4, 2020, 15.7, '%', 'world_bank', 'WDI', 'high'),    -- China
(2, 4, 2021, 16.4, '%', 'world_bank', 'WDI', 'high'),
(2, 4, 2022, 17.1, '%', 'world_bank', 'WDI', 'high'),
(3, 4, 2020, 44.7, '%', 'world_bank', 'WDI', 'high'),    -- India
(3, 4, 2021, 43.2, '%', 'world_bank', 'WDI', 'high'),
(3, 4, 2022, 41.8, '%', 'world_bank', 'WDI', 'high'),
(5, 4, 2020, 17.4, '%', 'world_bank', 'WDI', 'high'),    -- Germany
(5, 4, 2021, 19.2, '%', 'world_bank', 'WDI', 'high'),
(5, 4, 2022, 20.8, '%', 'world_bank', 'WDI', 'high');

-- Sample renewable capacity data
INSERT INTO renewable_capacity (country_id, technology_id, year, capacity_mw, capacity_additions_mw, generation_gwh, source, data_quality) VALUES
-- Solar PV capacity
(1, 1, 2020, 75572, 13000, 131000, 'irena', 'high'),     -- USA Solar PV
(1, 1, 2021, 95209, 19637, 163000, 'irena', 'high'),
(1, 1, 2022, 113738, 18529, 192000, 'irena', 'high'),
(2, 1, 2020, 261127, 48200, 261000, 'irena', 'high'),    -- China Solar PV
(2, 1, 2021, 306973, 45846, 327000, 'irena', 'high'),
(2, 1, 2022, 353067, 46094, 425000, 'irena', 'high'),
-- Wind capacity
(1, 3, 2020, 122478, 16836, 380000, 'irena', 'high'),    -- USA Onshore Wind
(1, 3, 2021, 135886, 13408, 416000, 'irena', 'high'),
(1, 3, 2022, 145618, 9732, 436000, 'irena', 'high'),
(2, 3, 2020, 264270, 37648, 466000, 'irena', 'high'),    -- China Onshore Wind
(2, 3, 2021, 294130, 29860, 549000, 'irena', 'high'),
(2, 3, 2022, 318094, 23964, 627000, 'irena', 'high'),
-- Hydropower capacity
(3, 5, 2020, 55875, 1647, 181000, 'irena', 'high'),      -- India Large Hydro
(3, 5, 2021, 56875, 1000, 183000, 'irena', 'high'),
(3, 5, 2022, 57875, 1000, 185000, 'irena', 'high'),
(4, 5, 2020, 103964, 1020, 355000, 'irena', 'high'),     -- Brazil Large Hydro
(4, 5, 2021, 104964, 1000, 362000, 'irena', 'high'),
(4, 5, 2022, 105964, 1000, 369000, 'irena', 'high');

-- Sample energy projects
INSERT INTO energy_projects (name, country_id, technology_id, project_type, status, capacity_mw, estimated_generation_gwh, investment_usd, latitude, longitude, commissioning_date, developer, financing_type, description, data_source) VALUES
('Noor Ouarzazate Solar Complex', 13, 2, 'power_plant', 'operational', 580, 1300, 2600000000, 30.9335, -6.9370, '2018-11-01', 'ACWA Power', 'blended', 'Large-scale concentrated solar power complex in Morocco', 'manual_entry'),
('Hornsea One Offshore Wind Farm', 5, 4, 'power_plant', 'operational', 1218, 4380, 4300000000, 53.8667, 1.7833, '2020-01-01', 'Ørsted', 'private', 'World largest offshore wind farm in UK waters', 'manual_entry'),
('Adani Solar Park', 3, 1, 'power_plant', 'operational', 648, 1200, 679000000, 23.0644, 71.6336, '2019-12-01', 'Adani Green Energy', 'private', 'Large solar photovoltaic park in Gujarat, India', 'manual_entry'),
('Lake Turkana Wind Power', 11, 3, 'power_plant', 'operational', 310, 1336, 850000000, 2.9167, 36.5833, '2019-09-01', 'Lake Turkana Wind Power', 'blended', 'Largest wind farm in Africa, Kenya', 'manual_entry'),
('Grand Ethiopian Renaissance Dam', 12, 5, 'power_plant', 'under_construction', 6450, 15759, 4800000000, 11.2156, 35.0944, '2024-12-01', 'Ethiopian Electric Power', 'public', 'Major hydroelectric dam project on Blue Nile', 'manual_entry'),
('Benban Solar Park', 14, 1, 'power_plant', 'operational', 1650, 3800, 2000000000, 24.4667, 32.7167, '2019-12-01', 'Multiple developers', 'blended', 'One of largest solar installations in the world, Egypt', 'manual_entry');

-- Sample climate data
INSERT INTO climate_data (country_id, latitude, longitude, year, solar_irradiance_kwh_m2, wind_speed_ms, temperature_avg_c, data_source) VALUES
-- Sample climate data for major cities
(1, 40.7128, -74.0060, 2022, 1344, 5.2, 12.9, 'nasa_power'),    -- New York
(1, 34.0522, -118.2437, 2022, 1876, 3.8, 18.6, 'nasa_power'),  -- Los Angeles
(2, 39.9042, 116.4074, 2022, 1456, 2.9, 12.9, 'nasa_power'),   -- Beijing
(2, 31.2304, 121.4737, 2022, 1234, 3.4, 17.1, 'nasa_power'),   -- Shanghai
(3, 28.7041, 77.1025, 2022, 1743, 2.1, 25.0, 'nasa_power'),    -- New Delhi
(3, 19.0760, 72.8777, 2022, 1654, 3.7, 27.2, 'nasa_power'),    -- Mumbai
(11, -1.2921, 36.8219, 2022, 1923, 4.1, 19.8, 'nasa_power'),   -- Nairobi
(12, 9.1450, 40.4897, 2022, 2134, 2.8, 22.3, 'nasa_power');    -- Addis Ababa

-- Sample users for testing
INSERT INTO users (email, name, organization, role, country_focus, is_active, rate_limit_tier) VALUES
('admin@esmap.org', 'ESMAP Administrator', 'World Bank ESMAP', 'admin', '["ALL"]', TRUE, 'enterprise'),
('analyst@esmap.org', 'Energy Analyst', 'World Bank ESMAP', 'analyst', '["KE","ET","NG","BD"]', TRUE, 'premium'),
('researcher@university.edu', 'Research Scientist', 'Global University', 'user', '["US","DE","CN"]', TRUE, 'standard'),
('policy@government.gov', 'Policy Maker', 'National Energy Ministry', 'user', '["IN"]', TRUE, 'standard'),
('developer@private.com', 'Project Developer', 'Renewable Energy Corp', 'viewer', '["BR","MX","ZA"]', TRUE, 'standard');