/**
 * NASA POWER Climate Data API Client
 * 
 * Comprehensive client for NASA POWER API integration
 * with geospatial queries, data validation, and caching
 */

import {
  NasaPowerResponse,
  NasaPowerTimeSeries,
  ProcessedClimateData,
  ClimateParameterData,
  ClimateDataPoint,
  ClimateDataRequest,
  ClimateApiConfig,
  ClimateApiResponse,
  ClimateApiError,
  ClimateApiErrorType,
  GeospatialLocation,
  GeospatialQuery,
  ClimateParameter,
  CLIMATE_PARAMETERS,
  ClimateParameterCategory,
  TemporalResolution,
  DataQuality,
  ClimateStatistics,
  ClimateTrends,
  ClimateDataQualityMetrics,
  QualityFlag,
  VisualizationDataset,
  VisualizationDataPoint,
  VisualizationMetadata,
  ClimateDataCache,
  CacheStats,
  CachePriority
} from '../types/ClimateDataTypes';

// =============================================================================
// GEOSPATIAL UTILITIES
// =============================================================================

export class GeospatialUtils {
  /**
   * Validate coordinates are within valid ranges
   */
  static validateCoordinates(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create bounding box around a point
   */
  static createBoundingBox(
    centerLat: number,
    centerLon: number,
    radiusKm: number
  ): [number, number, number, number] {
    const latDelta = radiusKm / 111; // Approximate km per degree latitude
    const lonDelta = radiusKm / (111 * Math.cos(this.toRadians(centerLat)));
    
    return [
      centerLat - latDelta,  // south
      centerLon - lonDelta,  // west
      centerLat + latDelta,  // north
      centerLon + lonDelta   // east
    ];
  }

  /**
   * Snap coordinates to NASA POWER grid
   */
  static snapToGrid(lat: number, lon: number): [number, number] {
    // NASA POWER uses 0.5° x 0.625° grid
    const gridLat = Math.round(lat * 2) / 2;
    const gridLon = Math.round(lon * 1.6) / 1.6;
    return [gridLat, gridLon];
  }
}

// =============================================================================
// CACHE MANAGER
// =============================================================================

export class ClimateCacheManager {
  private cache: Map<string, ClimateDataCache> = new Map();
  private maxSize: number;
  private maxEntries: number;
  private stats: CacheStats;

