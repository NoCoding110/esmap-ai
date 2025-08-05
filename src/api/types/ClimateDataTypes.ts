/**
 * NASA POWER Climate Data Integration - Type Definitions
 * 
 * Comprehensive TypeScript interfaces for NASA POWER API integration
 * covering solar, wind, temperature, and precipitation data
 */

// =============================================================================
// NASA POWER API RESPONSE TYPES
// =============================================================================

export interface NasaPowerMetadata {
  version: string;
  fill_value: number;
  temporal_api: string;
  header: {
    title: string;
    source: string;
    "requested-url": string;
    "start-date": string;
    "end-date": string;
    "lat-lon": string;
    parameters: string[];
  };
}

export interface NasaPowerResponse {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  header: NasaPowerMetadata;
  properties: {
    parameter: Record<string, NasaPowerTimeSeries>;
  };
}

export interface NasaPowerTimeSeries {
  [date: string]: number; // YYYYMMDD format to value
}

// =============================================================================
// CLIMATE PARAMETER DEFINITIONS
// =============================================================================

export enum ClimateParameterCategory {
  SOLAR = 'solar',
  WIND = 'wind',
  TEMPERATURE = 'temperature',
  PRECIPITATION = 'precipitation',
  HUMIDITY = 'humidity',
  PRESSURE = 'pressure'
}

export enum DataQuality {
  EXCELLENT = 'excellent',    // >95% data availability
  GOOD = 'good',             // 80-95% data availability
  FAIR = 'fair',             // 60-79% data availability
  POOR = 'poor',             // <60% data availability
  UNKNOWN = 'unknown'        // Quality not assessed
}

export interface ClimateParameter {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: ClimateParameterCategory;
  validRange: [number, number];
  precision: number;
  temporalResolution: TemporalResolution[];
  spatialResolution: string; // e.g., "0.5° x 0.625°"
  sourceNote?: string;
}

export enum TemporalResolution {
  HOURLY = 'hourly',
  DAILY = 'daily',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  CLIMATOLOGY = 'climatology'
}

