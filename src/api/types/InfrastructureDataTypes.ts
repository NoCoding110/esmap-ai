/**
 * OpenStreetMap Infrastructure Data Types
 * 
 * Comprehensive TypeScript interfaces for OpenStreetMap infrastructure
 * integration focusing on energy infrastructure mapping
 */

// =============================================================================
// OVERPASS API TYPES
// =============================================================================

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  timestamp: string;
  version: number;
  changeset: number;
  user: string;
  uid: number;
  tags?: Record<string, string>;
  nodes?: number[]; // For ways
  members?: OverpassMember[]; // For relations
  geometry?: OverpassGeometry[]; // Enhanced with geometry
}

export interface OverpassMember {
  type: 'node' | 'way' | 'relation';
  ref: number;
  role: string;
}

export interface OverpassGeometry {
  lat: number;
  lon: number;
}

// =============================================================================
// INFRASTRUCTURE CLASSIFICATION TYPES
// =============================================================================

export enum InfrastructureType {
  POWER_PLANT = 'power_plant',
  SUBSTATION = 'substation',
  TRANSMISSION_LINE = 'transmission_line',
  DISTRIBUTION_LINE = 'distribution_line',
  POWER_TOWER = 'power_tower',
  POWER_POLE = 'power_pole',
  TRANSFORMER = 'transformer',
  SOLAR_FARM = 'solar_farm',
  WIND_FARM = 'wind_farm',
  HYDROELECTRIC = 'hydroelectric',
  NUCLEAR_PLANT = 'nuclear_plant',
  THERMAL_PLANT = 'thermal_plant',
  GEOTHERMAL_PLANT = 'geothermal_plant'
}

export enum PowerSource {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  NUCLEAR = 'nuclear',
  COAL = 'coal',
  GAS = 'gas',
  OIL = 'oil',
  BIOMASS = 'biomass',
  GEOTHERMAL = 'geothermal',
  WASTE = 'waste',
  TIDAL = 'tidal',
  WAVE = 'wave',
  UNKNOWN = 'unknown'
}

export enum VoltageLevel {
  LOW_VOLTAGE = 'low_voltage',      // < 1kV
  MEDIUM_VOLTAGE = 'medium_voltage', // 1kV - 35kV
  HIGH_VOLTAGE = 'high_voltage',     // 35kV - 100kV
  EXTRA_HIGH_VOLTAGE = 'extra_high_voltage', // 100kV - 800kV
  ULTRA_HIGH_VOLTAGE = 'ultra_high_voltage', // > 800kV
  UNKNOWN = 'unknown'
}

// =============================================================================
// PROCESSED INFRASTRUCTURE DATA STRUCTURES
// =============================================================================

export interface InfrastructureLocation {
  latitude: number;
  longitude: number;
  elevation?: number;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
}

export interface InfrastructureAsset {
  id: string;
  osmId: number;
  type: InfrastructureType;
  name?: string;
  location: InfrastructureLocation;
  properties: InfrastructureProperties;
  geometry: InfrastructureGeometry;
  metadata: InfrastructureMetadata;
  dataQuality: InfrastructureDataQuality;
  lastUpdated: string;
}

export interface InfrastructureProperties {
  powerSource?: PowerSource;
  capacity?: number; // MW for power plants, kV for substations/lines
  voltage?: number; // kV
  voltageLevel?: VoltageLevel;
  operator?: string;
  owner?: string;
  commissioned?: string; // ISO date
  decommissioned?: string; // ISO date
  status?: 'operational' | 'under_construction' | 'planned' | 'decommissioned';
  technology?: string;
  fuel?: string;
  efficiency?: number; // percentage
  connections?: string[]; // Connected infrastructure IDs
  tags: Record<string, string>; // Original OSM tags
}

export interface InfrastructureGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][];
  boundingBox?: [number, number, number, number]; // [south, west, north, east]
  area?: number; // km² for polygons
  length?: number; // km for lines
}

export interface InfrastructureMetadata {
  osmVersion: number;
  osmTimestamp: string;
  osmChangeset: number;
  osmUser: string;
  extractedAt: string;
  processingVersion: string;
  confidence: number; // 0-1
  validationFlags: ValidationFlag[];
}

export interface ValidationFlag {
  type: 'missing_data' | 'suspicious_value' | 'outdated' | 'inconsistent' | 'incomplete';
  severity: 'low' | 'medium' | 'high';
  field: string;
  message: string;
}

export interface InfrastructureDataQuality {
  completeness: number; // 0-1
  accuracy: number; // 0-1
  consistency: number; // 0-1
  timeliness: number; // 0-1
  overall: number; // 0-1
  flags: ValidationFlag[];
}

