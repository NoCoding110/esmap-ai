import type { Env } from '../types';
import { WorldBankClient, WorldBankParams } from './clients/world-bank';
import { NASAPowerClient, NASAPowerParams } from './clients/nasa-power';
import { OpenStreetMapClient, OpenStreetMapParams } from './clients/openstreetmap';
import { IRENAClient, IRENAParams } from './clients/irena';
import { IEAClient, IEAParams } from './clients/iea';
import type { DataSourceResponse } from './types/base';

export class DataSourceManager {
  private worldBank: WorldBankClient;
  private nasaPower: NASAPowerClient;
  private openStreetMap: OpenStreetMapClient;
  private irena: IRENAClient;
  private iea: IEAClient;

  constructor(env: Env) {
    this.worldBank = new WorldBankClient(env);
    this.nasaPower = new NASAPowerClient(env);
    this.openStreetMap = new OpenStreetMapClient(env);
    this.irena = new IRENAClient(env);
    this.iea = new IEAClient(env);
  }

  // CORS Proxy Methods - These handle CORS issues by proxying requests through Cloudflare Workers
  async proxyCORSRequest(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'ESMAP-AI-Platform/1.0.0',
          'Accept': 'application/json, text/html, */*',
          ...options.headers
        }
      });

      // Create a new response with CORS headers
      const corsResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          ...Object.fromEntries(response.headers.entries())
        }
      });

      return corsResponse;
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Proxy request failed',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }

  // World Bank Data Methods
  async getWorldBankData(params: WorldBankParams) {
    return await this.worldBank.fetchData(params);
  }

  async getElectrificationRate(countries: string[] = ['all'], startYear?: number, endYear?: number) {
    return await this.worldBank.getElectrificationRate(countries, startYear, endYear);
  }

  async getRenewableEnergyConsumption(countries: string[] = ['all'], startYear?: number, endYear?: number) {
    return await this.worldBank.getRenewableEnergyConsumption(countries, startYear, endYear);
  }

  // NASA POWER Data Methods
  async getNASAPowerData(params: NASAPowerParams) {
    return await this.nasaPower.fetchData(params);
  }

  async getSolarRadiation(latitude: number, longitude: number, startDate: string, endDate: string) {
    return await this.nasaPower.getSolarRadiation(latitude, longitude, startDate, endDate);
  }

  async getWindData(latitude: number, longitude: number, startDate: string, endDate: string) {
    return await this.nasaPower.getWindData(latitude, longitude, startDate, endDate);
  }

  // OpenStreetMap Data Methods
  async getOpenStreetMapData(params: OpenStreetMapParams) {
    return await this.openStreetMap.fetchData(params);
  }

  async searchEnergyInfrastructure(query: string, country?: string, limit: number = 10) {
    return await this.openStreetMap.searchEnergyInfrastructure(query, country, limit);
  }

  async searchPowerPlants(country?: string, limit: number = 20) {
    return await this.openStreetMap.searchPowerPlants(country, limit);
  }

  // IRENA Data Methods
  async getIRENAData(params: IRENAParams) {
    return await this.irena.fetchData(params);
  }

  async getGlobalRenewableCapacity(year?: number) {
    return await this.irena.getGlobalRenewableCapacity(year);
  }

  async getCountryRenewableCapacity(country: string, year?: number) {
    return await this.irena.getCountryRenewableCapacity(country, year);
  }

  // IEA Data Methods
  async getIEAData(params: IEAParams) {
    return await this.iea.fetchData(params);
  }

  async getElectricityAccess(country?: string, year?: number) {
    return await this.iea.getElectricityAccess(country, year);
  }

  async getIEARenewableShare(country?: string, year?: number) {
    return await this.iea.getRenewableShare(country, year);
  }

  // Combined Data Methods - Get data from multiple sources
  async getComprehensiveCountryData(country: string, year?: number) {
    const results = await Promise.allSettled([
      this.worldBank.getElectrificationRate([country], year, year),
      this.worldBank.getRenewableEnergyConsumption([country], year, year),
      this.worldBank.getCO2Emissions([country], year, year),
      this.irena.getCountryRenewableCapacity(country, year),
      this.iea.getElectricityAccess(country, year)
    ]);

    return {
      success: true,
      data: {
        country,
        year: year || new Date().getFullYear() - 1,
        worldBank: results[0].status === 'fulfilled' ? results[0].value : null,
        worldBankRenewable: results[1].status === 'fulfilled' ? results[1].value : null,
        worldBankCO2: results[2].status === 'fulfilled' ? results[2].value : null,
        irena: results[3].status === 'fulfilled' ? results[3].value : null,
        iea: results[4].status === 'fulfilled' ? results[4].value : null
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    };
  }

  async getLocationEnergyPotential(latitude: number, longitude: number) {
    const dateRange = NASAPowerClient.getDateRange('last_year');
    
    const results = await Promise.allSettled([
      this.nasaPower.getSolarRadiation(latitude, longitude, dateRange.startDate, dateRange.endDate),
      this.nasaPower.getWindData(latitude, longitude, dateRange.startDate, dateRange.endDate),
      this.nasaPower.getTemperatureData(latitude, longitude, dateRange.startDate, dateRange.endDate),
      this.openStreetMap.reverseGeocode(latitude, longitude)
    ]);

    return {
      success: true,
      data: {
        location: { latitude, longitude },
        solar: results[0].status === 'fulfilled' ? results[0].value : null,
        wind: results[1].status === 'fulfilled' ? results[1].value : null,
        temperature: results[2].status === 'fulfilled' ? results[2].value : null,
        geocoding: results[3].status === 'fulfilled' ? results[3].value : null
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    };
  }

  // Fallback data source methods
  async getDataWithFallback<T>(
    primarySource: () => Promise<DataSourceResponse<T>>,
    fallbackSource?: () => Promise<DataSourceResponse<T>>
  ): Promise<DataSourceResponse<T>> {
    try {
      const primaryResult = await primarySource();
      if (primaryResult.success) {
        return primaryResult;
      }
      
      if (fallbackSource) {
        const fallbackResult = await fallbackSource();
        return {
          ...fallbackResult,
          source: `${fallbackResult.source} (fallback)`
        };
      }
      
      return primaryResult;
    } catch (error) {
      if (fallbackSource) {
        try {
          const fallbackResult = await fallbackSource();
          return {
            ...fallbackResult,
            source: `${fallbackResult.source} (fallback - primary failed)`
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: `Primary and fallback sources failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            source: 'fallback-manager',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'data-source-manager',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
    }
  }

  // Health check for all data sources
  async getDataSourcesHealth() {
    const healthChecks = await Promise.allSettled([
      this.worldBank.fetchData({ countries: ['USA'], indicators: ['EG.ELC.ACCS.ZS'], startYear: 2020, endYear: 2020, perPage: 1 }),
      this.nasaPower.fetchData({ latitude: 40.7128, longitude: -74.0060, startDate: '20231201', endDate: '20231201', parameters: ['T2M'] }),
      this.openStreetMap.fetchData({ query: 'New York', limit: 1 }),
      this.irena.fetchData({ country: 'United States', year: 2023 }),
      this.iea.fetchData({ country: 'United States', year: 2023 })
    ]);

    return {
      success: true,
      data: {
        worldBank: { status: healthChecks[0].status === 'fulfilled' && healthChecks[0].value.success ? 'healthy' : 'unhealthy' },
        nasaPower: { status: healthChecks[1].status === 'fulfilled' && healthChecks[1].value.success ? 'healthy' : 'unhealthy' },
        openStreetMap: { status: healthChecks[2].status === 'fulfilled' && healthChecks[2].value.success ? 'healthy' : 'unhealthy' },
        irena: { status: healthChecks[3].status === 'fulfilled' && healthChecks[3].value.success ? 'healthy' : 'unhealthy' },
        iea: { status: healthChecks[4].status === 'fulfilled' && healthChecks[4].value.success ? 'healthy' : 'unhealthy' }
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    };
  }
}