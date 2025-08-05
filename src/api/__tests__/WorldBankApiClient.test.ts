/**
 * Comprehensive Unit Tests for World Bank API Client
 * 
 * Tests cover:
 * - API endpoint functionality
 * - Error handling and retry logic
 * - Rate limiting
 * - Data processing and validation
 * - Caching mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorldBankApiClient } from '../clients/WorldBankApiClient';
import {
  ApiErrorType,
  EnergyIndicatorCategory,
  IndicatorPriority,
  DataQualityFlag,
  TrendDirection,
  DataReliability
} from '../types/EnergyDataTypes';

// Mock fetch globally
global.fetch = jest.fn();

describe('WorldBankApiClient', () => {
  let client: WorldBankApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    client = new WorldBankApiClient({
      rateLimitPerMinute: 10, // Lower rate limit for testing
      retryAttempts: 2,
      cacheTtlMinutes: 1,
      timeout: 5000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // BASIC API FUNCTIONALITY TESTS
  // ==========================================================================

  describe('getEnergyIndicators', () => {
    it('should fetch energy indicators for single country successfully', async () => {
      const mockApiResponse = [
        { // metadata
          page: 1,
          pages: 1,
          per_page: 50,
          total: 2
        },
        [ // data
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2023',
            value: 100.0,
            unit: '',
            obs_status: '',
            decimal: 1
          },
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2022',
            value: 99.9,
            unit: '',
            obs_status: '',
            decimal: 1
          }
        ]
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS'], 2022, 2023);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].countryCode).toBe('USA');
      expect(result.data![0].countryName).toBe('United States');
      expect(result.data![0].indicators).toHaveLength(1);
      expect(result.data![0].indicators[0].indicatorId).toBe('EG.ELC.ACCS.ZS');
      expect(result.data![0].indicators[0].timeSeries).toHaveLength(2);
    });

    it('should handle multiple countries and indicators', async () => {
      const mockApiResponse = [
        { page: 1, pages: 1, per_page: 100, total: 4 },
        [
          // USA - EG.ELC.ACCS.ZS
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2023',
            value: 100.0,
            unit: '',
            obs_status: '',
            decimal: 1
          },
          // China - EG.ELC.ACCS.ZS
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'CHN',
              iso2Code: 'CN',
              name: 'China',
              region: { id: 'EAS', iso2code: 'Z4', value: 'East Asia & Pacific' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'UMC', iso2code: 'XT', value: 'Upper middle income' },
              lendingType: { id: 'IBD', iso2code: 'XF', value: 'IBRD' },
              capitalCity: 'Beijing',
              longitude: '116.286',
              latitude: '39.9056'
            },
            countryiso3code: 'CHN',
            date: '2023',
            value: 100.0,
            unit: '',
            obs_status: '',
            decimal: 1
          }
        ]
      ];

      // Mock multiple API calls for different country batches
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(
        ['USA', 'CHN'], 
        ['EG.ELC.ACCS.ZS'], 
        2023, 
        2023
      );

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.map(d => d.countryCode)).toContain('USA');
      expect(result.data!.map(d => d.countryCode)).toContain('CHN');
    });

    it('should return default World aggregate when no countries specified', async () => {
      const mockApiResponse = [
        { page: 1, pages: 1, per_page: 50, total: 1 },
        [{
          indicator: {
            id: 'EG.ELC.ACCS.ZS',
            value: 'Access to electricity (% of population)',
            sourceNote: 'Test note',
            sourceOrganization: 'World Bank'
          },
          country: {
            id: 'WLD',
            iso2Code: 'WW',
            name: 'World',
            region: { id: 'WLD', iso2code: 'WW', value: 'World' },
            adminregion: { id: '', iso2code: '', value: '' },
            incomeLevel: { id: 'WLD', iso2code: 'WW', value: 'Aggregates' },
            lendingType: { id: 'WLD', iso2code: 'WW', value: 'Aggregates' },
            capitalCity: '',
            longitude: '',
            latitude: ''
          },
          countryiso3code: 'WLD',
          date: '2023',
          value: 91.2,
          unit: '',
          obs_status: '',
          decimal: 1
        }]
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].countryCode).toBe('WLD');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle HTTP 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['INVALID'], ['EG.ELC.ACCS.ZS']);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.type).toBe(ApiErrorType.DATA_NOT_FOUND);
      expect(result.error!.statusCode).toBe(404);
    });

    it('should handle HTTP 429 rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.type).toBe(ApiErrorType.RATE_LIMIT_EXCEEDED);
      expect(result.error!.statusCode).toBe(429);
    });

    it('should handle HTTP 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.type).toBe(ApiErrorType.SERVER_ERROR);
      expect(result.error!.statusCode).toBe(500);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.type).toBe(ApiErrorType.SERVER_ERROR);
    });

    it('should handle timeout errors', async () => {
      // Mock a request that never resolves (simulating timeout)
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.type).toBe(ApiErrorType.TIMEOUT_ERROR);
    }, 10000); // Increase timeout for this test
  });

  // ==========================================================================
  // RETRY LOGIC TESTS
  // ==========================================================================

  describe('Retry Logic', () => {
    it('should retry on retryable errors and eventually succeed', async () => {
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers()
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [
            { page: 1, pages: 1, per_page: 50, total: 1 },
            [{
              indicator: {
                id: 'EG.ELC.ACCS.ZS',
                value: 'Access to electricity (% of population)',
                sourceNote: 'Test note',
                sourceOrganization: 'World Bank'
              },
              country: {
                id: 'USA',
                iso2Code: 'US',
                name: 'United States',
                region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
                adminregion: { id: '', iso2code: '', value: '' },
                incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
                lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
                capitalCity: 'Washington D.C.',
                longitude: '-77.032',
                latitude: '38.8895'
              },
              countryiso3code: 'USA',
              date: '2023',
              value: 100.0,
              unit: '',
              obs_status: '',
              decimal: 1
            }]
          ],
          headers: new Headers()
        } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.error).not.toBeNull();
      expect(result.error!.statusCode).toBe(400);
    });

    it('should give up after max retry attempts', async () => {
      // All calls fail with 500
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry (max retries = 2)
      expect(result.error).not.toBeNull();
      expect(result.error!.statusCode).toBe(500);
    });
  });

  // ==========================================================================
  // RATE LIMITING TESTS
  // ==========================================================================

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => [{ page: 1, pages: 1, per_page: 50, total: 0 }, []],
        headers: new Headers()
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      // Make requests that exceed rate limit
      const promises = [];
      for (let i = 0; i < 15; i++) { // Exceeds rate limit of 10
        promises.push(client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']));
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // Should take some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(1000);
    }, 15000);

    it('should provide rate limit status', () => {
      const rateLimitStatus = client.getRateLimitStatus();
      
      expect(rateLimitStatus).toHaveProperty('remaining');
      expect(rateLimitStatus).toHaveProperty('reset');
      expect(rateLimitStatus).toHaveProperty('limit');
      expect(rateLimitStatus.limit).toBe(10); // As configured in beforeEach
    });
  });

  // ==========================================================================
  // DATA PROCESSING TESTS
  // ==========================================================================

  describe('Data Processing', () => {
    it('should correctly process time series data', async () => {
      const mockApiResponse = [
        { page: 1, pages: 1, per_page: 50, total: 3 },
        [
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2023',
            value: 100.0,
            unit: '',
            obs_status: '',
            decimal: 1
          },
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2022',
            value: 99.9,
            unit: '',
            obs_status: '',
            decimal: 1
          },
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2021',
            value: 99.8,
            unit: '',
            obs_status: '',
            decimal: 1
          }
        ]
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS'], 2021, 2023);

      expect(result.data![0].indicators[0].timeSeries).toHaveLength(3);
      expect(result.data![0].indicators[0].timeSeries[0].year).toBe(2021);
      expect(result.data![0].indicators[0].timeSeries[2].year).toBe(2023);
      
      // Check statistics calculation
      const stats = result.data![0].indicators[0].statistics;
      expect(stats.latest).toBe(100.0);
      expect(stats.latestYear).toBe(2023);
      expect(stats.trend).toBe(TrendDirection.INCREASING);
      expect(stats.completeness).toBe(1.0); // All 3 years present
    });

    it('should handle missing data points gracefully', async () => {
      const mockApiResponse = [
        { page: 1, pages: 1, per_page: 50, total: 2 },
        [
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2023',
            value: 100.0,
            unit: '',
            obs_status: '',
            decimal: 1
          },
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2022',
            value: null, // Missing data
            unit: '',
            obs_status: '',
            decimal: 1
          }
        ]
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS'], 2022, 2023);

      // Should only include valid data points
      expect(result.data![0].indicators[0].timeSeries).toHaveLength(1);
      expect(result.data![0].indicators[0].timeSeries[0].year).toBe(2023);
      expect(result.data![0].indicators[0].timeSeries[0].value).toBe(100.0);
    });

    it('should calculate data quality metrics correctly', async () => {
      const mockApiResponse = [
        { page: 1, pages: 1, per_page: 50, total: 2 },
        [
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2023',
            value: 100.0,
            unit: '',
            obs_status: '',
            decimal: 1
          },
          {
            indicator: {
              id: 'EG.ELC.ACCS.ZS',
              value: 'Access to electricity (% of population)',
              sourceNote: 'Test note',
              sourceOrganization: 'World Bank'
            },
            country: {
              id: 'USA',
              iso2Code: 'US',
              name: 'United States',
              region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
              adminregion: { id: '', iso2code: '', value: '' },
              incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
              lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
              capitalCity: 'Washington D.C.',
              longitude: '-77.032',
              latitude: '38.8895'
            },
            countryiso3code: 'USA',
            date: '2022',
            value: 99.9,
            unit: '',
            obs_status: 'E', // Estimated
            decimal: 1
          }
        ]
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      const result = await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS'], 2022, 2023);

      const dataQuality = result.data![0].dataQuality;
      expect(dataQuality.completeness).toBeGreaterThan(0.5);
      expect(dataQuality.overall).toBeGreaterThan(0.5);
      expect(dataQuality.accuracy).toBe(0.9); // World Bank is high quality source
    });
  });

  // ==========================================================================
  // CACHING TESTS
  // ==========================================================================

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const mockApiResponse = [
        { page: 1, pages: 1, per_page: 50, total: 1 },
        [{
          indicator: {
            id: 'EG.ELC.ACCS.ZS',
            value: 'Access to electricity (% of population)',
            sourceNote: 'Test note',
            sourceOrganization: 'World Bank'
          },
          country: {
            id: 'USA',
            iso2Code: 'US',
            name: 'United States',
            region: { id: 'NAC', iso2code: 'XU', value: 'North America' },
            adminregion: { id: '', iso2code: '', value: '' },
            incomeLevel: { id: 'HIC', iso2code: 'XD', value: 'High income' },
            lendingType: { id: 'LNX', iso2code: 'XX', value: 'Not classified' },
            capitalCity: 'Washington D.C.',
            longitude: '-77.032',
            latitude: '38.8895'
          },
          countryiso3code: 'USA',
          date: '2023',
          value: 100.0,
          unit: '',
          obs_status: '',
          decimal: 1
        }]
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
        headers: new Headers()
      } as Response);

      // First request
      await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request should use cache
      await client.getEnergyIndicators(['USA'], ['EG.ELC.ACCS.ZS']);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should still be 1 due to caching
    });

    it('should provide cache statistics', () => {
      const cacheStats = client.getCacheStats();
      
      expect(cacheStats).toHaveProperty('size');
      expect(cacheStats).toHaveProperty('ttlMinutes');
      expect(cacheStats.ttlMinutes).toBe(1); // As configured in beforeEach
    });

    it('should allow cache clearing', () => {
      client.clearCache();
      const cacheStats = client.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  // ==========================================================================
  // UTILITY METHOD TESTS
  // ==========================================================================

  describe('Utility Methods', () => {
    it('should return available countries', () => {
      const countries = client.getAvailableCountries();
      
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
      expect(countries[0]).toHaveProperty('code');
      expect(countries[0]).toHaveProperty('name');
      expect(countries[0]).toHaveProperty('region');
    });

    it('should return available energy indicators', () => {
      const indicators = client.getAvailableIndicators();
      
      expect(Array.isArray(indicators)).toBe(true);
      expect(indicators.length).toBeGreaterThanOrEqual(20); // Should have 20+ indicators
      expect(indicators[0]).toHaveProperty('id');
      expect(indicators[0]).toHaveProperty('name');
      expect(indicators[0]).toHaveProperty('category');
      expect(indicators[0]).toHaveProperty('priority');
      
      // Check that we have indicators from different categories
      const categories = new Set(indicators.map(ind => ind.category));
      expect(categories.has(EnergyIndicatorCategory.ACCESS)).toBe(true);
      expect(categories.has(EnergyIndicatorCategory.PRODUCTION)).toBe(true);
      expect(categories.has(EnergyIndicatorCategory.CONSUMPTION)).toBe(true);
      expect(categories.has(EnergyIndicatorCategory.RENEWABLE)).toBe(true);
    });
  });
});