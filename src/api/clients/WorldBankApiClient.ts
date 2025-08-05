/**
 * World Bank Open Data API Client
 * 
 * Comprehensive API client for World Bank Open Data with:
 * - 50+ energy indicators support
 * - 189+ countries coverage
 * - Advanced error handling and retry logic
 * - Rate limiting and caching
 * - Data validation and processing
 */

import {
  WorldBankApiResponse,
  WorldBankDataPoint,
  ProcessedEnergyData,
  ProcessedIndicatorData,
  ApiClientConfig,
  ApiResponse,
  ApiError,
  ApiErrorType,
  RateLimitStatus,
  RetryConfig,
  EnergyIndicatorConfig,
  ENERGY_INDICATORS,
  WORLD_BANK_COUNTRIES,
  CountryConfig,
  TimeSeriesData,
  DataQualityFlag,
  TrendDirection,
  DataReliability,
  IndicatorStatistics,
  DataQualityMetrics
} from '../types/EnergyDataTypes';

// =============================================================================
// RATE LIMITING AND QUEUE MANAGEMENT
// =============================================================================

interface RateLimitState {
  requestCount: number;
  windowStart: number;
  queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    request: () => Promise<any>;
  }>;
  isProcessing: boolean;
}

class RateLimiter {
  private state: RateLimitState = {
    requestCount: 0,
    windowStart: Date.now(),
    queue: [],
    isProcessing: false
  };

  constructor(private requestsPerMinute: number = 100) {}

  async execute<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.state.queue.push({ resolve, reject, request });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.state.isProcessing || this.state.queue.length === 0) {
      return;
    }

    this.state.isProcessing = true;

    while (this.state.queue.length > 0) {
      const now = Date.now();
      
      // Reset window if minute has passed
      if (now - this.state.windowStart >= 60000) {
        this.state.requestCount = 0;
        this.state.windowStart = now;
      }

      // Check if we can make a request
      if (this.state.requestCount >= this.requestsPerMinute) {
        const waitTime = 60000 - (now - this.state.windowStart);
        await this.delay(waitTime);
        continue;
      }

      const { resolve, reject, request } = this.state.queue.shift()!;
      this.state.requestCount++;

      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Small delay between requests to be respectful
      await this.delay(100);
    }

    this.state.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    const windowRemaining = 60000 - (now - this.state.windowStart);
    
    return {
      remaining: Math.max(0, this.requestsPerMinute - this.state.requestCount),
      reset: Math.ceil(windowRemaining / 1000),
      limit: this.requestsPerMinute
    };
  }
}

// =============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// =============================================================================

