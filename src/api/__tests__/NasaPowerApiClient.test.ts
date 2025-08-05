/**
 * NASA POWER API Client Tests
 * 
 * Comprehensive test suite for NASA POWER climate data integration
 */

import NasaPowerApiClient, { GeospatialUtils, ClimateCacheManager, ClimateDataValidator } from '../clients/NasaPowerApiClient';
import {
  ClimateDataRequest,
  TemporalResolution,
  DataQuality,
  ClimateApiErrorType
} from '../types/ClimateDataTypes';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('NASA POWER API Client', () => {
  let client: NasaPowerApiClient;

  beforeEach(() => {
    client = new NasaPowerApiClient({
      rateLimitPerMinute: 120,
      cacheTtlHours: 1,
      timeout: 10000
    });
    mockFetch.mockClear();
  });

  describe('Constructor and Configuration', () => {
    test('should create client with default configuration', () => {
      const defaultClient = new NasaPowerApiClient();
      expect(defaultClient).toBeDefined();
      expect(defaultClient.getCacheStats).toBeDefined();
    });

    test('should create client with custom configuration', () => {
      const customClient = new NasaPowerApiClient({
        rateLimitPerMinute: 30,
        cacheTtlHours: 12,
        maxCacheSize: 100
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('Solar Resource Data', () => {
    test('should fetch solar resource data successfully', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749]
        },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER CERES/MERRA2 Native Resolution Daily Data',
            source: 'NASA POWER',
            'requested-url': 'test-url',
            'start-date': '20230101',
            'end-date': '20231231',
            'lat-lon': '37.77,-122.42',
            parameters: ['ALLSKY_SFC_SW_DWN']
          }
        },
        properties: {
          parameter: {
            'ALLSKY_SFC_SW_DWN': {
              '20230101': 4.5,
              '20230102': 4.8,
              '20230103': 4.2,
              '20230104': 5.1,
              '20230105': 4.9
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const result = await client.getSolarResourceData(
        { latitude: 37.7749, longitude: -122.4194 },
        '2023-01-01',
        '2023-01-05'
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.data?.parameters).toHaveLength(4); // Solar parameters
      expect(result.metadata.dataSource).toBe('nasa_power_api');
    });

    test('should handle solar data with missing values', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER',
            source: 'NASA POWER',
            'requested-url': 'test',
            'start-date': '20230101',
            'end-date': '20230103',
            'lat-lon': '37.77,-122.42',
            parameters: ['ALLSKY_SFC_SW_DWN']
          }
        },
        properties: {
          parameter: {
            'ALLSKY_SFC_SW_DWN': {
              '20230101': 4.5,
              '20230102': -999, // Missing value
              '20230103': 4.2
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getSolarResourceData(
        { latitude: 37.7749, longitude: -122.4194 },
        '2023-01-01',
        '2023-01-03'
      );

      expect(result.data).toBeDefined();
      const solarParam = result.data?.parameters.find(p => p.parameter.id === 'ALLSKY_SFC_SW_DWN');
      expect(solarParam?.timeSeries).toHaveLength(3);
      
      // Check that missing value is marked as poor quality
      const missingPoint = solarParam?.timeSeries.find(point => point.value === -999);
      expect(missingPoint?.quality).toBe(DataQuality.POOR);
    });
  });

  describe('Wind Resource Data', () => {
    test('should fetch wind resource data for multiple heights', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-95.3698, 29.7604] },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER',
            source: 'NASA POWER',
            'requested-url': 'test',
            'start-date': '20230101',
            'end-date': '20230105',
            'lat-lon': '29.76,-95.37',
            parameters: ['WS50M', 'WS100M']
          }
        },
        properties: {
          parameter: {
            'WS50M': {
              '20230101': 6.2,
              '20230102': 7.1,
              '20230103': 5.8,
              '20230104': 6.9,
              '20230105': 7.5
            },
            'WS100M': {
              '20230101': 7.8,
              '20230102': 8.5,
              '20230103': 7.2,
              '20230104': 8.1,
              '20230105': 8.9
            },
            'WD10M': {
              '20230101': 180,
              '20230102': 195,
              '20230103': 170,
              '20230104': 185,
              '20230105': 200
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getWindResourceData(
        { latitude: 29.7604, longitude: -95.3698 },
        '2023-01-01',
        '2023-01-05',
        [50, 100]
      );

      expect(result.data).toBeDefined();
      expect(result.data?.parameters).toHaveLength(3); // WS50M, WS100M, WD10M
      
      const wind50 = result.data?.parameters.find(p => p.parameter.id === 'WS50M');
      const wind100 = result.data?.parameters.find(p => p.parameter.id === 'WS100M');
      
      expect(wind50?.statistics.mean).toBeCloseTo(6.7, 1);
      expect(wind100?.statistics.mean).toBeCloseTo(8.1, 1);
    });
  });

  describe('Energy Climate Data', () => {
    test('should fetch comprehensive energy climate data', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER',
            source: 'NASA POWER',
            'requested-url': 'test',
            'start-date': '20230101',
            'end-date': '20230103',
            'lat-lon': '48.86,2.35',
            parameters: ['ALLSKY_SFC_SW_DWN', 'WS50M', 'T2M']
          }
        },
        properties: {
          parameter: {
            'ALLSKY_SFC_SW_DWN': {
              '20230101': 2.8,
              '20230102': 3.1,
              '20230103': 2.5
            },
            'WS50M': {
              '20230101': 4.2,
              '20230102': 3.8,
              '20230103': 4.6
            },
            'T2M': {
              '20230101': 8.5,
              '20230102': 9.2,
              '20230103': 7.8
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getEnergyClimateData(
        { latitude: 48.8566, longitude: 2.3522 },
        '2023-01-01',
        '2023-01-03'
      );

      expect(result.data).toBeDefined();
      expect(result.data?.parameters.length).toBeGreaterThanOrEqual(3);
      expect(result.data?.dataQuality.overall).toBeGreaterThan(0);
    });
  });

  describe('Caching System', () => {
    test('should cache and retrieve data', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER',
            source: 'NASA POWER',
            'requested-url': 'test',
            'start-date': '20230101',
            'end-date': '20230102',
            'lat-lon': '0,0',
            parameters: ['T2M']
          }
        },
        properties: {
          parameter: {
            'T2M': {
              '20230101': 25.0,
              '20230102': 26.0
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      // First request - should hit API
      const result1 = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-01',
        '2023-01-02'
      );

      expect(result1.metadata.cached).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second identical request - should hit cache
      const result2 = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-01',
        '2023-01-02'
      );

      expect(result2.metadata.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    test('should get cache statistics', () => {
      const stats = client.getCacheStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalSize');
    });

    test('should clear cache', () => {
      client.clearCache();
      const stats = client.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-01',
        '2023-01-02'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ClimateApiErrorType.PARSING_ERROR);
    });

    test('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-01',
        '2023-01-02'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ClimateApiErrorType.PARSING_ERROR);
    });

    test('should handle invalid coordinates', async () => {
      const result = await client.getSolarResourceData(
        { latitude: 100, longitude: 200 }, // Invalid coordinates
        '2023-01-01',
        '2023-01-02'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('coordinates');
    });

    test('should handle invalid date range', async () => {
      const result = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-02',
        '2023-01-01' // End before start
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('date');
    });
  });

  describe('Data Quality Assessment', () => {
    test('should assess data quality correctly', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER',
            source: 'NASA POWER',
            'requested-url': 'test',
            'start-date': '20230101',
            'end-date': '20230105',
            'lat-lon': '0,0',
            parameters: ['T2M']
          }
        },
        properties: {
          parameter: {
            'T2M': {
              '20230101': 25.0,
              '20230102': -999, // Missing
              '20230103': 26.0,
              '20230104': 24.5,
              '20230105': 25.5
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-01',
        '2023-01-05'
      );

      expect(result.data?.dataQuality).toBeDefined();
      expect(result.data?.dataQuality.completeness).toBeLessThan(1); // Due to missing data
      expect(result.data?.dataQuality.overall).toBeGreaterThan(0);
    });
  });

  describe('Visualization Data Creation', () => {
    test('should create visualization dataset', async () => {
      const mockResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        header: {
          version: '2.0',
          fill_value: -999,
          temporal_api: 'Daily',
          header: {
            title: 'NASA/POWER',
            source: 'NASA POWER',
            'requested-url': 'test',
            'start-date': '20230101',
            'end-date': '20230105',
            'lat-lon': '0,0',
            parameters: ['ALLSKY_SFC_SW_DWN']
          }
        },
        properties: {
          parameter: {
            'ALLSKY_SFC_SW_DWN': {
              '20230101': 5.0,
              '20230102': 5.2,
              '20230103': 4.8,
              '20230104': 5.1,
              '20230105': 4.9
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getSolarResourceData(
        { latitude: 0, longitude: 0 },
        '2023-01-01',
        '2023-01-05'
      );

      expect(result.data).toBeDefined();
      
      const visualization = client.createVisualizationDataset(
        result.data!,
        'ALLSKY_SFC_SW_DWN'
      );

      expect(visualization).toBeDefined();
      expect(visualization.type).toBe('time_series');
      expect(visualization.data).toHaveLength(5);
      expect(visualization.metadata.xAxis.type).toBe('temporal');
      expect(visualization.renderingHints.recommendedChartType).toBe('line');
    });
  });
});

// =============================================================================
// UTILITY CLASS TESTS
// =============================================================================

describe('GeospatialUtils', () => {
  test('should validate coordinates correctly', () => {
    expect(GeospatialUtils.validateCoordinates(0, 0)).toBe(true);
    expect(GeospatialUtils.validateCoordinates(90, 180)).toBe(true);
    expect(GeospatialUtils.validateCoordinates(-90, -180)).toBe(true);
    expect(GeospatialUtils.validateCoordinates(91, 0)).toBe(false);
    expect(GeospatialUtils.validateCoordinates(0, 181)).toBe(false);
  });

  test('should calculate distance between points', () => {
    const distance = GeospatialUtils.calculateDistance(0, 0, 1, 1);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeCloseTo(157, 0); // Approximate distance
  });

  test('should create bounding box', () => {
    const bbox = GeospatialUtils.createBoundingBox(0, 0, 100);
    expect(bbox).toHaveLength(4);
    expect(bbox[0]).toBeLessThan(0); // south
    expect(bbox[1]).toBeLessThan(0); // west
    expect(bbox[2]).toBeGreaterThan(0); // north
    expect(bbox[3]).toBeGreaterThan(0); // east
  });

  test('should snap coordinates to NASA POWER grid', () => {
    const [gridLat, gridLon] = GeospatialUtils.snapToGrid(12.34, 56.78);
    expect(gridLat).toBe(12.5); // Snapped to 0.5° grid
    expect(gridLon).toBeCloseTo(56.875, 3); // Snapped to 0.625° grid
  });
});

describe('ClimateCacheManager', () => {
  let cacheManager: ClimateCacheManager;

  beforeEach(() => {
    cacheManager = new ClimateCacheManager(10, 100); // 10MB, 100 entries
  });

  test('should store and retrieve data', () => {
    const location = { latitude: 0, longitude: 0 };
    const parameters = ['T2M'];
    const dateRange = '2023-01-01_2023-01-31';
    const mockData = {
      location,
      parameters: [],
      temporalCoverage: {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        resolution: TemporalResolution.DAILY,
        totalDays: 31,
        availableDays: 31,
        completeness: 1.0
      },
      spatialCoverage: {
        resolution: '0.5° x 0.625°',
        gridCell: {
          centerLat: 0,
          centerLon: 0,
          boundingBox: [-1, -1, 1, 1]
        }
      },
      dataQuality: {
        completeness: 1.0,
        consistency: 1.0,
        accuracy: 0.9,
        timeliness: 1.0,
        overall: 0.95,
        flags: []
      },
      lastUpdated: '2023-01-01T00:00:00Z',
      processingVersion: '1.0.0'
    };

    // Store data
    cacheManager.set(location, parameters, dateRange, mockData, 24);

    // Retrieve data
    const retrieved = cacheManager.get(location, parameters, dateRange);
    expect(retrieved).toEqual(mockData);

    // Get stats
    const stats = cacheManager.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalSize).toBeGreaterThan(0);
  });

  test('should handle cache expiration', (done) => {
    const location = { latitude: 0, longitude: 0 };
    const parameters = ['T2M'];
    const dateRange = '2023-01-01_2023-01-31';
    const mockData = {
      location,
      parameters: [],
      temporalCoverage: {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        resolution: TemporalResolution.DAILY,
        totalDays: 31,
        availableDays: 31,
        completeness: 1.0
      },
      spatialCoverage: {
        resolution: '0.5° x 0.625°',
        gridCell: {
          centerLat: 0,
          centerLon: 0,
          boundingBox: [-1, -1, 1, 1]
        }
      },
      dataQuality: {
        completeness: 1.0,
        consistency: 1.0,
        accuracy: 0.9,
        timeliness: 1.0,
        overall: 0.95,
        flags: []
      },
      lastUpdated: '2023-01-01T00:00:00Z',
      processingVersion: '1.0.0'
    };

    // Store with very short TTL
    cacheManager.set(location, parameters, dateRange, mockData, 0.001); // ~3.6 seconds

    setTimeout(() => {
      const retrieved = cacheManager.get(location, parameters, dateRange);
      expect(retrieved).toBeNull();
      done();
    }, 5000);
  }, 10000);

  test('should clear cache', () => {
    const location = { latitude: 0, longitude: 0 };
    const parameters = ['T2M'];
    const dateRange = '2023-01-01_2023-01-31';
    const mockData = {
      location,
      parameters: [],
      temporalCoverage: {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        resolution: TemporalResolution.DAILY,
        totalDays: 31,
        availableDays: 31,
        completeness: 1.0
      },
      spatialCoverage: {
        resolution: '0.5° x 0.625°',
        gridCell: {
          centerLat: 0,
          centerLon: 0,
          boundingBox: [-1, -1, 1, 1]
        }
      },
      dataQuality: {
        completeness: 1.0,
        consistency: 1.0,
        accuracy: 0.9,
        timeliness: 1.0,
        overall: 0.95,
        flags: []
      },
      lastUpdated: '2023-01-01T00:00:00Z',
      processingVersion: '1.0.0'
    };

    cacheManager.set(location, parameters, dateRange, mockData, 24);
    expect(cacheManager.getStats().totalEntries).toBe(1);

    cacheManager.clear();
    expect(cacheManager.getStats().totalEntries).toBe(0);
  });
});

describe('ClimateDataValidator', () => {
  test('should validate NASA POWER response format', () => {
    const validResponse = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      header: {},
      properties: {
        parameter: {}
      }
    };

    const invalidResponse = {
      type: 'Invalid',
      data: []
    };

    expect(ClimateDataValidator.validateResponse(validResponse)).toBe(true);
    expect(ClimateDataValidator.validateResponse(invalidResponse)).toBe(false);
  });

  test('should validate data points and generate quality flags', () => {
    const validDataPoint = {
      date: '2023-01-01',
      parameter: 'T2M',
      value: 25.0,
      quality: DataQuality.EXCELLENT,
      interpolated: false,
      source: 'NASA POWER',
      metadata: {}
    };

    const flags = ClimateDataValidator.validateDataPoint(validDataPoint, 'T2M');
    expect(Array.isArray(flags)).toBe(true);
  });

  test('should assess overall data quality', () => {
    const mockParameterData = [{
      parameter: {
        id: 'T2M',
        name: 'Temperature',
        description: 'Air temperature',
        unit: '°C',
        category: 'temperature' as any,
        validRange: [-50, 50],
        precision: 2,
        temporalResolution: [],
        spatialResolution: '0.5°'
      },
      timeSeries: [
        {
          date: '2023-01-01',
          parameter: 'T2M',
          value: 25.0,
          quality: DataQuality.EXCELLENT,
          interpolated: false,
          source: 'NASA POWER',
          metadata: {}
        }
      ],
      statistics: {
        mean: 25.0,
        median: 25.0,
        min: 25.0,
        max: 25.0,
        stdDev: 0,
        percentiles: { p10: 25, p25: 25, p75: 25, p90: 25, p95: 25 }
      },
      trends: {
        annualTrend: { slope: 0, significance: 1, confidence: 0 },
        monthlyTrends: []
      },
      quality: DataQuality.EXCELLENT
    }];

    const qualityMetrics = ClimateDataValidator.assessDataQuality(mockParameterData);
    expect(qualityMetrics.overall).toBeGreaterThan(0);
    expect(qualityMetrics.completeness).toBeGreaterThan(0);
  });
});