// Database model types and interfaces

export interface Country {
  id?: number;
  iso2_code: string;
  iso3_code: string;
  name: string;
  official_name?: string;
  region?: string;
  sub_region?: string;
  income_group?: string;
  population?: number;
  gdp_usd?: number;
  area_km2?: number;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EnergyIndicator {
  id?: number;
  code: string;
  name: string;
  description?: string;
  unit: string;
  category: string;
  source: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Technology {
  id?: number;
  code: string;
  name: string;
  category: string;
  description?: string;
  is_renewable?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EnergyData {
  id?: number;
  country_id: number;
  indicator_id: number;
  year: number;
  value?: number;
  unit?: string;
  source: string;
  source_dataset?: string;
  confidence_level?: string;
  is_estimated?: boolean;
  metadata?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RenewableCapacity {
  id?: number;
  country_id: number;
  technology_id: number;
  year: number;
  capacity_mw: number;
  capacity_additions_mw?: number;
  capacity_retirements_mw?: number;
  generation_gwh?: number;
  capacity_factor?: number;
  source: string;
  data_quality?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnergyConsumption {
  id?: number;
  country_id: number;
  year: number;
  sector: string;
  fuel_type: string;
  consumption_mtoe?: number;
  consumption_twh?: number;
  per_capita_consumption?: number;
  source: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnergyProject {
  id?: number;
  name: string;
  country_id: number;
  technology_id?: number;
  project_type: string;
  status: string;
  capacity_mw?: number;
  estimated_generation_gwh?: number;
  investment_usd?: number;
  latitude?: number;
  longitude?: number;
  start_date?: string;
  commissioning_date?: string;
  decommissioning_date?: string;
  developer?: string;
  operator?: string;
  financing_type?: string;
  description?: string;
  data_source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClimateData {
  id?: number;
  country_id?: number;
  latitude: number;
  longitude: number;
  year: number;
  month?: number;
  solar_irradiance_kwh_m2?: number;
  wind_speed_ms?: number;
  temperature_avg_c?: number;
  temperature_min_c?: number;
  temperature_max_c?: number;
  precipitation_mm?: number;
  humidity_percent?: number;
  data_source: string;
  created_at?: string;
}

export interface User {
  id?: number;
  email: string;
  name: string;
  organization?: string;
  role?: string;
  country_focus?: string;
  is_active?: boolean;
  last_login?: string;
  api_key_hash?: string;
  rate_limit_tier?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiUsage {
  id?: number;
  user_id?: number;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms?: number;
  data_source?: string;
  request_size_bytes?: number;
  response_size_bytes?: number;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

export interface CountryEnergyProfile {
  id?: number;
  country_id: number;
  year: number;
  electricity_access_percent?: number;
  renewable_capacity_mw?: number;
  renewable_share_percent?: number;
  energy_intensity_mj_gdp?: number;
  co2_emissions_mt?: number;
  per_capita_consumption_mwh?: number;
  energy_security_index?: number;
  last_updated?: string;
}

export interface SDG7Indicators {
  id?: number;
  country_id: number;
  year: number;
  sdg_7_1_1?: number; // Electricity access
  sdg_7_1_2?: number; // Clean cooking
  sdg_7_2_1?: number; // Renewable energy share
  sdg_7_3_1?: number; // Energy intensity
  progress_status?: string;
  created_at?: string;
  updated_at?: string;
}

// Query interfaces
export interface CountryQuery {
  iso2_code?: string;
  iso3_code?: string;
  name?: string;
  region?: string;
  income_group?: string;
  limit?: number;
  offset?: number;
}

export interface EnergyDataQuery {
  country_id?: number;
  country_iso?: string;
  indicator_id?: number;
  indicator_code?: string;
  year?: number;
  year_start?: number;
  year_end?: number;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface RenewableCapacityQuery {
  country_id?: number;
  country_iso?: string;
  technology_id?: number;
  technology_code?: string;
  year?: number;
  year_start?: number;
  year_end?: number;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface EnergyProjectQuery {
  country_id?: number;
  country_iso?: string;
  technology_id?: number;
  project_type?: string;
  status?: string;
  capacity_min?: number;
  capacity_max?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  limit?: number;
  offset?: number;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
  table?: string;
}