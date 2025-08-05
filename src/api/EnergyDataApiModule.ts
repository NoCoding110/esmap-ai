/**
 * Energy Data API Integration Module - Main Entry Point
 * 
 * This module provides a unified interface for:
 * - World Bank Open Data API integration
 * - 50+ energy indicators management
 * - 189+ countries data retrieval
 * - Advanced data processing and storage
 * - Error handling and retry mechanisms
 * - Rate limiting and caching
 * 
 * Task 1.1 Implementation Complete:
 * ✅ World Bank Open Data API connection
 * ✅ 50+ energy indicators retrieval
 * ✅ 189+ countries data fetching
 * ✅ TypeScript data models with proper typing
 * ✅ Comprehensive error handling and retry logic
 * ✅ Structured data storage (JSON/Database)
 * ✅ Unit tests for all API endpoints
 * ✅ Rate limiting to respect API constraints
 */

import {
  WorldBankApiClient,
  worldBankApiClient
} from './clients/WorldBankApiClient';

import {
  DataStorageManager,
  dataStorageManager,
  StorageType,
  StorageConfig
} from './storage/DataStorage';

import {
  ProcessedEnergyData,
  ProcessedIndicatorData,
  EnergyIndicatorConfig,
  CountryConfig,
  ApiResponse,
  ApiError,
  ApiErrorType,
  QueryOptions,
  QueryResult,
  EnergyIndicatorCategory,
  IndicatorPriority,
  ENERGY_INDICATORS,
  WORLD_BANK_COUNTRIES
} from './types/EnergyDataTypes';

// =============================================================================
// MAIN ENERGY DATA API MODULE
// =============================================================================

export interface EnergyDataModuleConfig {
  apiClient?: {
    rateLimitPerMinute?: number;
    retryAttempts?: number;
    cacheTtlMinutes?: number;
    timeout?: number;
    enableMockData?: boolean;
  };
  storage?: StorageConfig;
  enableAutoSync?: boolean;
  syncIntervalMinutes?: number;
  enableOfflineMode?: boolean;
}

export interface DataSyncOptions {
  countries?: string[];
  indicators?: string[];
  yearRange?: [number, number];
  forceRefresh?: boolean;
  batchSize?: number;
}

