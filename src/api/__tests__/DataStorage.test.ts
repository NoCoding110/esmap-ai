/**
 * Comprehensive Unit Tests for Data Storage System
 * 
 * Tests cover:
 * - JSON file storage functionality
 * - IndexedDB storage functionality
 * - Data validation and indexing
 * - Query operations and filtering
 * - Backup and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  JsonFileStorage,
  IndexedDbStorage,
  DataStorageManager,
  StorageType,
  StorageConfig
} from '../storage/DataStorage';
import {
  ProcessedEnergyData,
  ProcessedIndicatorData,
  EnergyIndicatorCategory,
  IndicatorPriority,
  DataQualityFlag,
  TrendDirection,
  DataReliability,
  TimeSeriesData
} from '../types/EnergyDataTypes';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn()
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Data Storage System', () => {
  let mockEnergyData: ProcessedEnergyData[];
  let storageConfig: StorageConfig;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();
    jest.clearAllMocks();

    // Create mock energy data
    mockEnergyData = [
      {
        countryCode: 'USA',
        countryName: 'United States',
        region: 'North America',
        incomeLevel: 'High income',
        indicators: [
          {
            indicatorId: 'EG.ELC.ACCS.ZS',
            indicatorName: 'Access to electricity (% of population)',
            category: EnergyIndicatorCategory.ACCESS,
            priority: IndicatorPriority.CRITICAL,
            unit: 'percent',
            timeSeries: [
              {
                year: 2021,
                value: 99.8,
                quality: DataQualityFlag.VERIFIED,
                source: 'World Bank'
              },
              {
                year: 2022,
                value: 99.9,
                quality: DataQualityFlag.VERIFIED,
                source: 'World Bank'
              },
              {
                year: 2023,
                value: 100.0,
                quality: DataQualityFlag.VERIFIED,
                source: 'World Bank'
              }
            ],
            statistics: {
              latest: 100.0,
              latestYear: 2023,
              trend: TrendDirection.INCREASING,
              changeRate: 0.1,
              completeness: 1.0,
              reliability: DataReliability.HIGH
            }
          },
          {
            indicatorId: 'EG.ELC.RENW.ZS',
            indicatorName: 'Renewable electricity output (% of total electricity output)',
            category: EnergyIndicatorCategory.RENEWABLE,
            priority: IndicatorPriority.HIGH,
            unit: 'percent',
            timeSeries: [
              {
                year: 2021,
                value: 20.1,
                quality: DataQualityFlag.VERIFIED,
                source: 'IEA'
              },
              {
                year: 2022,
                value: 21.5,
                quality: DataQualityFlag.VERIFIED,
                source: 'IEA'
              },
              {
                year: 2023,
                value: 23.2,
                quality: DataQualityFlag.ESTIMATED,
                source: 'IEA'
              }
            ],
            statistics: {
              latest: 23.2,
              latestYear: 2023,
              trend: TrendDirection.INCREASING,
              changeRate: 7.4,
              completeness: 1.0,
              reliability: DataReliability.HIGH
            }
          }
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        dataQuality: {
          completeness: 0.95,
          timeliness: 0.90,
          consistency: 0.92,  
          accuracy: 0.90,
          overall: 0.92
        }
      },
      {
        countryCode: 'CHN',
        countryName: 'China',
        region: 'East Asia & Pacific',
        incomeLevel: 'Upper middle income',
        indicators: [
          {
            indicatorId: 'EG.ELC.ACCS.ZS',
            indicatorName: 'Access to electricity (% of population)',
            category: EnergyIndicatorCategory.ACCESS,
            priority: IndicatorPriority.CRITICAL,
            unit: 'percent',
            timeSeries: [
              {
                year: 2021,
                value: 100.0,
                quality: DataQualityFlag.VERIFIED,
                source: 'World Bank'
              },
              {
                year: 2022,
                value: 100.0,
                quality: DataQualityFlag.VERIFIED,
                source: 'World Bank'
              },
              {
                year: 2023,
                value: 100.0,
                quality: DataQualityFlag.VERIFIED,
                source: 'World Bank'
              }
            ],
            statistics: {
              latest: 100.0,
              latestYear: 2023,
              trend: TrendDirection.STABLE,
              changeRate: 0.0,
              completeness: 1.0,
              reliability: DataReliability.HIGH
            }
          }
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z',
        dataQuality: {
          completeness: 0.88,
          timeliness: 0.90,
          consistency: 0.85,
          accuracy: 0.90,
          overall: 0.88
        }
      }
    ];

    storageConfig = {
      storageType: StorageType.JSON_FILE,
      maxStorageSize: 100,
      compressionEnabled: true,
      backupEnabled: true,
      indexingEnabled: true,
      retentionPeriodDays: 365
    };
  });

  // ==========================================================================
  // JSON FILE STORAGE TESTS
  // ==========================================================================

  describe('JsonFileStorage', () => {
    let storage: JsonFileStorage;

    beforeEach(async () => {
      storage = new JsonFileStorage(storageConfig);
      await storage.initialize();
    });

    it('should initialize successfully', async () => {
      const newStorage = new JsonFileStorage(storageConfig);
      await expect(newStorage.initialize()).resolves.not.toThrow();
    });

    it('should store energy data successfully', async () => {
      await expect(storage.store(mockEnergyData)).resolves.not.toThrow();

      // Verify data was stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'esmap_energy_data',
        expect.any(String)
      );
    });

    it('should retrieve all data when no query filters applied', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({});
      
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.fromCache).toBe(false);
    });

    it('should filter data by country codes', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({ countries: ['USA'] });
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].countryCode).toBe('USA');
      expect(result.total).toBe(1);
    });

    it('should filter data by indicator categories', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({ 
        categories: [EnergyIndicatorCategory.RENEWABLE] 
      });
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].countryCode).toBe('USA');
      expect(result.data[0].indicators).toHaveLength(1);
      expect(result.data[0].indicators[0].category).toBe(EnergyIndicatorCategory.RENEWABLE);
    });

    it('should filter data by specific indicators', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({ 
        indicators: ['EG.ELC.ACCS.ZS'] 
      });
      
      expect(result.data).toHaveLength(2); // Both countries have this indicator
      result.data.forEach(country => {
        expect(country.indicators).toHaveLength(1);
        expect(country.indicators[0].indicatorId).toBe('EG.ELC.ACCS.ZS');
      });
    });

    it('should filter data by year range', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({ 
        yearRange: [2022, 2023] 
      });
      
      expect(result.data).toHaveLength(2);
      result.data.forEach(country => {
        country.indicators.forEach(indicator => {
          indicator.timeSeries.forEach(point => {
            expect(point.year).toBeGreaterThanOrEqual(2022);
            expect(point.year).toBeLessThanOrEqual(2023);
          });
        });
      });
    });

    it('should apply pagination correctly', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({ 
        limit: 1, 
        offset: 0 
      });
      
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(1);

      const result2 = await storage.retrieve({ 
        limit: 1, 
        offset: 1 
      });
      
      expect(result2.data).toHaveLength(1);
      expect(result2.offset).toBe(1);
      expect(result.data[0].countryCode).not.toBe(result2.data[0].countryCode);
    });

    it('should sort data by country name', async () => {
      await storage.store(mockEnergyData);
      
      const result = await storage.retrieve({ 
        sortBy: 'country', 
        sortOrder: 'asc' 
      });
      
      expect(result.data[0].countryName).toBe('China');
      expect(result.data[1].countryName).toBe('United States');
    });

    it('should cache query results', async () => {
      await storage.store(mockEnergyData);
      
      // First query
      const result1 = await storage.retrieve({ countries: ['USA'] });
      expect(result1.fromCache).toBe(false);
      
      // Second identical query should be cached
      const result2 = await storage.retrieve({ countries: ['USA'] });
      expect(result2.fromCache).toBe(true);
    });

    it('should update existing country data', async () => {
      await storage.store(mockEnergyData);
      
      const updatedData = { ...mockEnergyData[0] };
      updatedData.lastUpdated = '2024-02-01T00:00:00.000Z';
      
      await storage.update('USA', updatedData);
      
      const result = await storage.retrieve({ countries: ['USA'] });
      expect(result.data[0].lastUpdated).toBe('2024-02-01T00:00:00.000Z');
    });

    it('should delete country data', async () => {
      await storage.store(mockEnergyData);
      
      await storage.delete('USA');
      
      const result = await storage.retrieve({});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].countryCode).toBe('CHN');
    });

    it('should create and restore backups', async () => {
      await storage.store(mockEnergyData);
      
      const backupId = await storage.backup();
      expect(backupId).toMatch(/energy_data_backup_/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        backupId,
        expect.any(String)
      );
      
      // Clear storage and restore
      await storage.delete('USA');
      await storage.delete('CHN');
      
      let result = await storage.retrieve({});
      expect(result.data).toHaveLength(0);
      
      await storage.restore(backupId);
      
      result = await storage.retrieve({});
      expect(result.data).toHaveLength(2);
    });

    it('should provide storage statistics', async () => {
      await storage.store(mockEnergyData);
      
      const stats = await storage.getStats(); 
      
      expect(stats.totalCountries).toBe(2);
      expect(stats.totalIndicators).toBe(3); // USA has 2, CHN has 1
      expect(stats.totalDataPoints).toBe(9); // Total time series points
      expect(stats.averageDataQuality).toBeCloseTo(0.90, 1);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeDefined();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it('should validate data before storing', async () => {
      const invalidData = [
        {
          countryCode: '', // Invalid: empty country code
          countryName: 'Invalid Country',
          region: 'Test Region',
          incomeLevel: 'Test Income',
          indicators: [],
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataQuality: {
            completeness: 0.5,
            timeliness: 0.5,
            consistency: 0.5,
            accuracy: 0.5,
            overall: 0.5
          }
        }
      ] as ProcessedEnergyData[];
      
      await expect(storage.store(invalidData)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // DATA STORAGE MANAGER TESTS
  // ==========================================================================

  describe('DataStorageManager', () => {
    let manager: DataStorageManager;

    beforeEach(async () => {
      manager = new DataStorageManager(storageConfig);
      await manager.initialize();
    });

    it('should initialize with correct storage type', async () => {
      const jsonManager = new DataStorageManager({
        ...storageConfig,
        storageType: StorageType.JSON_FILE
      });
      
      await expect(jsonManager.initialize()).resolves.not.toThrow();
    });

    it('should throw error for unsupported storage type', () => {
      expect(() => new DataStorageManager({
        ...storageConfig,
        storageType: 'UNSUPPORTED' as StorageType
      })).toThrow('Unsupported storage type');
    });

    it('should delegate operations to underlying storage', async () => {
      await manager.storeEnergyData(mockEnergyData);
      
      const result = await manager.queryEnergyData({ countries: ['USA'] });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].countryCode).toBe('USA');
      
      const stats = await manager.getStorageStats();
      expect(stats.totalCountries).toBe(2);
    });

    it('should handle backup and recovery operations', async () => {
      await manager.storeEnergyData(mockEnergyData);
      
      const backupId = await manager.createBackup();
      expect(backupId).toBeDefined();
      
      await manager.deleteCountryData('USA');
      let result = await manager.queryEnergyData({});
      expect(result.data).toHaveLength(1);
      
      await manager.restoreFromBackup(backupId);
      result = await manager.queryEnergyData({});
      expect(result.data).toHaveLength(2);
    });
  });

  // ==========================================================================
  // COMPLEX QUERY TESTS
  // ==========================================================================

  describe('Complex Query Operations', () => {
    let storage: JsonFileStorage;

    beforeEach(async () => {
      storage = new JsonFileStorage(storageConfig);
      await storage.initialize();
      await storage.store(mockEnergyData);
    });

    it('should handle multiple filter conditions', async () => {
      const result = await storage.retrieve({
        countries: ['USA'],
        categories: [EnergyIndicatorCategory.ACCESS],
        yearRange: [2022, 2023]
      });
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].countryCode).toBe('USA');
      expect(result.data[0].indicators).toHaveLength(1);
      expect(result.data[0].indicators[0].category).toBe(EnergyIndicatorCategory.ACCESS);
      
      // Check year range filtering
      result.data[0].indicators[0].timeSeries.forEach(point => {
        expect(point.year).toBeGreaterThanOrEqual(2022);
        expect(point.year).toBeLessThanOrEqual(2023);
      });
    });

    it('should handle priority-based filtering', async () => {
      const result = await storage.retrieve({
        priorities: [IndicatorPriority.CRITICAL]
      });
      
      expect(result.data).toHaveLength(2); // Both countries have critical indicators
      result.data.forEach(country => {
        country.indicators.forEach(indicator => {
          expect(indicator.priority).toBe(IndicatorPriority.CRITICAL);
        });
      });
    });

    it('should return empty results for non-matching filters', async () => {
      const result = await storage.retrieve({
        countries: ['NONEXISTENT']
      });
      
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should maintain data integrity across operations', async () => {
      // Store additional data
      const additionalData: ProcessedEnergyData[] = [
        {
          countryCode: 'IND',
          countryName: 'India',
          region: 'South Asia',
          incomeLevel: 'Lower middle income',
          indicators: [
            {
              indicatorId: 'EG.ELC.ACCS.ZS',
              indicatorName: 'Access to electricity (% of population)',
              category: EnergyIndicatorCategory.ACCESS,
              priority: IndicatorPriority.CRITICAL,
              unit: 'percent',
              timeSeries: [
                {
                  year: 2023,
                  value: 95.0,
                  quality: DataQualityFlag.VERIFIED,
                  source: 'World Bank'
                }
              ],
              statistics: {
                latest: 95.0,
                latestYear: 2023,
                trend: TrendDirection.INCREASING,
                changeRate: 2.5,
                completeness: 0.8,
                reliability: DataReliability.HIGH
              }
            }
          ],
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataQuality: {
            completeness: 0.80,
            timeliness: 0.90,
            consistency: 0.85,
            accuracy: 0.90,
            overall: 0.86
          }
        }
      ];
      
      await storage.store([...mockEnergyData, ...additionalData]);
      
      // Verify all data is present
      const allResult = await storage.retrieve({});
      expect(allResult.data).toHaveLength(3);
      
      // Verify specific queries still work
      const usaResult = await storage.retrieve({ countries: ['USA'] });
      expect(usaResult.data).toHaveLength(1);
      expect(usaResult.data[0].countryCode).toBe('USA');
      
      const accessResult = await storage.retrieve({ 
        indicators: ['EG.ELC.ACCS.ZS'] 
      });
      expect(accessResult.data).toHaveLength(3); // All countries have this indicator
    });
  });

  // ==========================================================================
  // PERFORMANCE AND EDGE CASE TESTS
  // ==========================================================================

  describe('Performance and Edge Cases', () => {
    let storage: JsonFileStorage;

    beforeEach(async () => {
      storage = new JsonFileStorage(storageConfig);
      await storage.initialize();
    });

    it('should handle empty data gracefully', async () => {
      await storage.store([]);
      
      const result = await storage.retrieve({});
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      
      const stats = await storage.getStats();
      expect(stats.totalCountries).toBe(0);
    });

    it('should handle large datasets efficiently', async () => {
      // Create a larger dataset
      const largeDataset: ProcessedEnergyData[] = [];
      
      for (let i = 0; i < 50; i++) {
        largeDataset.push({
          countryCode: `C${i.toString().padStart(3, '0')}`,
          countryName: `Country ${i}`,
          region: 'Test Region',
          incomeLevel: 'Test Income',
          indicators: [
            {
              indicatorId: 'EG.ELC.ACCS.ZS',
              indicatorName: 'Access to electricity (% of population)',
              category: EnergyIndicatorCategory.ACCESS,
              priority: IndicatorPriority.CRITICAL,
              unit: 'percent',
              timeSeries: [
                {
                  year: 2023,
                  value: 90 + Math.random() * 10,
                  quality: DataQualityFlag.VERIFIED,
                  source: 'World Bank'
                }
              ],
              statistics: {
                latest: 90 + Math.random() * 10,
                latestYear: 2023,
                trend: TrendDirection.STABLE,
                changeRate: 0,
                completeness: 1.0,
                reliability: DataReliability.HIGH
              }
            }
          ],
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataQuality: {
            completeness: 0.90,
            timeliness: 0.90,
            consistency: 0.90,
            accuracy: 0.90,
            overall: 0.90
          }
        });
      }
      
      const startTime = Date.now();
      await storage.store(largeDataset);
      const storeTime = Date.now() - startTime;
      
      expect(storeTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const queryStart = Date.now();
      const result = await storage.retrieve({ limit: 10 });
      const queryTime = Date.now() - queryStart;
      
      expect(queryTime).toBeLessThan(1000); // Queries should be fast
      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(50);
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = [
        {
          countryCode: 'TEST',
          countryName: 'Test Country',
          region: 'Test Region',
          incomeLevel: 'Test Income',
          indicators: [
            {
              indicatorId: 'TEST.INDICATOR',
              indicatorName: 'Test Indicator',
              category: EnergyIndicatorCategory.ACCESS,
              priority: IndicatorPriority.MEDIUM,
              unit: 'test',
              timeSeries: [
                {
                  year: 2023,
                  value: null, // Invalid value
                  quality: DataQualityFlag.VERIFIED,
                  source: 'Test'
                }
              ],
              statistics: {
                latest: null,
                latestYear: 2023,
                trend: TrendDirection.INSUFFICIENT_DATA,
                changeRate: null,
                completeness: 0.0,
                reliability: DataReliability.UNKNOWN
              }
            }
          ],
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataQuality: {
            completeness: 0.0,
            timeliness: 0.0,
            consistency: 0.0,
            accuracy: 0.0,
            overall: 0.0
          }
        }
      ] as ProcessedEnergyData[];
      
      // Should not throw, but may log warnings
      await expect(storage.store(malformedData)).resolves.not.toThrow();
      
      const result = await storage.retrieve({});
      expect(result.data).toHaveLength(1);
    });
  });
});