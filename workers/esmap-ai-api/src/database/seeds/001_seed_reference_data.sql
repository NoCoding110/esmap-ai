-- Seed 001: Reference Data Population
-- Populate countries, energy indicators, and technologies with initial data

-- Sample countries (key ESMAP focus countries)
INSERT INTO countries (iso2_code, iso3_code, name, official_name, region, sub_region, income_group, population, gdp_usd, area_km2, latitude, longitude) VALUES
('US', 'USA', 'United States', 'United States of America', 'Americas', 'Northern America', 'High income', 331900000, 21427700000000, 9833517, 39.8283, -98.5795),
('CN', 'CHN', 'China', 'People''s Republic of China', 'Asia', 'Eastern Asia', 'Upper middle income', 1439323776, 14342903000000, 9596960, 35.8617, 104.1954),
('IN', 'IND', 'India', 'Republic of India', 'Asia', 'Southern Asia', 'Lower middle income', 1380004385, 2875142000000, 3287263, 20.5937, 78.9629),
('BR', 'BRA', 'Brazil', 'Federative Republic of Brazil', 'Americas', 'South America', 'Upper middle income', 212559417, 1608981000000, 8514877, -14.2350, -51.9253),
('DE', 'DEU', 'Germany', 'Federal Republic of Germany', 'Europe', 'Western Europe', 'High income', 83783942, 3846414000000, 357114, 51.1657, 10.4515),
('NG', 'NGA', 'Nigeria', 'Federal Republic of Nigeria', 'Africa', 'Western Africa', 'Lower middle income', 206139589, 432294000000, 923768, 9.0820, 8.6753),
('BD', 'BGD', 'Bangladesh', 'People''s Republic of Bangladesh', 'Asia', 'Southern Asia', 'Lower middle income', 164689383, 416265000000, 148460, 23.6850, 90.3563),
('PK', 'PAK', 'Pakistan', 'Islamic Republic of Pakistan', 'Asia', 'Southern Asia', 'Lower middle income', 220892340, 347698000000, 881913, 30.3753, 69.3451),
('ID', 'IDN', 'Indonesia', 'Republic of Indonesia', 'Asia', 'South-eastern Asia', 'Upper middle income', 273523615, 1158783000000, 1904569, -0.7893, 113.9213),
('MX', 'MEX', 'Mexico', 'United Mexican States', 'Americas', 'Central America', 'Upper middle income', 128932753, 1269956000000, 1964375, 23.6345, -102.5528),
('KE', 'KEN', 'Kenya', 'Republic of Kenya', 'Africa', 'Eastern Africa', 'Lower middle income', 53771296, 109116000000, 580367, -0.0236, 37.9062),
('ET', 'ETH', 'Ethiopia', 'Federal Democratic Republic of Ethiopia', 'Africa', 'Eastern Africa', 'Low income', 114963588, 96108000000, 1104300, 9.1450, 40.4897),
('ZA', 'ZAF', 'South Africa', 'Republic of South Africa', 'Africa', 'Southern Africa', 'Upper middle income', 59308690, 419015000000, 1221037, -30.5595, 22.9375),
('EG', 'EGY', 'Egypt', 'Arab Republic of Egypt', 'Africa', 'Northern Africa', 'Lower middle income', 102334404, 404143000000, 1001449, 26.0975, 30.8025),
('VN', 'VNM', 'Vietnam', 'Socialist Republic of Vietnam', 'Asia', 'South-eastern Asia', 'Lower middle income', 97338579, 362638000000, 331212, 14.0583, 108.2772);