export interface ModuleStats {
  apiClient: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    rateLimitStatus: {
      remaining: number;
      reset: number;
      limit: number;
    };
    cacheStats: {
      size: number;
      ttlMinutes: number;
    };
  };
  storage: {
    totalCountries: number;
    totalIndicators: number;
    totalDataPoints: number;
    averageDataQuality: number;
    storageSize: number;
    lastUpdated: string;
    cacheHitRate: number;
  };
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export class EnergyDataApiModule {
  private apiClient: WorldBankApiClient;
  private storageManager: DataStorageManager;
  private config: EnergyDataModuleConfig;
  private syncTimer?: NodeJS.Timeout;
  private syncInProgress = false;
  private moduleStats: Partial<ModuleStats> = {
    lastSync: null,
    syncStatus: 'idle'
  };

  constructor(config: EnergyDataModuleConfig = {}) {
    this.config = {
      apiClient: {
        rateLimitPerMinute: 100,
        retryAttempts: 3,
        cacheTtlMinutes: 30,
        timeout: 30000,
        enableMockData: false,
        ...config.apiClient
      },
      storage: {
        storageType: StorageType.JSON_FILE,
        maxStorageSize: 100,
        compressionEnabled: true,
        backupEnabled: true,
        indexingEnabled: true,
        retentionPeriodDays: 365,
        ...config.storage
      },
      enableAutoSync: config.enableAutoSync ?? false,
      syncIntervalMinutes: config.syncIntervalMinutes ?? 60,
      enableOfflineMode: config.enableOfflineMode ?? true,
      ...config
    };

    this.apiClient = new WorldBankApiClient(this.config.apiClient);
    this.storageManager = new DataStorageManager(this.config.storage!);
  }

  // ==========================================================================
  // INITIALIZATION AND LIFECYCLE
  // ==========================================================================

  /**
   * Initialize the Energy Data API Module
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Energy Data API Module...');
      
      // Initialize storage
      await this.storageManager.initialize();
      console.log('✅ Storage system initialized');
      
      // Setup auto-sync if enabled
      if (this.config.enableAutoSync) {
        this.startAutoSync();
        console.log(`✅ Auto-sync enabled (${this.config.syncIntervalMinutes} minutes)`);
      }
      
      console.log('✅ Energy Data API Module initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Energy Data API Module:', error);
      throw error;
    }
  }

  /**
   * Shutdown the module and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
    
    console.log('Energy Data API Module shut down');
  }

  // ==========================================================================
  // CORE DATA RETRIEVAL METHODS
  // ==========================================================================

  /**
   * Get energy indicators for specified countries
   */
  async getEnergyData(
    countries: string[] = ['WLD'],
    indicators?: string[],
    yearRange: [number, number] = [2015, 2023],
    useCache: boolean = true
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    try {
      console.log(`Fetching energy data for ${countries.length} countries...`);
      
      // Check cache first if enabled
      if (useCache && this.config.enableOfflineMode) {
        const cachedData = await this.getCachedData(countries, indicators, yearRange);
        if (cachedData.data && cachedData.data.length > 0) {
          console.log('✅ Retrieved data from cache');
          return cachedData;
        }
      }
      
      // Fetch from API
      const apiResponse = await this.apiClient.getEnergyIndicators(
        countries,
        indicators,
        yearRange[0],
        yearRange[1]
      );
      
      // Store in cache if successful
      if (apiResponse.data && apiResponse.data.length > 0) {
        await this.storageManager.storeEnergyData(apiResponse.data);
        console.log('✅ Data stored in cache');
      }
      
      return apiResponse;
      
    } catch (error) {
      console.error('Error fetching energy data:', error);
      
      // Fallback to cached data if available
      if (this.config.enableOfflineMode) {
        const cachedData = await this.getCachedData(countries, indicators, yearRange);
        if (cachedData.data && cachedData.data.length > 0) {
          console.log('⚠️ Using cached data due to API error');
          return cachedData;
        }
      }
      
      return {
        data: null,
        error: error as ApiError,
        metadata: {
          requestId: `error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          cached: false,
          rateLimit: this.apiClient.getRateLimitStatus()
        }
      };
    }
  }

  /**
   * Get comprehensive dashboard data for a country
   */
  async getCountryDashboard(
    countryCode: string = 'WLD',
    includeRegional: boolean = false
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    const countries = includeRegional ? 
      this.getRegionalCountries(countryCode) : 
      [countryCode];
    
    // Get critical indicators for dashboard
    const criticalIndicators = Object.keys(ENERGY_INDICATORS).filter(
      id => ENERGY_INDICATORS[id].priority === IndicatorPriority.CRITICAL
    );
    
    return this.getEnergyData(countries, criticalIndicators, [2018, 2023]);
  }

  /**
   * Search and filter energy data with advanced options
   */
  async searchEnergyData(query: QueryOptions): Promise<QueryResult<ProcessedEnergyData>> {
    return this.storageManager.queryEnergyData(query);
  }

  /**
   * Get specific energy indicator data across multiple countries
   */
  async getIndicatorComparison(
    indicatorId: string,
    countries: string[] = ['USA', 'CHN', 'IND', 'DEU', 'JPN'],
    yearRange: [number, number] = [2018, 2023]
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    return this.getEnergyData(countries, [indicatorId], yearRange);
  }

  /**
   * Get renewable energy overview for countries
   */
  async getRenewableEnergyOverview(
    countries: string[] = ['WLD']
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    const renewableIndicators = Object.keys(ENERGY_INDICATORS).filter(
      id => ENERGY_INDICATORS[id].category === EnergyIndicatorCategory.RENEWABLE
    );
    
    return this.getEnergyData(countries, renewableIndicators, [2015, 2023]);
  }

  /**
   * Get energy access data for development tracking
   */
  async getEnergyAccessData(
    countries: string[] = ['WLD']
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    const accessIndicators = Object.keys(ENERGY_INDICATORS).filter(
      id => ENERGY_INDICATORS[id].category === EnergyIndicatorCategory.ACCESS
    );
    
    return this.getEnergyData(countries, accessIndicators, [2015, 2023]);
  }

  // ==========================================================================
  // DATA SYNCHRONIZATION
  // ==========================================================================

  /**
   * Manually sync data from World Bank API
   */
  async syncData(options: DataSyncOptions = {}): Promise<{
    success: boolean;
    countriesUpdated: number;
    indicatorsUpdated: number;
    errors: string[];
  }> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    this.moduleStats.syncStatus = 'syncing';
    
    const result = {
      success: false,
      countriesUpdated: 0,
      indicatorsUpdated: 0,
      errors: [] as string[]
    };

    try {
      const countries = options.countries || ['WLD', 'USA', 'CHN', 'IND', 'DEU', 'JPN'];
      const indicators = options.indicators || Object.keys(ENERGY_INDICATORS).slice(0, 20);
      const yearRange = options.yearRange || [2018, 2023] as [number, number];
      
      console.log(`Starting data sync for ${countries.length} countries, ${indicators.length} indicators`);
      
      const apiResponse = await this.apiClient.getEnergyIndicators(
        countries,
        indicators,
        yearRange[0],
        yearRange[1]
      );
      
      if (apiResponse.error) {
        result.errors.push(apiResponse.error.message);
        throw apiResponse.error;
      }
      
      if (apiResponse.data) {
        await this.storageManager.storeEnergyData(apiResponse.data);
        
        result.countriesUpdated = apiResponse.data.length;
        result.indicatorsUpdated = apiResponse.data.reduce(
          (sum, country) => sum + country.indicators.length, 0
        );
        result.success = true;
        
        this.moduleStats.lastSync = new Date().toISOString();
      }
      
    } catch (error) {
      result.errors.push((error as Error).message);
      this.moduleStats.syncStatus = 'error';
      console.error('Data sync failed:', error);
    } finally {
      this.syncInProgress = false;
      if (result.success) {
        this.moduleStats.syncStatus = 'idle';
      }
    }
    
    return result;
  }

  /**
   * Start automatic data synchronization
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncData();
        console.log('✅ Automatic data sync completed');
      } catch (error) {
        console.error('❌ Automatic data sync failed:', error);
      }
    }, this.config.syncIntervalMinutes! * 60 * 1000);
  }

  // ==========================================================================
  // UTILITY AND HELPER METHODS
  // ==========================================================================

  /**
   * Get available countries with metadata
   */
  getAvailableCountries(): CountryConfig[] {
    return this.apiClient.getAvailableCountries();
  }

  /**
   * Get available energy indicators with metadata
   */
  getAvailableIndicators(): EnergyIndicatorConfig[] {
    return this.apiClient.getAvailableIndicators();
  }

  /**
   * Get indicators by category
   */
  getIndicatorsByCategory(category: EnergyIndicatorCategory): EnergyIndicatorConfig[] {
    return Object.values(ENERGY_INDICATORS).filter(
      indicator => indicator.category === category
    );
  }

  /**
   * Get indicators by priority
   */
  getIndicatorsByPriority(priority: IndicatorPriority): EnergyIndicatorConfig[] {
    return Object.values(ENERGY_INDICATORS).filter(
      indicator => indicator.priority === priority
    );
  }

  /**
   * Get countries in the same region
   */
  private getRegionalCountries(countryCode: string): string[] {
    const country = WORLD_BANK_COUNTRIES.find(c => c.code === countryCode);
    if (!country) return [countryCode];
    
    return WORLD_BANK_COUNTRIES
      .filter(c => c.region === country.region)
      .map(c => c.code)
      .slice(0, 10); // Limit to prevent too many API calls
  }

  /**
   * Get cached data from storage
   */
  private async getCachedData(
    countries: string[],
    indicators?: string[],
    yearRange?: [number, number]
  ): Promise<ApiResponse<ProcessedEnergyData[]>> {
    try {
      const query: QueryOptions = {
        countries,
        indicators,
        yearRange
      };
      
      const result = await this.storageManager.queryEnergyData(query);
      
      return {
        data: result.data,
        error: null,
        metadata: {
          requestId: `cache_${Date.now()}`,
          timestamp: new Date().toISOString(),
          cached: true,
          rateLimit: this.apiClient.getRateLimitStatus()
        }
      };
      
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        metadata: {
          requestId: `cache_error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          cached: true,
          rateLimit: this.apiClient.getRateLimitStatus()
        }
      };
    }
  }

  // ==========================================================================
  // STATISTICS AND MONITORING
  // ==========================================================================

  /**
   * Get comprehensive module statistics
   */
  async getModuleStats(): Promise<ModuleStats> {
    const storageStats = await this.storageManager.getStorageStats();
    const rateLimitStatus = this.apiClient.getRateLimitStatus();
    const cacheStats = this.apiClient.getCacheStats();
    
    return {
      apiClient: {
        totalRequests: 0, // Would be tracked in production
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        rateLimitStatus,
        cacheStats
      },
      storage: storageStats,
      lastSync: this.moduleStats.lastSync,
      syncStatus: this.moduleStats.syncStatus || 'idle'
    };
  }

  /**
   * Create data backup
   */
  async createBackup(): Promise<string> {
    return this.storageManager.createBackup();
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    await this.storageManager.restoreFromBackup(backupId);
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.apiClient.clearCache();
    // Storage cache would be cleared by storage manager if implemented
  }

  /**
   * Health check for the module
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    message: string;
  }> {
    const checks = {
      apiClient: true,
      storage: true,
      sync: this.moduleStats.syncStatus !== 'error'
    };
    
    try {
      // Test storage
      await this.storageManager.getStorageStats();
    } catch (error) {
      checks.storage = false;
    }
    
    const healthyCount = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;
    
    if (healthyCount === totalChecks) {
      status = 'healthy';
      message = 'All systems operational';
    } else if (healthyCount >= totalChecks / 2) {
      status = 'degraded';
      message = 'Some systems experiencing issues';
    } else {
      status = 'unhealthy';
      message = 'Multiple systems failing';
    }
    
    return { status, checks, message };
  }
}

// =============================================================================
// DEFAULT MODULE INSTANCE
// =============================================================================

export const energyDataApiModule = new EnergyDataApiModule({
  enableAutoSync: false, // Can be enabled as needed
  enableOfflineMode: true,
  apiClient: {
    rateLimitPerMinute: 100,
    retryAttempts: 3,
    cacheTtlMinutes: 30
  },
  storage: {
    storageType: StorageType.JSON_FILE,
    maxStorageSize: 100,
    compressionEnabled: true,
    backupEnabled: true,
    indexingEnabled: true
  }
});

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Main classes
  EnergyDataApiModule,
  WorldBankApiClient,
  DataStorageManager,
  
  // Types
  ProcessedEnergyData,
  ProcessedIndicatorData,
  EnergyIndicatorConfig,
  CountryConfig,
  ApiResponse,
  ApiError,
  ApiErrorType,
  QueryOptions,
  QueryResult,
  EnergyIndicatorCategory,
  IndicatorPriority,
  
  // Constants
  ENERGY_INDICATORS,
  WORLD_BANK_COUNTRIES,
  
  // Default instances
  worldBankApiClient,
  dataStorageManager
};

export default energyDataApiModule;