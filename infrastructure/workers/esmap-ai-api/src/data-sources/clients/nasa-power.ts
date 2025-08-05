import { BaseDataSource, DataSourceConfig, DataSourceResponse } from '../types/base';
import { CloudflareRateLimiter } from '../utils/rate-limiter';
import { JSONSchemaValidator, nasaPowerSchema } from '../utils/validator';
import type { Env } from '../../types';

export interface NASAPowerData {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    parameter: Record<string, Record<string, number>>;
  };
}

export interface NASAPowerParams {
  latitude: number;
  longitude: number;
  startDate: string; // YYYYMMDD format
  endDate: string;   // YYYYMMDD format
  parameters?: string[]; // e.g., ['ALLSKY_SFC_SW_DWN', 'T2M', 'WS50M']
  community?: 'RE' | 'AG' | 'SB'; // Renewable Energy, Agroclimatology, Sustainable Buildings
  outputFormat?: 'JSON' | 'CSV' | 'NETCDF' | 'GEOTIFF';
  site_elevation?: number;
}

export class NASAPowerClient extends BaseDataSource<NASAPowerData> {
  constructor(env: Env) {
    const config: DataSourceConfig = {
      name: 'nasa-power',
      baseUrl: 'https://power.larc.nasa.gov/api/temporal',
      rateLimit: {
        requestsPerSecond: 2,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 2000,
        exponentialBackoff: true
      },
      timeout: 45000, // NASA POWER can be slow
      fallbackSources: ['nasa-power-fallback']
    };

    const rateLimiter = new CloudflareRateLimiter(env);
    const validator = new JSONSchemaValidator<NASAPowerData>(nasaPowerSchema);
    
    super(config, rateLimiter, validator);
  }

  async fetchData(params: NASAPowerParams): Promise<DataSourceResponse<NASAPowerData>> {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      const url = this.buildUrl(params);
      
      const response = await this.retryRequest(async () => {
        return await this.makeRequest(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ESMAP-AI-Platform/1.0.0'
          }
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NASA POWER API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const rawData = await response.json();

      // Validate the data
      const validationResult = await this.validator.validate(rawData);
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

  private buildUrl(params: NASAPowerParams): string {
    const {
      latitude,
      longitude,
      startDate,
      endDate,
      parameters = ['ALLSKY_SFC_SW_DWN', 'T2M', 'WS50M'], // Default renewable energy parameters
      community = 'RE',
      outputFormat = 'JSON',
      site_elevation
    } = params;

    const baseUrl = `${this.config.baseUrl}/daily/point`;
    
    const queryParams = new URLSearchParams({
      start: startDate,
      end: endDate,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      community: community,
      parameters: parameters.join(','),
      format: outputFormat,
      header: 'true',
      time_standard: 'utc'
    });

    if (site_elevation !== undefined) {
      queryParams.append('site-elevation', site_elevation.toString());
    }

    return `${baseUrl}?${queryParams.toString()}`;
  }

  // Convenience methods for common renewable energy data
  async getSolarRadiation(
    latitude: number, 
    longitude: number, 
    startDate: string, 
    endDate: string
  ): Promise<DataSourceResponse<NASAPowerData>> {
    return this.fetchData({
      latitude,
      longitude,
      startDate,
      endDate,
      parameters: [
        'ALLSKY_SFC_SW_DWN',     // All Sky Surface Shortwave Downward Irradiance
        'CLRSKY_SFC_SW_DWN',     // Clear Sky Surface Shortwave Downward Irradiance
        'ALLSKY_SFC_SW_DNI',     // All Sky Surface Shortwave Direct Normal Irradiance
        'CLRSKY_SFC_SW_DNI'      // Clear Sky Surface Shortwave Direct Normal Irradiance
      ],
      community: 'RE'
    });
  }

  async getWindData(
    latitude: number, 
    longitude: number, 
    startDate: string, 
    endDate: string
  ): Promise<DataSourceResponse<NASAPowerData>> {
    return this.fetchData({
      latitude,
      longitude,
      startDate,
      endDate,
      parameters: [
        'WS50M',      // Wind Speed at 50 Meters
        'WS10M',      // Wind Speed at 10 Meters
        'WD50M',      // Wind Direction at 50 Meters
        'WD10M'       // Wind Direction at 10 Meters
      ],
      community: 'RE'
    });
  }

  async getTemperatureData(
    latitude: number, 
    longitude: number, 
    startDate: string, 
    endDate: string
  ): Promise<DataSourceResponse<NASAPowerData>> {
    return this.fetchData({
      latitude,
      longitude,
      startDate,
      endDate,
      parameters: [
        'T2M',        // Temperature at 2 Meters
        'T2M_MAX',    // Maximum Temperature at 2 Meters
        'T2M_MIN',    // Minimum Temperature at 2 Meters
        'TS'          // Earth Skin Temperature
      ],
      community: 'RE'
    });
  }

  async getComprehensiveRenewableData(
    latitude: number, 
    longitude: number, 
    startDate: string, 
    endDate: string
  ): Promise<DataSourceResponse<NASAPowerData>> {
    return this.fetchData({
      latitude,
      longitude,
      startDate,
      endDate,
      parameters: [
        // Solar parameters
        'ALLSKY_SFC_SW_DWN',
        'CLRSKY_SFC_SW_DWN',
        'ALLSKY_SFC_SW_DNI',
        // Wind parameters
        'WS50M',
        'WS10M',
        'WD50M',
        // Temperature parameters
        'T2M',
        'T2M_MAX',
        'T2M_MIN',
        // Additional useful parameters
        'RH2M',       // Relative Humidity at 2 Meters
        'PRECTOTCORR' // Precipitation Corrected
      ],
      community: 'RE'
    });
  }

  // Helper method to format dates from JavaScript Date to YYYYMMDD
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // Helper method to get date range for common periods
  static getDateRange(period: 'last_year' | 'last_month' | 'last_week' | 'ytd'): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = this.formatDate(now);
    let startDate: string;

    switch (period) {
      case 'last_year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        startDate = this.formatDate(lastYear);
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = this.formatDate(lastMonth);
        break;
      case 'last_week':
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = this.formatDate(lastWeek);
        break;
      case 'ytd':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        startDate = this.formatDate(yearStart);
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  }
}