// NASA POWER Climate Parameters Catalog
export const CLIMATE_PARAMETERS: Record<string, ClimateParameter> = {
  // Solar Radiation Parameters
  'ALLSKY_SFC_SW_DWN': {
    id: 'ALLSKY_SFC_SW_DWN',
    name: 'All Sky Surface Shortwave Downward Irradiance',
    description: 'Total solar irradiance incident on a horizontal surface',
    unit: 'kW-hr/m^2/day',
    category: ClimateParameterCategory.SOLAR,
    validRange: [0, 15],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°',
    sourceNote: 'NASA POWER MERRA-2'
  },
  'CLRSKY_SFC_SW_DWN': {
    id: 'CLRSKY_SFC_SW_DWN',
    name: 'Clear Sky Surface Shortwave Downward Irradiance',
    description: 'Solar irradiance under clear sky conditions',
    unit: 'kW-hr/m^2/day',
    category: ClimateParameterCategory.SOLAR,
    validRange: [0, 20],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'ALLSKY_SFC_SW_DNI': {
    id: 'ALLSKY_SFC_SW_DNI',
    name: 'All Sky Surface Shortwave Direct Normal Irradiance',
    description: 'Direct normal solar irradiance',
    unit: 'kW-hr/m^2/day',
    category: ClimateParameterCategory.SOLAR,
    validRange: [0, 12],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'ALLSKY_SFC_SW_DIFF': {
    id: 'ALLSKY_SFC_SW_DIFF',
    name: 'All Sky Surface Shortwave Diffuse Irradiance',
    description: 'Diffuse solar irradiance on horizontal surface',
    unit: 'kW-hr/m^2/day',
    category: ClimateParameterCategory.SOLAR,
    validRange: [0, 8],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },

  // Wind Parameters
  'WS10M': {
    id: 'WS10M',
    name: 'Wind Speed at 10 Meters',
    description: 'Wind speed at 10 meters above surface',
    unit: 'm/s',
    category: ClimateParameterCategory.WIND,
    validRange: [0, 50],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'WS50M': {
    id: 'WS50M',
    name: 'Wind Speed at 50 Meters',
    description: 'Wind speed at 50 meters above surface (typical wind turbine hub height)',
    unit: 'm/s',
    category: ClimateParameterCategory.WIND,
    validRange: [0, 60],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'WS100M': {
    id: 'WS100M',
    name: 'Wind Speed at 100 Meters',
    description: 'Wind speed at 100 meters above surface (modern wind turbine hub height)',
    unit: 'm/s',
    category: ClimateParameterCategory.WIND,
    validRange: [0, 70],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'WD10M': {
    id: 'WD10M',
    name: 'Wind Direction at 10 Meters',
    description: 'Wind direction at 10 meters above surface',
    unit: 'degrees',
    category: ClimateParameterCategory.WIND,
    validRange: [0, 360],
    precision: 1,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },

  // Temperature Parameters
  'T2M': {
    id: 'T2M',
    name: 'Temperature at 2 Meters',
    description: 'Air temperature at 2 meters above surface',
    unit: '°C',
    category: ClimateParameterCategory.TEMPERATURE,
    validRange: [-70, 60],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'T2M_MAX': {
    id: 'T2M_MAX',
    name: 'Maximum Temperature at 2 Meters',
    description: 'Daily maximum air temperature at 2 meters',
    unit: '°C',
    category: ClimateParameterCategory.TEMPERATURE,
    validRange: [-60, 70],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },
  'T2M_MIN': {
    id: 'T2M_MIN',
    name: 'Minimum Temperature at 2 Meters',
    description: 'Daily minimum air temperature at 2 meters',
    unit: '°C',
    category: ClimateParameterCategory.TEMPERATURE,
    validRange: [-80, 50],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },

  // Precipitation Parameters
  'PRECTOTCORR': {
    id: 'PRECTOTCORR',
    name: 'Precipitation Corrected',
    description: 'Bias corrected total precipitation',
    unit: 'mm/day',
    category: ClimateParameterCategory.PRECIPITATION,
    validRange: [0, 500],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },

  // Humidity Parameters
  'RH2M': {
    id: 'RH2M',
    name: 'Relative Humidity at 2 Meters',
    description: 'Relative humidity at 2 meters above surface',
    unit: '%',
    category: ClimateParameterCategory.HUMIDITY,
    validRange: [0, 100],
    precision: 1,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  },

  // Pressure Parameters
  'PS': {
    id: 'PS',
    name: 'Surface Pressure',
    description: 'Atmospheric pressure at surface',
    unit: 'kPa',
    category: ClimateParameterCategory.PRESSURE,
    validRange: [50, 110],
    precision: 2,
    temporalResolution: [TemporalResolution.DAILY, TemporalResolution.MONTHLY, TemporalResolution.ANNUAL],
    spatialResolution: '0.5° x 0.625°'
  }
};

// =============================================================================
// PROCESSED CLIMATE DATA STRUCTURES
// =============================================================================

export interface GeospatialLocation {
  latitude: number;
  longitude: number;
  elevation?: number;
  locationName?: string;
  country?: string;
  region?: string;
  timezone?: string;
}

export interface ClimateDataPoint {
  date: string; // ISO 8601 format
  parameter: string;
  value: number;
  quality: DataQuality;
  interpolated: boolean;
  source: string;
  metadata?: Record<string, any>;
}

export interface ProcessedClimateData {
  location: GeospatialLocation;
  parameters: ClimateParameterData[];
  temporalCoverage: {
    startDate: string;
    endDate: string;
    resolution: TemporalResolution;
    totalDays: number;
    availableDays: number;
    completeness: number; // 0-1
  };
  spatialCoverage: {
    resolution: string;
    gridCell: {
      centerLat: number;
      centerLon: number;
      boundingBox: [number, number, number, number]; // [south, west, north, east]
    };
  };
  dataQuality: ClimateDataQualityMetrics;
  lastUpdated: string;
  processingVersion: string;
}

export interface ClimateParameterData {
  parameter: ClimateParameter;
  timeSeries: ClimateDataPoint[];
  statistics: ClimateStatistics;
  trends: ClimateTrends;
  quality: DataQuality;
}

export interface ClimateStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  percentiles: {
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    p95: number;
  };
  seasonalStats?: SeasonalStatistics;
}

export interface SeasonalStatistics {
  spring: ClimateStatistics;
  summer: ClimateStatistics;
  autumn: ClimateStatistics;
  winter: ClimateStatistics;
}

export interface ClimateTrends {
  annualTrend: {
    slope: number; // units per year
    significance: number; // p-value
    confidence: number; // R-squared
  };
  monthlyTrends: MonthlyTrend[];
  changePoints?: ChangePoint[];
}

export interface MonthlyTrend {
  month: number; // 1-12
  trend: number; // units per year
  significance: number;
}

export interface ChangePoint {
  date: string;
  significance: number;
  changeType: 'increase' | 'decrease' | 'level_shift';
  magnitude: number;
}

export interface ClimateDataQualityMetrics {
  completeness: number; // 0-1
  consistency: number; // 0-1
  accuracy: number; // 0-1
  timeliness: number; // 0-1
  overall: number; // 0-1
  flags: QualityFlag[];
}

export interface QualityFlag {
  type: 'missing_data' | 'outlier' | 'gap' | 'interpolated' | 'low_quality';
  severity: 'low' | 'medium' | 'high';
  count: number;
  description: string;
}

// =============================================================================
// API REQUEST AND CONFIGURATION TYPES
// =============================================================================

export interface ClimateDataRequest {
  location: GeospatialLocation;
  parameters: string[];
  temporalCoverage: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    resolution: TemporalResolution;
  };
  format?: 'json' | 'csv' | 'netcdf';
  community?: 'RE' | 'AG' | 'SB'; // Renewable Energy, Agriculture, Sustainable Buildings
  outputOptions?: {
    fillValue?: number;
    header?: boolean;
    timeAverage?: boolean;
  };
}

export interface ClimateApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitPerMinute: number;
  cacheTtlHours: number;
  maxCacheSize: number; // MB
  enableCompression: boolean;
  community: 'RE' | 'AG' | 'SB';
}

export interface GeospatialQuery {
  type: 'point' | 'region' | 'polygon';
  coordinates: GeospatialLocation | GeospatialLocation[];
  buffer?: number; // km radius for point queries
  resolution?: number; // degrees for region queries
}

// =============================================================================
// CACHING AND STORAGE TYPES
// =============================================================================

export interface ClimateDataCache {
  key: string; // Unique identifier for the data
  data: ProcessedClimateData;
  timestamp: number;
  expiresAt: number;
  size: number; // bytes
  accessCount: number;
  lastAccessed: number;
  priority: CachePriority;
}

export enum CachePriority {
  HIGH = 'high',     // Frequently accessed locations
  MEDIUM = 'medium', // Occasionally accessed
  LOW = 'low'        // Rarely accessed
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number;   // 0-1
  missRate: number;  // 0-1
  evictionCount: number;
  averageAccessTime: number; // ms
}

// =============================================================================
// VISUALIZATION-READY DATA STRUCTURES
// =============================================================================

export interface VisualizationDataset {
  id: string;
  title: string;
  description: string;
  type: 'time_series' | 'spatial_map' | 'correlation' | 'distribution' | 'seasonal';
  data: VisualizationDataPoint[];
  metadata: VisualizationMetadata;
  renderingHints: RenderingHints;
}

export interface VisualizationDataPoint {
  x: number | string | Date;
  y: number;
  z?: number; // for 3D visualizations
  category?: string;
  label?: string;
  color?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface VisualizationMetadata {
  xAxis: AxisMetadata;
  yAxis: AxisMetadata;
  zAxis?: AxisMetadata;
  colorScale?: ColorScaleMetadata;
  annotations?: Annotation[];
}

export interface AxisMetadata {
  label: string;
  unit: string;
  type: 'linear' | 'logarithmic' | 'categorical' | 'temporal';
  domain: [number, number] | string[];
  format?: string; // d3 format specifier
  gridLines?: boolean;
}

export interface ColorScaleMetadata {
  type: 'continuous' | 'discrete' | 'categorical';
  domain: [number, number] | string[];
  range: string[]; // color codes
  legend: {
    title: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    format?: string;
  };
}

export interface Annotation {
  type: 'text' | 'line' | 'rectangle' | 'circle';
  coordinates: [number, number];
  text?: string;
  style?: Record<string, any>;
}

export interface RenderingHints {
  recommendedChartType: 'line' | 'bar' | 'scatter' | 'heatmap' | 'contour' | 'box';
  interactionMode: 'zoom' | 'pan' | 'select' | 'hover';
  animation?: AnimationHints;
  responsive: boolean;
  accessibility: AccessibilityHints;
}

export interface AnimationHints {
  enabled: boolean;
  duration: number; // ms
  easing: string;
  stagger?: number; // ms delay between elements
}

export interface AccessibilityHints {
  altText: string;
  ariaLabel: string;
  colorBlindFriendly: boolean;
  screenReaderOptimized: boolean;
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export enum ClimateApiErrorType {
  INVALID_COORDINATES = 'invalid_coordinates',
  PARAMETER_NOT_FOUND = 'parameter_not_found',
  DATE_OUT_OF_RANGE = 'date_out_of_range',
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DATA_NOT_AVAILABLE = 'data_not_available',
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  CACHE_ERROR = 'cache_error',
  TIMEOUT_ERROR = 'timeout_error'
}

export interface ClimateApiError extends Error {
  type: ClimateApiErrorType;
  statusCode?: number;
  retryAfter?: number;
  location?: GeospatialLocation;
  parameters?: string[];
  details?: Record<string, any>;
}

export interface ClimateApiResponse<T> {
  data: T | null;
  error: ClimateApiError | null;
  metadata: {
    requestId: string;
    timestamp: string;
    cached: boolean;
    processingTime: number; // ms
    dataSource: string;
    version: string;
  };
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export {
  // Main response types
  NasaPowerResponse,
  NasaPowerMetadata,
  NasaPowerTimeSeries,

  // Parameter definitions
  ClimateParameter,
  CLIMATE_PARAMETERS,

  // Processed data structures
  ProcessedClimateData,
  ClimateParameterData,
  ClimateDataPoint,

  // Location and spatial types
  GeospatialLocation,
  GeospatialQuery,

  // Statistics and analysis
  ClimateStatistics,
  ClimateTrends,
  SeasonalStatistics,

  // Quality and validation
  ClimateDataQualityMetrics,
  QualityFlag,

  // API configuration
  ClimateDataRequest,
  ClimateApiConfig,

  // Caching
  ClimateDataCache,
  CacheStats,

  // Visualization
  VisualizationDataset,
  VisualizationDataPoint,
  VisualizationMetadata,

  // Error handling
  ClimateApiError,
  ClimateApiResponse,

  // Enums
  ClimateParameterCategory,
  TemporalResolution,
  DataQuality,
  CachePriority,
  ClimateApiErrorType
};