// =============================================================================
// QUERY AND SEARCH TYPES
// =============================================================================

export interface InfrastructureQuery {
  types: InfrastructureType[];
  boundingBox: [number, number, number, number]; // [south, west, north, east]
  powerSources?: PowerSource[];
  voltageRange?: [number, number]; // [min, max] in kV
  capacityRange?: [number, number]; // [min, max] in MW
  status?: ('operational' | 'under_construction' | 'planned' | 'decommissioned')[];
  operators?: string[];
  countries?: string[];
  maxResults?: number;
  includeGeometry?: boolean;
  qualityThreshold?: number; // Minimum data quality score (0-1)
}

export interface InfrastructureBoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
  center: {
    latitude: number;
    longitude: number;
  };
  area: number; // km²
}

export interface InfrastructureSearchResult {
  assets: InfrastructureAsset[];
  totalCount: number;
  boundingBox: InfrastructureBoundingBox;
  statistics: InfrastructureStatistics;
  queryExecutionTime: number; // ms
  cacheHit: boolean;
}

export interface InfrastructureStatistics {
  totalAssets: number;
  assetsByType: Record<InfrastructureType, number>;
  assetsByPowerSource: Record<PowerSource, number>;
  assetsByVoltageLevel: Record<VoltageLevel, number>;
  assetsByStatus: Record<string, number>;
  averageCapacity: number; // MW
  totalCapacity: number; // MW
  averageDataQuality: number; // 0-1
  geographicDistribution: {
    countries: Record<string, number>;
    regions: Record<string, number>;
  };
}

// =============================================================================
// GEOSPATIAL INDEX TYPES
// =============================================================================

export interface GeospatialIndex {
  quadtree: QuadTreeNode;
  spatialHashMap: Map<string, InfrastructureAsset[]>;
  boundingBoxes: Map<string, InfrastructureBoundingBox>;
  totalAssets: number;
  indexedAt: string;
}

export interface QuadTreeNode {
  bounds: InfrastructureBoundingBox;
  assets: InfrastructureAsset[];
  children?: QuadTreeNode[];
  level: number;
  maxCapacity: number;
}

export interface SpatialHash {
  precision: number; // Geohash precision
  buckets: Map<string, InfrastructureAsset[]>;
  bucketStats: Map<string, {
    count: number;
    types: Set<InfrastructureType>;
    lastUpdated: string;
  }>;
}

// =============================================================================
// DENSITY AND ANALYSIS TYPES
// =============================================================================

export interface InfrastructureDensity {
  gridSize: number; // km
  densityMap: DensityCell[][];
  statistics: DensityStatistics;
  heatmapData: HeatmapPoint[];
}

export interface DensityCell {
  bounds: InfrastructureBoundingBox;
  assetCount: number;
  totalCapacity: number; // MW
  dominantType: InfrastructureType;
  diversityIndex: number; // Shannon diversity index
  assets: string[]; // Asset IDs
}

export interface DensityStatistics {
  maxDensity: number; // assets per km²
  averageDensity: number;
  hotspots: Hotspot[];
  sparsityIndex: number; // 0-1, higher = more sparse
}

export interface Hotspot {
  center: InfrastructureLocation;
  radius: number; // km
  assetCount: number;
  dominantType: InfrastructureType;
  significance: number; // 0-1
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number; // 0-1
  assetCount: number;
  totalCapacity: number;
}

// =============================================================================
// NETWORK ANALYSIS TYPES
// =============================================================================

export interface InfrastructureNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  components: NetworkComponent[];
  metrics: NetworkMetrics;
}

export interface NetworkNode {
  id: string;
  assetId: string;
  type: InfrastructureType;
  location: InfrastructureLocation;
  connections: string[]; // Connected node IDs
  capacity: number;
  voltage: number;
  centrality: number; // Betweenness centrality
}

export interface NetworkEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'transmission' | 'distribution';
  voltage: number;
  capacity: number;
  length: number; // km
  resistance: number; // ohms
  geometry: InfrastructureGeometry;
}

export interface NetworkComponent {
  id: string;
  nodes: string[];
  edges: string[];
  type: 'generation' | 'transmission' | 'distribution';
  reliability: number; // 0-1
  redundancy: number; // 0-1
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  clusteringCoefficient: number;
  averagePathLength: number;
  networkDiameter: number;
  components: number;
  reliability: number;
}

// =============================================================================
// CACHING AND PERFORMANCE TYPES
// =============================================================================

export interface InfrastructureCache {
  key: string;
  data: InfrastructureSearchResult;
  query: InfrastructureQuery;
  timestamp: number;
  expiresAt: number;
  size: number; // bytes
  accessCount: number;
  lastAccessed: number;
  priority: CachePriority;
}