class RetryHandler {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error as any)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        console.warn(`${context} failed (attempt ${attempt}/${this.config.maxAttempts}), retrying in ${delay}ms:`, error);
        
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    if (error.statusCode) {
      return this.config.retryableStatusCodes.includes(error.statusCode);
    }
    
    // Retry on network errors
    return error.code === 'ENOTFOUND' || 
           error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.message?.includes('fetch');
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// CACHING SYSTEM
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  constructor(private ttlMinutes: number = 30) {}

  set<T>(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (this.ttlMinutes * 60 * 1000)
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// =============================================================================
// MAIN WORLD BANK API CLIENT
// =============================================================================

export class WorldBankApiClient {
  private readonly baseUrl = 'https://api.worldbank.org/v2';
  private readonly rateLimiter: RateLimiter;
  private readonly retryHandler: RetryHandler;
  private readonly cache: DataCache;
  private readonly config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: 'https://api.worldbank.org/v2',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitPerMinute: 100,
      cacheTtlMinutes: 30,
      enableMockData: false,
      ...config
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
    this.retryHandler = new RetryHandler({
      maxAttempts: this.config.retryAttempts,
      initialDelayMs: this.config.retryDelay,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableStatusCodes: [429, 500, 502, 503, 504]
    });
    this.cache = new DataCache(this.config.cacheTtlMinutes);
  }

  // ==========================================================================
  // PUBLIC API METHODS
  // ==========================================================================

  /**
   * Fetch energy indicators for specific countries
   */
  async getEnergyIndicators(
    countryCodes: string[] = ['WLD'],
    indicatorIds?: string[],
    startYear: number = 2015,
    endYear: number = 2023
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const indicators = indicatorIds || Object.keys(ENERGY_INDICATORS);
      const countries = countryCodes.length > 0 ? countryCodes : ['WLD'];
      
      console.log(`Fetching energy data for ${countries.length} countries, ${indicators.length} indicators (${startYear}-${endYear})`);

      const results: ProcessedEnergyData[] = [];

      // Process countries in batches to respect rate limits
      const batchSize = 5;
      for (let i = 0; i < countries.length; i += batchSize) {
        const countryBatch = countries.slice(i, i + batchSize);
        
        const batchPromises = countryBatch.map(countryCode => 
          this.fetchCountryData(countryCode, indicators, startYear, endYear)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else {
            console.warn(`Failed to fetch data for country ${countryBatch[index]}:`, result.reason);
          }
        });
      }

      return {
        data: results,
        error: null,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          rateLimit: this.rateLimiter.getRateLimitStatus()
        }
      };

    } catch (error) {
      return {
        data: null,
        error: this.createApiError(error as Error, ApiErrorType.SERVER_ERROR),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          rateLimit: this.rateLimiter.getRateLimitStatus()
        }
      };
    }
  }

  /**
   * Fetch data for a specific country and indicators
   */
  async fetchCountryData(
    countryCode: string,
    indicatorIds: string[],
    startYear: number,
    endYear: number
  ): Promise<ProcessedEnergyData | null> {
    const cacheKey = `country_${countryCode}_${indicatorIds.join(',')}_${startYear}_${endYear}`;
    
    // Check cache first
    const cached = this.cache.get<ProcessedEnergyData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch country metadata
      const countryInfo = WORLD_BANK_COUNTRIES.find(c => c.code === countryCode) || {
        code: countryCode,
        iso2Code: countryCode.slice(0, 2),
        name: countryCode,
        region: 'Unknown',
        subregion: 'Unknown',
        incomeLevel: 'Unknown',
        lendingType: 'Unknown',
        priority: 'tier_3' as any,
        dataAvailability: 'unknown' as any
      };

      // Fetch indicators in smaller batches
      const batchSize = 10;
      const allIndicatorData: ProcessedIndicatorData[] = [];

      for (let i = 0; i < indicatorIds.length; i += batchSize) {
        const indicatorBatch = indicatorIds.slice(i, i + batchSize);
        const batchData = await this.fetchIndicatorBatch(countryCode, indicatorBatch, startYear, endYear);
        allIndicatorData.push(...batchData);
      }

      const processedData: ProcessedEnergyData = {
        countryCode,
        countryName: countryInfo.name,
        region: countryInfo.region,
        incomeLevel: countryInfo.incomeLevel,
        indicators: allIndicatorData,
        lastUpdated: new Date().toISOString(),
        dataQuality: this.calculateDataQuality(allIndicatorData)
      };

      // Cache the result
      this.cache.set(cacheKey, processedData);
      
      return processedData;

    } catch (error) {
      console.error(`Error fetching data for country ${countryCode}:`, error);
      return null;
    }
  }

  /**
   * Fetch a batch of indicators for a country
   */
  private async fetchIndicatorBatch(
    countryCode: string,
    indicatorIds: string[],
    startYear: number,
    endYear: number
  ): Promise<ProcessedIndicatorData[]> {
    const indicatorString = indicatorIds.join(';');
    const url = `${this.baseUrl}/country/${countryCode}/indicator/${indicatorString}` +
                `?format=json&per_page=1000&date=${startYear}:${endYear}`;

    const rawData = await this.rateLimiter.execute(() => 
      this.retryHandler.execute(() => this.makeHttpRequest(url), `fetch_indicators_${countryCode}`)
    );

    return this.processIndicatorData(rawData, indicatorIds);
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private async makeHttpRequest(url: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ESMAP-AI-Platform/2.0 (Energy Research)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createHttpError(response.status, response.statusText, url);
      }

      const data = await response.json();
      
      // World Bank API returns [metadata, data] format
      if (Array.isArray(data) && data.length >= 2) {
        return data[1]; // Return the actual data array
      }

      return data;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw this.createApiError(error, ApiErrorType.TIMEOUT_ERROR);
      }
      
      throw error;
    }
  }

  /**
   * Process raw World Bank data into structured format
   */
  private processIndicatorData(
    rawData: WorldBankDataPoint[],
    requestedIndicators: string[]
  ): ProcessedIndicatorData[] {
    const indicatorMap = new Map<string, WorldBankDataPoint[]>();

    // Group data by indicator
    if (Array.isArray(rawData)) {
      rawData.forEach(dataPoint => {
        if (dataPoint && dataPoint.indicator && dataPoint.indicator.id) {
          const indicatorId = dataPoint.indicator.id;
          if (!indicatorMap.has(indicatorId)) {
            indicatorMap.set(indicatorId, []);
          }
          indicatorMap.get(indicatorId)!.push(dataPoint);
        }
      });
    }

    const processedIndicators: ProcessedIndicatorData[] = [];

    // Process each requested indicator
    requestedIndicators.forEach(indicatorId => {
      const indicatorConfig = ENERGY_INDICATORS[indicatorId];
      const dataPoints = indicatorMap.get(indicatorId) || [];

      if (indicatorConfig) {
        const timeSeries = this.createTimeSeries(dataPoints);
        const statistics = this.calculateIndicatorStatistics(timeSeries);

        processedIndicators.push({
          indicatorId,
          indicatorName: indicatorConfig.name,
          category: indicatorConfig.category,
          priority: indicatorConfig.priority,
          unit: indicatorConfig.unit,
          timeSeries,
          statistics
        });
      }
    });

    return processedIndicators;
  }

  /**
   * Create time series data from raw data points
   */
  private createTimeSeries(dataPoints: WorldBankDataPoint[]): TimeSeriesData[] {
    return dataPoints
      .filter(dp => dp.value !== null && dp.value !== undefined)
      .map(dp => ({
        year: parseInt(dp.date),
        value: dp.value!,
        quality: this.determineDataQuality(dp),
        source: dp.indicator?.sourceOrganization || 'World Bank',
        methodology: dp.indicator?.sourceNote
      }))
      .sort((a, b) => a.year - b.year);
  }

  /**
   * Calculate statistics for an indicator
   */
  private calculateIndicatorStatistics(timeSeries: TimeSeriesData[]): IndicatorStatistics {
    if (timeSeries.length === 0) {
      return {
        latest: null,
        latestYear: null,
        trend: TrendDirection.INSUFFICIENT_DATA,
        changeRate: null,
        completeness: 0,
        reliability: DataReliability.UNKNOWN
      };
    }

    const sortedData = [...timeSeries].sort((a, b) => b.year - a.year);
    const latest = sortedData[0];
    
    // Calculate trend
    const trend = this.calculateTrend(timeSeries);
    
    // Calculate change rate (CAGR over available period)
    const changeRate = this.calculateChangeRate(timeSeries);
    
    // Calculate completeness (data availability)
    const yearSpan = sortedData[0].year - sortedData[sortedData.length - 1].year + 1;
    const completeness = timeSeries.length / yearSpan;
    
    // Determine reliability
    const reliability = this.determineReliability(timeSeries);

    return {
      latest: latest.value,
      latestYear: latest.year,
      trend,
      changeRate,
      completeness,
      reliability
    };
  }

  /**
   * Calculate trend direction from time series
   */
  private calculateTrend(timeSeries: TimeSeriesData[]): TrendDirection {
    if (timeSeries.length < 3) {
      return TrendDirection.INSUFFICIENT_DATA;
    }

    const recentData = timeSeries.slice(-5); // Last 5 years
    const values = recentData.map(d => d.value);
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + (idx * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate coefficient of variation for volatility
    const mean = sumY / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const cv = Math.sqrt(variance) / mean;
    
    if (cv > 0.2) {
      return TrendDirection.VOLATILE;
    } else if (Math.abs(slope) < 0.01 * mean) {
      return TrendDirection.STABLE;
    } else if (slope > 0) {
      return TrendDirection.INCREASING;
    } else {
      return TrendDirection.DECREASING;
    }
  }

  /**
   * Calculate compound annual growth rate
   */
  private calculateChangeRate(timeSeries: TimeSeriesData[]): number | null {
    if (timeSeries.length < 2) {
      return null;
    }

    const sorted = [...timeSeries].sort((a, b) => a.year - b.year);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    if (first.value <= 0 || last.value <= 0) {
      return null; // Can't calculate CAGR for negative values
    }

    const years = last.year - first.year;
    const cagr = Math.pow(last.value / first.value, 1 / years) - 1;
    
    return cagr * 100; // Return as percentage
  }

  /**
   * Determine data quality flag
   */
  private determineDataQuality(dataPoint: WorldBankDataPoint): DataQualityFlag {
    if (dataPoint.obs_status) {
      switch (dataPoint.obs_status.toLowerCase()) {
        case 'e': return DataQualityFlag.ESTIMATED;
        case 'p': return DataQualityFlag.PROVISIONAL;
        case 'f': return DataQualityFlag.FORECAST;
        default: return DataQualityFlag.VERIFIED;
      }
    }
    return DataQualityFlag.VERIFIED;
  }

  /**
   * Determine overall data reliability
   */
  private determineReliability(timeSeries: TimeSeriesData[]): DataReliability {
    if (timeSeries.length === 0) {
      return DataReliability.UNKNOWN;
    }

    const verifiedCount = timeSeries.filter(d => d.quality === DataQualityFlag.VERIFIED).length;
    const verifiedRatio = verifiedCount / timeSeries.length;

    if (verifiedRatio >= 0.8) {
      return DataReliability.HIGH;
    } else if (verifiedRatio >= 0.5) {
      return DataReliability.MEDIUM;
    } else {
      return DataReliability.LOW;
    }
  }

  /**
   * Calculate overall data quality metrics
   */
  private calculateDataQuality(indicators: ProcessedIndicatorData[]): DataQualityMetrics {
    if (indicators.length === 0) {
      return { completeness: 0, timeliness: 0, consistency: 0, accuracy: 0, overall: 0 };
    }

    const completeness = indicators.reduce((sum, ind) => sum + ind.statistics.completeness, 0) / indicators.length;
    
    // Timeliness: how recent is the latest data
    const currentYear = new Date().getFullYear();
    const avgLatestYear = indicators
      .filter(ind => ind.statistics.latestYear)
      .reduce((sum, ind) => sum + ind.statistics.latestYear!, 0) / indicators.length;
    const timeliness = Math.max(0, 1 - (currentYear - avgLatestYear) / 5); // 5-year scale
    
    // Consistency: reliability scores
    const reliabilityScores = indicators.map(ind => {
      switch (ind.statistics.reliability) {
        case DataReliability.HIGH: return 1.0;
        case DataReliability.MEDIUM: return 0.7;
        case DataReliability.LOW: return 0.4;
        default: return 0.0;
      }
    });
    const consistency = reliabilityScores.reduce((sum, score) => sum + score, 0) / reliabilityScores.length;
    
    // Accuracy: based on data source reputation (World Bank is high quality)
    const accuracy = 0.9;
    
    const overall = (completeness * 0.3 + timeliness * 0.2 + consistency * 0.3 + accuracy * 0.2);

    return { completeness, timeliness, consistency, accuracy, overall };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get all available countries
   */
  getAvailableCountries(): CountryConfig[] {
    return [...WORLD_BANK_COUNTRIES];
  }

  /**
   * Get all available energy indicators
   */
  getAvailableIndicators(): EnergyIndicatorConfig[] {
    return Object.values(ENERGY_INDICATORS);
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return this.rateLimiter.getRateLimitStatus();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttlMinutes: number } {
    return {
      size: this.cache.size(),
      ttlMinutes: this.config.cacheTtlMinutes
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private generateRequestId(): string {
    return `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createApiError(error: Error, type: ApiErrorType): ApiError {
    const apiError = error as ApiError;
    apiError.type = type;
    return apiError;
  }

  private createHttpError(statusCode: number, statusText: string, url: string): ApiError {
    let type: ApiErrorType;
    
    switch (statusCode) {
      case 401:
      case 403:
        type = ApiErrorType.AUTHENTICATION_ERROR;
        break;
      case 404:
        type = ApiErrorType.DATA_NOT_FOUND;
        break;
      case 429:
        type = ApiErrorType.RATE_LIMIT_EXCEEDED;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = ApiErrorType.SERVER_ERROR;
        break;
      default:
        type = ApiErrorType.NETWORK_ERROR;
    }

    const error = new Error(`HTTP ${statusCode}: ${statusText}`) as ApiError;
    error.type = type;
    error.statusCode = statusCode;
    error.details = { url, statusText };
    
    return error;
  }
}

// =============================================================================
// EXPORT DEFAULT INSTANCE
// =============================================================================

export const worldBankApiClient = new WorldBankApiClient({
  rateLimitPerMinute: 100,
  retryAttempts: 3,
  cacheTtlMinutes: 30,
  timeout: 30000
});

export default worldBankApiClient;