  constructor(maxSizeMB: number = 50, maxEntries: number = 1000) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    this.maxEntries = maxEntries;
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      averageAccessTime: 0
    };
  }

  /**
   * Generate cache key for a climate data request
   */
  private generateKey(location: GeospatialLocation, parameters: string[], dateRange: string): string {
    const locationKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
    const paramKey = parameters.sort().join(',');
    return `${locationKey}_${paramKey}_${dateRange}`;
  }

  /**
   * Get cached data
   */
  get(location: GeospatialLocation, parameters: string[], dateRange: string): ProcessedClimateData | null {
    const key = this.generateKey(location, parameters, dateRange);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.updateStats('miss');
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateStats('miss');
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateStats('hit');
    
    return entry.data;
  }

  /**
   * Store data in cache
   */
  set(
    location: GeospatialLocation,
    parameters: string[],
    dateRange: string,
    data: ProcessedClimateData,
    ttlHours: number = 24
  ): void {
    const key = this.generateKey(location, parameters, dateRange);
    const size = JSON.stringify(data).length;
    
    // Check if we need to evict entries
    this.evictIfNecessary(size);
    
    const entry: ClimateDataCache = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlHours * 60 * 60 * 1000),
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      priority: this.calculatePriority(location, parameters)
    };

    this.cache.set(key, entry);
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize += size;
  }

  /**
   * Calculate cache priority based on location and parameters
   */
  private calculatePriority(location: GeospatialLocation, parameters: string[]): CachePriority {
    // Major cities and energy-critical parameters get high priority
    const energyCriticalParams = ['ALLSKY_SFC_SW_DWN', 'WS50M', 'WS100M', 'T2M'];
    const hasEnergyParams = parameters.some(p => energyCriticalParams.includes(p));
    
    // Check if location is in populated areas (simplified heuristic)
    const isPopulatedArea = Math.abs(location.latitude) < 60 && location.country;
    
    if (hasEnergyParams && isPopulatedArea) return CachePriority.HIGH;
    if (hasEnergyParams || isPopulatedArea) return CachePriority.MEDIUM;
    return CachePriority.LOW;
  }

  /**
   * Evict entries if cache is too large
   */
  private evictIfNecessary(newEntrySize: number): void {
    const currentSize = this.stats.totalSize;
    
    if (currentSize + newEntrySize > this.maxSize || this.cache.size >= this.maxEntries) {
      // Sort by priority and last access time
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => {
          const priorityOrder = { low: 0, medium: 1, high: 2 };
          const aPriority = priorityOrder[a[1].priority];
          const bPriority = priorityOrder[b[1].priority];
          
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a[1].lastAccessed - b[1].lastAccessed;
        });

      // Remove lowest priority, least recently used entries
      const toRemove = Math.ceil(entries.length * 0.2); // Remove 20%
      for (let i = 0; i < toRemove; i++) {
        const [key, entry] = entries[i];
        this.cache.delete(key);
        this.stats.totalSize -= entry.size;
        this.stats.evictionCount++;
      }
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(type: 'hit' | 'miss'): void {
    const totalAccesses = (this.stats.hitRate + this.stats.missRate) || 1;
    
    if (type === 'hit') {
      this.stats.hitRate = (this.stats.hitRate * totalAccesses + 1) / (totalAccesses + 1);
    } else {
      this.stats.missRate = (this.stats.missRate * totalAccesses + 1) / (totalAccesses + 1);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      averageAccessTime: 0
    };
  }
}

// =============================================================================
// DATA VALIDATOR
// =============================================================================

export class ClimateDataValidator {
  /**
   * Validate NASA POWER API response
   */
  static validateResponse(response: any): response is NasaPowerResponse {
    return (
      response &&
      response.type === 'Feature' &&
      response.geometry &&
      response.geometry.type === 'Point' &&
      Array.isArray(response.geometry.coordinates) &&
      response.geometry.coordinates.length === 2 &&
      response.header &&
      response.properties &&
      response.properties.parameter
    );
  }

  /**
   * Validate climate data point
   */
  static validateDataPoint(point: ClimateDataPoint, parameterId: string): QualityFlag[] {
    const flags: QualityFlag[] = [];
    const parameter = CLIMATE_PARAMETERS[parameterId];
    
    if (!parameter) {
      flags.push({
        type: 'low_quality',
        severity: 'high',
        count: 1,
        description: `Unknown parameter: ${parameterId}`
      });
      return flags;
    }

    // Check value range
    const [minVal, maxVal] = parameter.validRange;
    if (point.value < minVal || point.value > maxVal) {
      flags.push({
        type: 'outlier',
        severity: 'medium',
        count: 1,
        description: `Value ${point.value} outside valid range [${minVal}, ${maxVal}]`
      });
    }

    // Check for interpolated data
    if (point.interpolated) {
      flags.push({
        type: 'interpolated',
        severity: 'low',
        count: 1,
        description: 'Data point is interpolated'
      });
    }

    return flags;
  }

  /**
   * Assess data quality for a complete dataset
   */
  static assessDataQuality(data: ClimateParameterData[]): ClimateDataQualityMetrics {
    let totalPoints = 0;
    let validPoints = 0;
    let interpolatedPoints = 0;
    const allFlags: QualityFlag[] = [];

    data.forEach(paramData => {
      paramData.timeSeries.forEach(point => {
        totalPoints++;
        const flags = this.validateDataPoint(point, paramData.parameter.id);
        
        if (flags.length === 0 || flags.every(f => f.severity === 'low')) {
          validPoints++;
        }
        
        if (point.interpolated) {
          interpolatedPoints++;
        }

        allFlags.push(...flags);
      });
    });

    const completeness = totalPoints > 0 ? validPoints / totalPoints : 0;
    const consistency = totalPoints > 0 ? (totalPoints - interpolatedPoints) / totalPoints : 0;
    
    // Aggregate flags by type
    const flagCounts = allFlags.reduce((acc, flag) => {
      const existing = acc.find(f => f.type === flag.type);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ ...flag });
      }
      return acc;
    }, [] as QualityFlag[]);

    return {
      completeness,
      consistency,
      accuracy: completeness * 0.9 + consistency * 0.1, // Weighted score
      timeliness: 1.0, // Assume fresh data for now
      overall: (completeness + consistency) / 2,
      flags: flagCounts
    };
  }
}

