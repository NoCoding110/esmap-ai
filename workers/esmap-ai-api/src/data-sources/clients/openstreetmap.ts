import { BaseDataSource, DataSourceConfig, DataSourceResponse } from '../types/base';
import { CloudflareRateLimiter } from '../utils/rate-limiter';
import { JSONSchemaValidator, openStreetMapSchema } from '../utils/validator';
import type { Env } from '../../types';

export interface OpenStreetMapPlace {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address?: Record<string, string>;
}

export interface OpenStreetMapParams {
  query?: string;          // Free-form query
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postalcode?: string;
  latitude?: number;       // For reverse geocoding
  longitude?: number;      // For reverse geocoding
  limit?: number;          // Maximum number of results (1-50)
  format?: 'json' | 'xml'; // Response format
  addressdetails?: boolean; // Include address breakdown in results
  extratags?: boolean;     // Include additional OSM tags
  namedetails?: boolean;   // Include alternative names
}

export class OpenStreetMapClient extends BaseDataSource<OpenStreetMapPlace[]> {
  constructor(env: Env) {
    const config: DataSourceConfig = {
      name: 'openstreetmap',
      baseUrl: 'https://nominatim.openstreetmap.org',
      rateLimit: {
        requestsPerSecond: 1, // Nominatim has strict rate limits
        requestsPerHour: 300,
        requestsPerDay: 1000
      },
      retryConfig: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true
      },
      timeout: 15000,
      fallbackSources: ['openstreetmap-fallback']
    };

    const rateLimiter = new CloudflareRateLimiter(env);
    const validator = new JSONSchemaValidator<OpenStreetMapPlace[]>(openStreetMapSchema);
    
    super(config, rateLimiter, validator);
  }

  async fetchData(params: OpenStreetMapParams): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      const url = this.buildUrl(params);
      
      const response = await this.retryRequest(async () => {
        return await this.makeRequest(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ESMAP-AI-Platform/1.0.0 (https://esmap-ai.pages.dev)',
            'Referer': 'https://esmap-ai.pages.dev'
          }
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenStreetMap API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const rawData = await response.json();
      
      // Ensure we have an array
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];

      // Validate the data
      const validationResult = await this.validator.validate(dataArray);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}`);
      }

      const rateLimitRemaining = await this.rateLimiter.getRemainingRequests(this.config.name);

      return {
        success: true,
        data: validationResult.data,
        source: this.config.name,
        timestamp,
        requestId,
        rateLimitRemaining
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.config.name,
        timestamp,
        requestId
      };
    }
  }

  private buildUrl(params: OpenStreetMapParams): string {
    const {
      query,
      street,
      city,
      county,
      state,
      country,
      postalcode,
      latitude,
      longitude,
      limit = 10,
      format = 'json',
      addressdetails = true,
      extratags = true,
      namedetails = false
    } = params;

    // Determine if this is a search or reverse geocoding request
    const isReverseGeocode = latitude !== undefined && longitude !== undefined;
    const endpoint = isReverseGeocode ? 'reverse' : 'search';
    
    const baseUrl = `${this.config.baseUrl}/${endpoint}`;
    const queryParams = new URLSearchParams({
      format,
      addressdetails: addressdetails.toString(),
      extratags: extratags.toString(),
      namedetails: namedetails.toString()
    });

    if (isReverseGeocode) {
      queryParams.append('lat', latitude!.toString());
      queryParams.append('lon', longitude!.toString());
    } else {
      queryParams.append('limit', Math.min(limit, 50).toString()); // Nominatim max is 50
      
      if (query) {
        queryParams.append('q', query);
      } else {
        // Structured query
        if (street) queryParams.append('street', street);
        if (city) queryParams.append('city', city);
        if (county) queryParams.append('county', county);
        if (state) queryParams.append('state', state);
        if (country) queryParams.append('country', country);
        if (postalcode) queryParams.append('postalcode', postalcode);
      }
    }

    return `${baseUrl}?${queryParams.toString()}`;
  }

  // Convenience method for searching energy infrastructure
  async searchEnergyInfrastructure(
    query: string, 
    country?: string, 
    limit: number = 10
  ): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    const searchQuery = `${query} ${country ? `in ${country}` : ''}`.trim();
    return this.fetchData({
      query: searchQuery,
      limit,
      addressdetails: true,
      extratags: true
    });
  }

  // Search for power plants
  async searchPowerPlants(country?: string, limit: number = 20): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.searchEnergyInfrastructure('power plant power station', country, limit);
  }

  // Search for solar installations
  async searchSolarInstallations(country?: string, limit: number = 20): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.searchEnergyInfrastructure('solar power solar panel photovoltaic', country, limit);
  }

  // Search for wind installations
  async searchWindInstallations(country?: string, limit: number = 20): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.searchEnergyInfrastructure('wind turbine wind farm wind power', country, limit);
  }

  // Search for transmission infrastructure
  async searchTransmissionInfrastructure(country?: string, limit: number = 20): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.searchEnergyInfrastructure('transmission line substation power line', country, limit);
  }

  // Reverse geocoding for coordinates
  async reverseGeocode(latitude: number, longitude: number): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.fetchData({
      latitude,
      longitude,
      addressdetails: true,
      extratags: true
    });
  }

  // Search by structured address
  async searchByAddress(params: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    limit?: number;
  }): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.fetchData({
      ...params,
      addressdetails: true,
      extratags: true
    });
  }

  // Search for cities/regions for energy data context
  async searchLocations(query: string, limit: number = 5): Promise<DataSourceResponse<OpenStreetMapPlace[]>> {
    return this.fetchData({
      query,
      limit,
      addressdetails: true,
      extratags: false
    });
  }
}