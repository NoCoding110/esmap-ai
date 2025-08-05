import { BaseDataSource, DataSourceConfig, DataSourceResponse } from '../types/base';
import { CloudflareRateLimiter } from '../utils/rate-limiter';
import { JSONSchemaValidator, worldBankSchema } from '../utils/validator';
import type { Env } from '../../types';

export interface WorldBankIndicator {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

export interface WorldBankParams {
  countries?: string[]; // Country codes (e.g., ['USA', 'CHN'])
  indicators?: string[]; // Indicator codes (e.g., ['EG.ELC.ACCS.ZS'])
  startYear?: number;
  endYear?: number;
  page?: number;
  perPage?: number;
}

export class WorldBankClient extends BaseDataSource<WorldBankIndicator[]> {
  constructor(env: Env) {
    const config: DataSourceConfig = {
      name: 'world-bank',
      baseUrl: 'https://api.worldbank.org/v2',
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
        exponentialBackoff: true
      },
      timeout: 30000,
      fallbackSources: ['world-bank-fallback']
    };

    const rateLimiter = new CloudflareRateLimiter(env);
    const validator = new JSONSchemaValidator<WorldBankIndicator[]>(worldBankSchema);
    
    super(config, rateLimiter, validator);
  }

  async fetchData(params: WorldBankParams): Promise<DataSourceResponse<WorldBankIndicator[]>> {
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
        throw new Error(`World Bank API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      
      // World Bank API returns array with metadata in first element, data in second
      const dataArray = Array.isArray(rawData) && rawData.length > 1 ? rawData[1] : rawData;
      
      if (!Array.isArray(dataArray)) {
        throw new Error('Invalid response format from World Bank API');
      }

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

  private buildUrl(params: WorldBankParams): string {
    const { countries = ['all'], indicators = ['EG.ELC.ACCS.ZS'], startYear, endYear, page = 1, perPage = 1000 } = params;
    
    const countryParam = countries.join(';');
    const indicatorParam = indicators.join(';');
    
    let url = `${this.config.baseUrl}/country/${countryParam}/indicator/${indicatorParam}`;
    
    const queryParams = new URLSearchParams({
      format: 'json',
      page: page.toString(),
      per_page: perPage.toString()
    });

    if (startYear && endYear) {
      queryParams.append('date', `${startYear}:${endYear}`);
    } else if (startYear) {
      queryParams.append('date', startYear.toString());
    }

    return `${url}?${queryParams.toString()}`;
  }

  // Convenience methods for common energy indicators
  async getElectrificationRate(countries: string[] = ['all'], startYear?: number, endYear?: number): Promise<DataSourceResponse<WorldBankIndicator[]>> {
    return this.fetchData({
      countries,
      indicators: ['EG.ELC.ACCS.ZS'], // Access to electricity (% of population)
      startYear,
      endYear
    });
  }

  async getRenewableEnergyConsumption(countries: string[] = ['all'], startYear?: number, endYear?: number): Promise<DataSourceResponse<WorldBankIndicator[]>> {
    return this.fetchData({
      countries,
      indicators: ['EG.FEC.RNEW.ZS'], // Renewable energy consumption (% of total final energy consumption)
      startYear,
      endYear
    });
  }

  async getEnergyIntensity(countries: string[] = ['all'], startYear?: number, endYear?: number): Promise<DataSourceResponse<WorldBankIndicator[]>> {
    return this.fetchData({
      countries,
      indicators: ['EG.EGY.PRIM.PP.KD'], // Energy intensity level of primary energy (MJ/$2017 PPP GDP)
      startYear,
      endYear
    });
  }

  async getCO2Emissions(countries: string[] = ['all'], startYear?: number, endYear?: number): Promise<DataSourceResponse<WorldBankIndicator[]>> {
    return this.fetchData({
      countries,
      indicators: ['EN.ATM.CO2E.KT'], // CO2 emissions (kt)
      startYear,
      endYear
    });
  }
}