export enum CachePriority {
  HIGH = 'high',     // Frequently accessed regions
  MEDIUM = 'medium', // Occasionally accessed
  LOW = 'low'        // Rarely accessed
}

export interface CacheStatistics {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number;   // 0-1
  missRate: number;  // 0-1
  evictionCount: number;
  averageAccessTime: number; // ms
  memoryUsage: number; // MB
}

// =============================================================================
// API CONFIGURATION TYPES
// =============================================================================

export interface OverpassApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimitPerMinute: number;
  maxQuerySize: number; // bytes
  cacheTtlHours: number;
  maxCacheSize: number; // MB
  enableCompression: boolean;
  userAgent: string;
}

export interface InfrastructureMapperConfig extends OverpassApiConfig {
  maxAssetsPerQuery: number;
  minDataQualityScore: number;
  enableGeospatialIndexing: boolean;
  indexUpdateInterval: number; // hours
  enableNetworkAnalysis: boolean;
  densityGridSize: number; // km
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export enum InfrastructureApiErrorType {
  INVALID_BBOX = 'invalid_bbox',
  QUERY_TOO_LARGE = 'query_too_large',
  OVERPASS_ERROR = 'overpass_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INSUFFICIENT_DATA = 'insufficient_data',
  INDEX_ERROR = 'index_error'
}

export interface InfrastructureApiError extends Error {
  type: InfrastructureApiErrorType;
  statusCode?: number;
  retryAfter?: number;
  query?: InfrastructureQuery;
  details?: Record<string, any>;
}

export interface InfrastructureApiResponse<T> {
  data: T | null;
  error: InfrastructureApiError | null;
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
// VISUALIZATION DATA TYPES
// =============================================================================

export interface InfrastructureVisualization {
  id: string;
  title: string;
  description: string;
  type: 'map' | 'heatmap' | 'network' | 'density' | 'statistics';
  data: VisualizationLayer[];
  style: MapStyle;
  interactivity: InteractivityOptions;
  legend: LegendDefinition;
}

export interface VisualizationLayer {
  id: string;
  name: string;
  type: 'point' | 'line' | 'polygon' | 'heatmap';
  data: GeoJSONFeature[];
  style: LayerStyle;
  visible: boolean;
  interactive: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: {
    id: string;
    type: InfrastructureType;
    name?: string;
    capacity?: number;
    voltage?: number;
    operator?: string;
    status?: string;
    [key: string]: any;
  };
}

export interface LayerStyle {
  color: string;
  fillColor?: string;
  weight: number;
  opacity: number;
  fillOpacity?: number;
  radius?: number; // for points
  icon?: string;
  popup?: PopupTemplate;
}

export interface MapStyle {
  baseMap: 'osm' | 'satellite' | 'terrain' | 'dark' | 'light';
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
}

export interface InteractivityOptions {
  hover: boolean;
  click: boolean;
  select: boolean;
  filter: boolean;
  search: boolean;
  clustering: boolean;
  clusterRadius?: number;
}

export interface LegendDefinition {
  title: string;
  items: LegendItem[];
  position: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
}

export interface LegendItem {
  label: string;
  color: string;
  icon?: string;
  value?: string | number;
  description?: string;
}

export interface PopupTemplate {
  title: string;
  fields: PopupField[];
  customHTML?: string;
}

export interface PopupField {
  label: string;
  property: string;
  format?: 'text' | 'number' | 'date' | 'currency' | 'percentage';
  unit?: string;
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export {
  // Main data structures
  InfrastructureAsset,
  InfrastructureProperties,
  InfrastructureLocation,
  InfrastructureGeometry,

  // Query and search
  InfrastructureQuery,
  InfrastructureSearchResult,
  InfrastructureStatistics,

  // Geospatial indexing
  GeospatialIndex,
  QuadTreeNode,
  SpatialHash,

  // Density analysis
  InfrastructureDensity,
  DensityCell,
  HeatmapPoint,

  // Network analysis
  InfrastructureNetwork,
  NetworkNode,
  NetworkEdge,
  NetworkMetrics,

  // API types
  OverpassResponse,
  OverpassElement,
  InfrastructureApiResponse,
  InfrastructureApiError,

  // Configuration
  InfrastructureMapperConfig,
  OverpassApiConfig,

  // Caching
  InfrastructureCache,
  CacheStatistics,

  // Visualization
  InfrastructureVisualization,
  VisualizationLayer,
  GeoJSONFeature,

  // Enums
  InfrastructureType,
  PowerSource,
  VoltageLevel,
  InfrastructureApiErrorType,
  CachePriority
};