-- Energy indicators (based on World Bank, IEA, IRENA standards)
INSERT INTO energy_indicators (code, name, description, unit, category, source) VALUES
('EG.ELC.ACCS.ZS', 'Access to electricity', 'Access to electricity (% of population)', '%', 'access', 'world_bank'),
('EG.ELC.ACCS.RU.ZS', 'Access to electricity, rural', 'Access to electricity, rural (% of rural population)', '%', 'access', 'world_bank'),
('EG.ELC.ACCS.UR.ZS', 'Access to electricity, urban', 'Access to electricity, urban (% of urban population)', '%', 'access', 'world_bank'),
('EG.FEC.RNEW.ZS', 'Renewable energy consumption', 'Renewable energy consumption (% of total final energy consumption)', '%', 'renewable', 'world_bank'),
('EG.EGY.PRIM.PP.KD', 'Energy intensity', 'Energy intensity level of primary energy (MJ/$2017 PPP GDP)', 'MJ/$2017 PPP GDP', 'efficiency', 'world_bank'),
('EN.ATM.CO2E.KT', 'CO2 emissions', 'CO2 emissions (kt)', 'kt', 'emissions', 'world_bank'),
('EN.ATM.CO2E.PC', 'CO2 emissions per capita', 'CO2 emissions (metric tons per capita)', 'metric tons per capita', 'emissions', 'world_bank'),
('EG.ELC.PROD.KH', 'Electricity production', 'Electricity production (kWh)', 'kWh', 'production', 'world_bank'),
('EG.ELC.RNEW.ZS', 'Electricity from renewables', 'Electricity production from renewable sources (% of total)', '%', 'renewable', 'world_bank'),
('EG.ELC.HYRO.ZS', 'Electricity from hydroelectric', 'Electricity production from hydroelectric sources (% of total)', '%', 'renewable', 'world_bank'),
('EG.ELC.NUCL.ZS', 'Electricity from nuclear', 'Electricity production from nuclear sources (% of total)', '%', 'nuclear', 'world_bank'),
('EG.ELC.COAL.ZS', 'Electricity from coal', 'Electricity production from coal sources (% of total)', '%', 'fossil', 'world_bank'),
('EG.ELC.NGAS.ZS', 'Electricity from natural gas', 'Electricity production from natural gas sources (% of total)', '%', 'fossil', 'world_bank'),
('EG.ELC.PETR.ZS', 'Electricity from oil', 'Electricity production from oil sources (% of total)', '%', 'fossil', 'world_bank'),
('SDG_7_1_1', 'SDG 7.1.1', 'Proportion of population with access to electricity', '%', 'sdg', 'iea'),
('SDG_7_1_2', 'SDG 7.1.2', 'Proportion of population with primary reliance on clean fuels and technology', '%', 'sdg', 'iea'),
('SDG_7_2_1', 'SDG 7.2.1', 'Renewable energy share in the total final energy consumption', '%', 'sdg', 'iea'),
('SDG_7_3_1', 'SDG 7.3.1', 'Energy intensity measured in terms of primary energy and GDP', 'MJ/$2017 PPP GDP', 'sdg', 'iea');

-- Technology types for renewable energy
INSERT INTO technologies (code, name, category, description, is_renewable) VALUES
('SOLAR_PV', 'Solar Photovoltaic', 'solar', 'Solar photovoltaic power generation', TRUE),
('SOLAR_CSP', 'Concentrated Solar Power', 'solar', 'Concentrated solar thermal power generation', TRUE),
('WIND_ONSHORE', 'Onshore Wind', 'wind', 'Onshore wind power generation', TRUE),
('WIND_OFFSHORE', 'Offshore Wind', 'wind', 'Offshore wind power generation', TRUE),
('HYDRO_LARGE', 'Large Hydropower', 'hydro', 'Large-scale hydroelectric power (>10MW)', TRUE),
('HYDRO_SMALL', 'Small Hydropower', 'hydro', 'Small-scale hydroelectric power (≤10MW)', TRUE),
('HYDRO_PUMPED', 'Pumped Storage Hydro', 'hydro', 'Pumped storage hydroelectric power', TRUE),
('GEOTHERMAL', 'Geothermal', 'geothermal', 'Geothermal power generation', TRUE),
('BIOMASS', 'Biomass', 'biomass', 'Biomass power generation', TRUE),
('BIOGAS', 'Biogas', 'biomass', 'Biogas power generation', TRUE),
('WASTE_TO_ENERGY', 'Waste-to-Energy', 'biomass', 'Municipal waste incineration for energy', TRUE),
('TIDAL', 'Tidal Energy', 'marine', 'Tidal power generation', TRUE),
('WAVE', 'Wave Energy', 'marine', 'Wave power generation', TRUE),
('COAL', 'Coal', 'fossil', 'Coal-fired power generation', FALSE),
('NATURAL_GAS', 'Natural Gas', 'fossil', 'Natural gas power generation', FALSE),
('OIL', 'Oil', 'fossil', 'Oil-fired power generation', FALSE),
('NUCLEAR', 'Nuclear', 'nuclear', 'Nuclear power generation', FALSE),
('BATTERY_STORAGE', 'Battery Storage', 'storage', 'Battery energy storage systems', TRUE),
('GRID_SCALE_STORAGE', 'Grid-Scale Storage', 'storage', 'Large-scale energy storage systems', TRUE);