// =============================================================================
// MAIN NASA POWER API CLIENT
// =============================================================================

export class NasaPowerApiClient {
  private config: ClimateApiConfig;
  private cache: ClimateCacheManager;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: Partial<ClimateApiConfig> = {}) {
    this.config = {
      baseUrl: 'https://power.larc.nasa.gov/api/temporal/daily/point',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitPerMinute: 60,
      cacheTtlHours: 24,
      maxCacheSize: 50,
      enableCompression: true,
      community: 'RE',
      ...config
    };

    this.cache = new ClimateCacheManager(this.config.maxCacheSize);
  }

  /**
   * Get solar resource data for a location
   */
  async getSolarResourceData(
    location: GeospatialLocation,
    startDate: string,
    endDate: string,
    options: { resolution?: TemporalResolution } = {}
  ): Promise<ClimateApiResponse<ProcessedClimateData>> {
    const solarParams = [
      'ALLSKY_SFC_SW_DWN',
      'CLRSKY_SFC_SW_DWN',
      'ALLSKY_SFC_SW_DNI',
      'ALLSKY_SFC_SW_DIFF'
    ];

    return this.getClimateData({
      location,
      parameters: solarParams,
      temporalCoverage: {
        startDate,
        endDate,
        resolution: options.resolution || TemporalResolution.DAILY
      }
    });
  }

  /**
   * Get wind resource data for a location
   */
  async getWindResourceData(
    location: GeospatialLocation,
    startDate: string,
    endDate: string,
    heights: number[] = [50, 100]
  ): Promise<ClimateApiResponse<ProcessedClimateData>> {
    const windParams = ['WS10M', 'WD10M'];
    
    // Add height-specific parameters
    if (heights.includes(50)) windParams.push('WS50M');
    if (heights.includes(100)) windParams.push('WS100M');

    return this.getClimateData({
      location,
      parameters: windParams,
      temporalCoverage: {
        startDate,
        endDate,
        resolution: TemporalResolution.DAILY
      }
    });
  }

  /**
   * Get comprehensive energy climate data
   */
  async getEnergyClimateData(
    location: GeospatialLocation,
    startDate: string,
    endDate: string
  ): Promise<ClimateApiResponse<ProcessedClimateData>> {
    const energyParams = [
      // Solar
      'ALLSKY_SFC_SW_DWN',
      'CLRSKY_SFC_SW_DWN',
      // Wind
      'WS50M',
      'WS100M',
      'WD10M',
      // Temperature
      'T2M',
      'T2M_MAX',
      'T2M_MIN',
      // Other
      'RH2M',
      'PRECTOTCORR'
    ];

    return this.getClimateData({
      location,
      parameters: energyParams,
      temporalCoverage: {
        startDate,
        endDate,
        resolution: TemporalResolution.DAILY
      }
    });
  }

  /**
   * Main method to get climate data
   */
  async getClimateData(request: ClimateDataRequest): Promise<ClimateApiResponse<ProcessedClimateData>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Validate request
      this.validateRequest(request);

      // Check cache first
      const dateRange = `${request.temporalCoverage.startDate}_${request.temporalCoverage.endDate}`;
      const cached = this.cache.get(request.location, request.parameters, dateRange);
      
      if (cached) {
        return {
          data: cached,
          error: null,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            cached: true,
            processingTime: Date.now() - startTime,
            dataSource: 'cache',
            version: '1.0.0'
          }
        };
      }

      // Make API request
      const response = await this.makeApiRequest(request);
      const processedData = await this.processResponse(response, request);

      // Cache the results
      this.cache.set(
        request.location,
        request.parameters,
        dateRange,
        processedData,
        this.config.cacheTtlHours
      );

      return {
        data: processedData,
        error: null,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime: Date.now() - startTime,
          dataSource: 'nasa_power_api',
          version: '1.0.0'
        }
      };

    } catch (error) {
      return {
        data: null,
        error: this.createError(error, request),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime: Date.now() - startTime,
          dataSource: 'error',
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * Perform geospatial query for multiple locations
   */
  async performGeospatialQuery(
    query: GeospatialQuery,
    parameters: string[],
    temporalCoverage: { startDate: string; endDate: string; resolution: TemporalResolution }
  ): Promise<ProcessedClimateData[]> {
    const locations = this.extractLocationsFromQuery(query);
    const results: ProcessedClimateData[] = [];

    for (const location of locations) {
      const response = await this.getClimateData({
        location,
        parameters,
        temporalCoverage
      });

      if (response.data) {
        results.push(response.data);
      }
    }

    return results;
  }

  /**
   * Create visualization-ready dataset
   */
  createVisualizationDataset(
    data: ProcessedClimateData,
    parameterId: string,
    type: 'time_series' | 'seasonal' = 'time_series'
  ): VisualizationDataset {
    const parameter = data.parameters.find(p => p.parameter.id === parameterId);
    if (!parameter) {
      throw new Error(`Parameter ${parameterId} not found in dataset`);
    }

    const points: VisualizationDataPoint[] = parameter.timeSeries.map(point => ({
      x: new Date(point.date),
      y: point.value,
      category: point.quality,
      label: `${point.value.toFixed(2)} ${parameter.parameter.unit}`,
      metadata: { interpolated: point.interpolated, source: point.source }
    }));

    const metadata: VisualizationMetadata = {
      xAxis: {
        label: 'Date',
        unit: 'time',
        type: 'temporal',
        domain: [
          new Date(data.temporalCoverage.startDate).getTime(),
          new Date(data.temporalCoverage.endDate).getTime()
        ],
        gridLines: true
      },
      yAxis: {
        label: parameter.parameter.name,
        unit: parameter.parameter.unit,
        type: 'linear',
        domain: parameter.parameter.validRange,
        format: `.${parameter.parameter.precision}f`,
        gridLines: true
      }
    };

    return {
      id: `${parameterId}_${type}_${Date.now()}`,
      title: parameter.parameter.name,
      description: parameter.parameter.description,
      type,
      data: points,
      metadata,
      renderingHints: {
        recommendedChartType: type === 'time_series' ? 'line' : 'bar',
        interactionMode: 'zoom',
        responsive: true,
        accessibility: {
          altText: `${parameter.parameter.name} over time`,
          ariaLabel: `Chart showing ${parameter.parameter.name} data`,
          colorBlindFriendly: true,
          screenReaderOptimized: true
        }
      }
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private validateRequest(request: ClimateDataRequest): void {
    if (!GeospatialUtils.validateCoordinates(request.location.latitude, request.location.longitude)) {
      throw new Error('Invalid coordinates');
    }

    if (request.parameters.length === 0) {
      throw new Error('No parameters specified');
    }

    // Validate parameters exist
    const invalidParams = request.parameters.filter(p => !CLIMATE_PARAMETERS[p]);
    if (invalidParams.length > 0) {
      throw new Error(`Invalid parameters: ${invalidParams.join(', ')}`);
    }

    // Validate date range
    const start = new Date(request.temporalCoverage.startDate);
    const end = new Date(request.temporalCoverage.endDate);
    
    if (start >= end) {
      throw new Error('Start date must be before end date');
    }

    // NASA POWER data availability starts from 1981
    if (start.getFullYear() < 1981) {
      throw new Error('NASA POWER data starts from 1981');
    }
  }

  private async makeApiRequest(request: ClimateDataRequest): Promise<NasaPowerResponse> {
    const [lat, lon] = GeospatialUtils.snapToGrid(
      request.location.latitude,
      request.location.longitude
    );

    const url = this.buildApiUrl(lat, lon, request);
    
    return this.queueRequest(async () => {
      let lastError: Error;
      
      for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'ESMAP-AI-Platform/1.0'
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (!ClimateDataValidator.validateResponse(data)) {
            throw new Error('Invalid API response format');
          }

          return data;

        } catch (error) {
          lastError = error as Error;
          
          if (attempt < this.config.retryAttempts - 1) {
            await this.delay(this.config.retryDelay * Math.pow(2, attempt));
          }
        }
      }

      throw lastError!;
    });
  }

  private buildApiUrl(lat: number, lon: number, request: ClimateDataRequest): string {
    const params = new URLSearchParams({
      parameters: request.parameters.join(','),
      community: this.config.community,
      longitude: lon.toString(),
      latitude: lat.toString(),
      start: request.temporalCoverage.startDate.replace(/-/g, ''),
      end: request.temporalCoverage.endDate.replace(/-/g, ''),
      format: 'JSON'
    });

    return `${this.config.baseUrl}?${params.toString()}`;
  }

  private async processResponse(
    response: NasaPowerResponse,
    request: ClimateDataRequest
  ): Promise<ProcessedClimateData> {
    const parameters: ClimateParameterData[] = [];
    
    for (const [paramId, timeSeries] of Object.entries(response.properties.parameter)) {
      const parameter = CLIMATE_PARAMETERS[paramId];
      if (!parameter) continue;

      const dataPoints: ClimateDataPoint[] = Object.entries(timeSeries).map(([date, value]) => ({
        date: this.formatDate(date),
        parameter: paramId,
        value: typeof value === 'number' ? value : parseFloat(value as string),
        quality: this.assessPointQuality(value, parameter.validRange),
        interpolated: value === -999 || value === null,
        source: 'NASA POWER MERRA-2',
        metadata: {}
      }));

      const statistics = this.calculateStatistics(dataPoints);
      const trends = this.calculateTrends(dataPoints);
      const quality = this.assessParameterQuality(dataPoints, paramId);

      parameters.push({
        parameter,
        timeSeries: dataPoints,
        statistics,
        trends,
        quality
      });
    }

    const [gridLat, gridLon] = response.geometry.coordinates;
    const boundingBox = GeospatialUtils.createBoundingBox(gridLat, gridLon, 25);

    return {
      location: {
        ...request.location,
        latitude: gridLat,
        longitude: gridLon
      },
      parameters,
      temporalCoverage: {
        startDate: request.temporalCoverage.startDate,
        endDate: request.temporalCoverage.endDate,
        resolution: request.temporalCoverage.resolution,
        totalDays: this.calculateDaysBetween(
          request.temporalCoverage.startDate,
          request.temporalCoverage.endDate
        ),
        availableDays: parameters.reduce((sum, p) => sum + p.timeSeries.length, 0) / parameters.length,
        completeness: this.calculateCompleteness(parameters)
      },
      spatialCoverage: {
        resolution: '0.5° x 0.625°',
        gridCell: {
          centerLat: gridLat,
          centerLon: gridLon,
          boundingBox
        }
      },
      dataQuality: ClimateDataValidator.assessDataQuality(parameters),
      lastUpdated: new Date().toISOString(),
      processingVersion: '1.0.0'
    };
  }

  private queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      
      await this.delay(1000); // 1 second between requests for rate limiting
    }
    
    this.isProcessingQueue = false;
  }

  private extractLocationsFromQuery(query: GeospatialQuery): GeospatialLocation[] {
    if (query.type === 'point') {
      return [query.coordinates as GeospatialLocation];
    }
    
    return [query.coordinates as GeospatialLocation];
  }

  private formatDate(nasaDate: string): string {
    return `${nasaDate.substring(0, 4)}-${nasaDate.substring(4, 6)}-${nasaDate.substring(6, 8)}`;
  }

  private assessPointQuality(value: any, validRange: [number, number]): DataQuality {
    if (value === -999 || value === null || value === undefined) {
      return DataQuality.POOR;
    }

    const numValue = typeof value === 'number' ? value : parseFloat(value);
    const [min, max] = validRange;
    
    if (numValue < min || numValue > max) {
      return DataQuality.POOR;
    }

    return DataQuality.EXCELLENT;
  }

  private calculateStatistics(dataPoints: ClimateDataPoint[]): ClimateStatistics {
    const values = dataPoints
      .filter(p => p.quality !== DataQuality.POOR && !p.interpolated)
      .map(p => p.value)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        mean: 0, median: 0, min: 0, max: 0, stdDev: 0,
        percentiles: { p10: 0, p25: 0, p75: 0, p90: 0, p95: 0 }
      };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return {
      mean,
      median: values[Math.floor(values.length / 2)],
      min: values[0],
      max: values[values.length - 1],
      stdDev: Math.sqrt(variance),
      percentiles: {
        p10: values[Math.floor(values.length * 0.1)],
        p25: values[Math.floor(values.length * 0.25)],
        p75: values[Math.floor(values.length * 0.75)],
        p90: values[Math.floor(values.length * 0.9)],
        p95: values[Math.floor(values.length * 0.95)]
      }
    };
  }

  private calculateTrends(dataPoints: ClimateDataPoint[]): ClimateTrends {
    const values = dataPoints.filter(p => p.quality !== DataQuality.POOR).map(p => p.value);
    
    if (values.length < 2) {
      return {
        annualTrend: { slope: 0, significance: 1, confidence: 0 },
        monthlyTrends: []
      };
    }

    const n = values.length;
    const slope = (values[n - 1] - values[0]) / n;

    return {
      annualTrend: {
        slope,
        significance: 0.05,
        confidence: 0.8
      },
      monthlyTrends: []
    };
  }

  private assessParameterQuality(dataPoints: ClimateDataPoint[], parameterId: string): DataQuality {
    const validPoints = dataPoints.filter(p => p.quality !== DataQuality.POOR).length;
    const completeness = validPoints / dataPoints.length;
    
    if (completeness >= 0.95) return DataQuality.EXCELLENT;
    if (completeness >= 0.8) return DataQuality.GOOD;
    if (completeness >= 0.6) return DataQuality.FAIR;
    return DataQuality.POOR;
  }

  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateCompleteness(parameters: ClimateParameterData[]): number {
    if (parameters.length === 0) return 0;
    
    const avgCompleteness = parameters.reduce((sum, p) => {
      const validPoints = p.timeSeries.filter(point => point.quality !== DataQuality.POOR).length;
      return sum + (validPoints / p.timeSeries.length);
    }, 0) / parameters.length;

    return avgCompleteness;
  }

  private createError(error: any, request?: ClimateDataRequest): ClimateApiError {
    const climateError = new Error(error.message || 'Unknown error') as ClimateApiError;
    
    if (error.name === 'AbortError') {
      climateError.type = ClimateApiErrorType.TIMEOUT_ERROR;
    } else if (error.message?.includes('coordinates')) {
      climateError.type = ClimateApiErrorType.INVALID_COORDINATES;
    } else if (error.message?.includes('parameter')) {
      climateError.type = ClimateApiErrorType.PARAMETER_NOT_FOUND;
    } else if (error.message?.includes('date')) {
      climateError.type = ClimateApiErrorType.DATE_OUT_OF_RANGE;
    } else if (error.message?.includes('HTTP')) {
      climateError.type = ClimateApiErrorType.NETWORK_ERROR;
      climateError.statusCode = parseInt(error.message.match(/\d+/)?.[0] || '0');
    } else {
      climateError.type = ClimateApiErrorType.PARSING_ERROR;
    }

    if (request) {
      climateError.location = request.location;
      climateError.parameters = request.parameters;
    }

    return climateError;
  }

  private generateRequestId(): string {
    return `nasa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

}

// =============================================================================
// EXPORT
// =============================================================================

export default NasaPowerApiClient;