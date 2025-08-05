/**
 * Energy Data API Integration Module - Type Definitions
 * 
 * Comprehensive TypeScript interfaces for World Bank Open Data API
 * and energy indicator data structures with full type safety
 */

// =============================================================================
// WORLD BANK API RESPONSE TYPES
// =============================================================================

export interface WorldBankMetadata {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  sourceid: string;
  sourcename: string;
  lastupdated: string;
}

export interface WorldBankCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: {
    id: string;
    iso2code: string;
    value: string;
  };
  adminregion: {
    id: string;
    iso2code: string;
    value: string;
  };
  incomeLevel: {
    id: string;
    iso2code: string;
    value: string;
  };
  lendingType: {
    id: string;
    iso2code: string;
    value: string;
  };
  capitalCity: string;
  longitude: string;
  latitude: string;
}

export interface WorldBankIndicator {
  id: string;
  value: string;
  sourceNote: string;
  sourceOrganization: string;
}

export interface WorldBankDataPoint {
  indicator: WorldBankIndicator;
  country: WorldBankCountry;
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

export interface WorldBankApiResponse {
  metadata: WorldBankMetadata[];
  data: WorldBankDataPoint[];
}

// =============================================================================
// ENERGY INDICATOR DEFINITIONS
// =============================================================================

export interface EnergyIndicatorConfig {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: EnergyIndicatorCategory;
  priority: IndicatorPriority;
  frequency: DataFrequency;
  sourceOrganization: string;
  methodology?: string;
  limitations?: string;
}

export enum EnergyIndicatorCategory {
  ACCESS = 'access',
  CONSUMPTION = 'consumption',
  PRODUCTION = 'production',
  RENEWABLE = 'renewable',
  EFFICIENCY = 'efficiency',
  EMISSIONS = 'emissions',
  INFRASTRUCTURE = 'infrastructure',
  ECONOMIC = 'economic'
}

export enum IndicatorPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum DataFrequency {
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  MONTHLY = 'monthly',
  DAILY = 'daily'
}

// =============================================================================
// COMPREHENSIVE ENERGY INDICATORS CATALOG
// =============================================================================

export const ENERGY_INDICATORS: Record<string, EnergyIndicatorConfig> = {
  // Energy Access Indicators
  'EG.ELC.ACCS.ZS': {
    id: 'EG.ELC.ACCS.ZS',
    name: 'Access to electricity (% of population)',
    description: 'Percentage of population with access to electricity',
    unit: 'percent',
    category: EnergyIndicatorCategory.ACCESS,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'World Bank, Sustainable Energy for All (SE4ALL) database'
  },
  'EG.ELC.ACCS.RU.ZS': {
    id: 'EG.ELC.ACCS.RU.ZS',
    name: 'Access to electricity, rural (% of rural population)',
    description: 'Percentage of rural population with access to electricity',
    unit: 'percent',
    category: EnergyIndicatorCategory.ACCESS,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'World Bank, Sustainable Energy for All (SE4ALL) database'
  },
  'EG.ELC.ACCS.UR.ZS': {
    id: 'EG.ELC.ACCS.UR.ZS',
    name: 'Access to electricity, urban (% of urban population)',
    description: 'Percentage of urban population with access to electricity',
    unit: 'percent',
    category: EnergyIndicatorCategory.ACCESS,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'World Bank, Sustainable Energy for All (SE4ALL) database'
  },
  'EG.CFT.ACCS.ZS': {
    id: 'EG.CFT.ACCS.ZS',
    name: 'Access to clean fuels and technologies for cooking (% of population)',
    description: 'Percentage of population with primary reliance on clean fuels and technology for cooking',
    unit: 'percent',
    category: EnergyIndicatorCategory.ACCESS,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'World Bank, Sustainable Energy for All (SE4ALL) database'
  },
  'EG.CFT.ACCS.RU.ZS': {
    id: 'EG.CFT.ACCS.RU.ZS',
    name: 'Access to clean fuels and technologies for cooking, rural (% of rural population)',
    description: 'Percentage of rural population with primary reliance on clean fuels and technology for cooking',
    unit: 'percent',
    category: EnergyIndicatorCategory.ACCESS,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'World Bank, Sustainable Energy for All (SE4ALL) database'
  },
  'EG.CFT.ACCS.UR.ZS': {
    id: 'EG.CFT.ACCS.UR.ZS',
    name: 'Access to clean fuels and technologies for cooking, urban (% of urban population)',
    description: 'Percentage of urban population with primary reliance on clean fuels and technology for cooking',
    unit: 'percent',
    category: EnergyIndicatorCategory.ACCESS,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'World Bank, Sustainable Energy for All (SE4ALL) database'
  },

  // Energy Production Indicators
  'EG.ELC.PROD.KH': {
    id: 'EG.ELC.PROD.KH',
    name: 'Electricity production (kWh)',
    description: 'Total electricity generated by the country in kilowatt-hours',
    unit: 'kWh',
    category: EnergyIndicatorCategory.PRODUCTION,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.ELC.RENW.ZS': {
    id: 'EG.ELC.RENW.ZS',
    name: 'Renewable electricity output (% of total electricity output)',
    description: 'Renewable electricity output as a percentage of total electricity output',
    unit: 'percent',
    category: EnergyIndicatorCategory.RENEWABLE,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.ELC.COAL.ZS': {
    id: 'EG.ELC.COAL.ZS',
    name: 'Electricity production from coal sources (% of total)',
    description: 'Electricity production from coal sources as a percentage of total electricity production',
    unit: 'percent',
    category: EnergyIndicatorCategory.PRODUCTION,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.ELC.HYRO.ZS': {
    id: 'EG.ELC.HYRO.ZS',
    name: 'Electricity production from hydroelectric sources (% of total)',
    description: 'Electricity production from hydroelectric sources as a percentage of total electricity production',
    unit: 'percent',
    category: EnergyIndicatorCategory.RENEWABLE,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.ELC.NGAS.ZS': {
    id: 'EG.ELC.NGAS.ZS',
    name: 'Electricity production from natural gas sources (% of total)',
    description: 'Electricity production from natural gas sources as a percentage of total electricity production',
    unit: 'percent',
    category: EnergyIndicatorCategory.PRODUCTION,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.ELC.NUCL.ZS': {
    id: 'EG.ELC.NUCL.ZS',
    name: 'Electricity production from nuclear sources (% of total)',
    description: 'Electricity production from nuclear sources as a percentage of total electricity production',
    unit: 'percent',
    category: EnergyIndicatorCategory.PRODUCTION,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.ELC.PETR.ZS': {
    id: 'EG.ELC.PETR.ZS',
    name: 'Electricity production from oil sources (% of total)',
    description: 'Electricity production from oil, gas and coal sources as a percentage of total electricity production',
    unit: 'percent',
    category: EnergyIndicatorCategory.PRODUCTION,
    priority: IndicatorPriority.MEDIUM,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },

  // Energy Consumption Indicators
  'EG.USE.ELEC.KH.PC': {
    id: 'EG.USE.ELEC.KH.PC',
    name: 'Electric power consumption (kWh per capita)',
    description: 'Electric power consumption per capita in kilowatt-hours',
    unit: 'kWh per capita',
    category: EnergyIndicatorCategory.CONSUMPTION,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.USE.PCAP.KG.OE': {
    id: 'EG.USE.PCAP.KG.OE',
    name: 'Energy use (kg of oil equivalent per capita)',
    description: 'Energy use per capita in kilograms of oil equivalent',
    unit: 'kg of oil equivalent per capita',
    category: EnergyIndicatorCategory.CONSUMPTION,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.USE.COMM.FO.ZS': {
    id: 'EG.USE.COMM.FO.ZS',
    name: 'Fossil fuel energy consumption (% of total)',
    description: 'Fossil fuel comprises coal, oil, petroleum, and natural gas products',
    unit: 'percent',
    category: EnergyIndicatorCategory.CONSUMPTION,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.FEC.RNEW.ZS': {
    id: 'EG.FEC.RNEW.ZS',
    name: 'Renewable energy consumption (% of total final energy consumption)',
    description: 'Renewable energy consumption as a percentage of total final energy consumption',
    unit: 'percent',
    category: EnergyIndicatorCategory.RENEWABLE,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },

  // Energy Efficiency Indicators
  'EG.GDP.PUSE.KO.PP': {
    id: 'EG.GDP.PUSE.KO.PP',
    name: 'GDP per unit of energy use (PPP $ per kg of oil equivalent)',
    description: 'GDP per unit of energy use using purchasing power parity',
    unit: 'PPP $ per kg of oil equivalent',
    category: EnergyIndicatorCategory.EFFICIENCY,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },
  'EG.GDP.PUSE.KO.PP.KD': {
    id: 'EG.GDP.PUSE.KO.PP.KD',
    name: 'GDP per unit of energy use (constant 2017 PPP $ per kg of oil equivalent)',
    description: 'GDP per unit of energy use using constant purchasing power parity',
    unit: 'constant 2017 PPP $ per kg of oil equivalent',
    category: EnergyIndicatorCategory.EFFICIENCY,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'IEA Statistics'
  },

  // Carbon Emissions Indicators
  'EN.ATM.CO2E.PC': {
    id: 'EN.ATM.CO2E.PC',
    name: 'CO2 emissions (metric tons per capita)',
    description: 'Carbon dioxide emissions per capita in metric tons',
    unit: 'metric tons per capita',
    category: EnergyIndicatorCategory.EMISSIONS,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'Carbon Dioxide Information Analysis Center'
  },
  'EN.ATM.CO2E.KT': {
    id: 'EN.ATM.CO2E.KT',
    name: 'CO2 emissions (kt)',
    description: 'Total carbon dioxide emissions in kilotons',
    unit: 'kt',
    category: EnergyIndicatorCategory.EMISSIONS,
    priority: IndicatorPriority.CRITICAL,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'Carbon Dioxide Information Analysis Center'
  },
  'EN.ATM.CO2E.PP.GD': {
    id: 'EN.ATM.CO2E.PP.GD',
    name: 'CO2 emissions (kg per PPP $ of GDP)',
    description: 'Carbon dioxide emissions per dollar of GDP (PPP)',
    unit: 'kg per PPP $ of GDP',
    category: EnergyIndicatorCategory.EMISSIONS,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'Carbon Dioxide Information Analysis Center'
  },
  'EN.ATM.CO2E.PP.GD.KD': {
    id: 'EN.ATM.CO2E.PP.GD.KD',
    name: 'CO2 emissions (kg per 2017 PPP $ of GDP)',
    description: 'Carbon dioxide emissions per dollar of GDP using constant purchasing power parity',
    unit: 'kg per 2017 PPP $ of GDP',
    category: EnergyIndicatorCategory.EMISSIONS,
    priority: IndicatorPriority.HIGH,
    frequency: DataFrequency.ANNUAL,
    sourceOrganization: 'Carbon Dioxide Information Analysis Center'
  }
};

// =============================================================================
// DATA STORAGE AND PROCESSING TYPES
// =============================================================================

export interface ProcessedEnergyData {
  countryCode: string;
  countryName: string;
  region: string;
  incomeLevel: string;
  indicators: ProcessedIndicatorData[];
  lastUpdated: string;
  dataQuality: DataQualityMetrics;
}

export interface ProcessedIndicatorData {
  indicatorId: string;
  indicatorName: string;
  category: EnergyIndicatorCategory;
  priority: IndicatorPriority;
  unit: string;
  timeSeries: TimeSeriesData[];
  statistics: IndicatorStatistics;
}

export interface TimeSeriesData {
  year: number;
  value: number;
  quality: DataQualityFlag;
  source: string;
  methodology?: string;
}

export interface IndicatorStatistics {
  latest: number | null;
  latestYear: number | null;
  trend: TrendDirection;
  changeRate: number | null;
  completeness: number;
  reliability: DataReliability;
}

export enum DataQualityFlag {
  VERIFIED = 'verified',
  ESTIMATED = 'estimated',
  PROVISIONAL = 'provisional',
  FORECAST = 'forecast',
  MISSING = 'missing'
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile',
  INSUFFICIENT_DATA = 'insufficient_data'
}

export enum DataReliability {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  UNKNOWN = 'unknown'
}

export interface DataQualityMetrics {
  completeness: number;
  timeliness: number;
  consistency: number;
  accuracy: number;
  overall: number;
}

// =============================================================================
// API CLIENT CONFIGURATION TYPES
// =============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitPerMinute: number;
  cacheTtlMinutes: number;
  enableMockData: boolean;
  apiKey?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export enum ApiErrorType {
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_RESPONSE = 'invalid_response',
  DATA_NOT_FOUND = 'data_not_found',
  AUTHENTICATION_ERROR = 'authentication_error',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error',
  SERVER_ERROR = 'server_error'
}

export interface ApiError extends Error {
  type: ApiErrorType;
  statusCode?: number;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  metadata: {
    requestId: string;
    timestamp: string;
    cached: boolean;
    rateLimit: RateLimitStatus;
  };
}

export interface RateLimitStatus {
  remaining: number;
  reset: number;
  limit: number;
}

// =============================================================================
// COUNTRY AND REGION TYPES
// =============================================================================

export interface CountryConfig {
  code: string;
  iso2Code: string;
  name: string;
  region: string;
  subregion: string;
  incomeLevel: string;
  lendingType: string;
  priority: CountryPriority;
  dataAvailability: DataAvailabilityStatus;
}

export enum CountryPriority {
  TIER_1 = 'tier_1', // Major economies, high data availability
  TIER_2 = 'tier_2', // Medium economies, good data availability
  TIER_3 = 'tier_3', // Smaller economies, limited data availability
  SPECIAL = 'special' // Special territories, aggregates
}

export enum DataAvailabilityStatus {
  COMPREHENSIVE = 'comprehensive', // 90%+ indicators available
  GOOD = 'good',                   // 70-89% indicators available
  LIMITED = 'limited',             // 50-69% indicators available
  SPARSE = 'sparse',               // <50% indicators available
  UNKNOWN = 'unknown'              // Not assessed
}

// Export all country codes for World Bank API (189+ countries)
export const WORLD_BANK_COUNTRIES: CountryConfig[] = [
  // This would be populated with all 189+ countries, regions, and aggregates
  // For brevity, showing key examples here
  { code: 'WLD', iso2Code: 'WW', name: 'World', region: 'Aggregates', subregion: 'World', incomeLevel: 'Aggregates', lendingType: 'Aggregates', priority: CountryPriority.TIER_1, dataAvailability: DataAvailabilityStatus.COMPREHENSIVE },
  { code: 'USA', iso2Code: 'US', name: 'United States', region: 'North America', subregion: 'Northern America', incomeLevel: 'High income', lendingType: 'Not classified', priority: CountryPriority.TIER_1, dataAvailability: DataAvailabilityStatus.COMPREHENSIVE },
  { code: 'CHN', iso2Code: 'CN', name: 'China', region: 'East Asia & Pacific', subregion: 'Eastern Asia', incomeLevel: 'Upper middle income', lendingType: 'IBRD', priority: CountryPriority.TIER_1, dataAvailability: DataAvailabilityStatus.COMPREHENSIVE },
  { code: 'IND', iso2Code: 'IN', name: 'India', region: 'South Asia', subregion: 'Southern Asia', incomeLevel: 'Lower middle income', lendingType: 'IBRD', priority: CountryPriority.TIER_1, dataAvailability: DataAvailabilityStatus.COMPREHENSIVE },
  { code: 'DEU', iso2Code: 'DE', name: 'Germany', region: 'Europe & Central Asia', subregion: 'Western Europe', incomeLevel: 'High income', lendingType: 'Not classified', priority: CountryPriority.TIER_1, dataAvailability: DataAvailabilityStatus.COMPREHENSIVE },
  { code: 'JPN', iso2Code: 'JP', name: 'Japan', region: 'East Asia & Pacific', subregion: 'Eastern Asia', incomeLevel: 'High income', lendingType: 'Not classified', priority: CountryPriority.TIER_1, dataAvailability: DataAvailabilityStatus.COMPREHENSIVE },
  // ... (additional 183+ countries would be listed here)
];