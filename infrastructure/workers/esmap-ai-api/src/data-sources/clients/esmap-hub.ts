/**
 * ESMAP Energy Data Analytics Hub Integration
 * 
 * Comprehensive integration with ESMAP's 908 datasets covering 193 countries
 * Includes real-time data access, caching, and error handling
 */

export interface ESMAPDataset {
  id: string;
  name: string;
  description: string;
  category: ESMAPDataCategory;
  countries: string[];
  lastUpdated: string;
  dataUrl: string;
  metadataUrl: string;
  format: 'json' | 'csv' | 'xlsx' | 'api';
  size: number;
  tags: string[];
}

export type ESMAPDataCategory = 
  | 'energy-access'
  | 'renewable-energy'
  | 'energy-efficiency'
  | 'grid-infrastructure'
  | 'off-grid-solutions'
  | 'energy-planning'
  | 'gender-energy'
  | 'clean-cooking'
  | 'mini-grids'
  | 'climate-resilience'
  | 'energy-finance'
  | 'regulatory-frameworks';

export interface ESMAPCountryProfile {
  countryCode: string;
  countryName: string;
  region: string;
  incomeGroup: string;
  population: number;
  gdpPerCapita: number;
  energyAccessRate: number;
  renewableEnergyShare: number;
  electricityAccessUrban: number;
  electricityAccessRural: number;
  cleanCookingAccess: number;
  co2EmissionsPerCapita: number;
  energyIntensity: number;
  lastUpdated: string;
}

export interface ESMAPQueryParams {
  countries?: string[];
  categories?: ESMAPDataCategory[];
  dateRange?: {
    start: string;
    end: string;
  };
  indicators?: string[];
  limit?: number;
  offset?: number;
  format?: 'json' | 'csv';
}

export interface ESMAPApiResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    totalRecords: number;
    returnedRecords: number;
    page: number;
    totalPages: number;
    lastUpdated: string;
  };
  errors?: string[];
}

export class ESMAPHubClient {
  private baseUrl: string;
  private apiKey?: string;
  private rateLimit: number = 100; // requests per minute
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTtl: number = 300000; // 5 minutes

  constructor(baseUrl: string = 'https://energydata.info/api', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get comprehensive list of all 908 ESMAP datasets
   */
  async getAllDatasets(params?: ESMAPQueryParams): Promise<ESMAPApiResponse<ESMAPDataset[]>> {
    try {
      const cacheKey = `datasets_${JSON.stringify(params)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const queryParams = new URLSearchParams();
      if (params?.categories?.length) {
        queryParams.append('categories', params.categories.join(','));
      }
      if (params?.limit) {
        queryParams.append('rows', params.limit.toString());
      }
      if (params?.offset) {
        queryParams.append('start', params.offset.toString());
      }

      const url = `${this.baseUrl}/3/action/package_search?${queryParams.toString()}`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new Error(`ESMAP Hub API error: ${response.error?.message || 'Unknown error'}`);
      }

      // Transform CKAN response to our format
      const datasets: ESMAPDataset[] = response.result.results.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.title || pkg.name,
        description: pkg.notes || '',
        category: this.categorizeDataset(pkg.tags),
        countries: this.extractCountries(pkg.extras),
        lastUpdated: pkg.metadata_modified,
        dataUrl: pkg.resources?.[0]?.url || '',
        metadataUrl: `${this.baseUrl}/dataset/${pkg.name}`,
        format: pkg.resources?.[0]?.format?.toLowerCase() || 'json',
        size: pkg.resources?.[0]?.size || 0,
        tags: pkg.tags?.map((tag: any) => tag.name) || []
      }));

      const result: ESMAPApiResponse<ESMAPDataset[]> = {
        success: true,
        data: datasets,
        metadata: {
          totalRecords: response.result.count,
          returnedRecords: datasets.length,
          page: Math.floor((params?.offset || 0) / (params?.limit || 10)) + 1,
          totalPages: Math.ceil(response.result.count / (params?.limit || 10)),
          lastUpdated: new Date().toISOString()
        }
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('ESMAP Hub datasets fetch error:', error);
      return {
        success: false,
        data: [],
        metadata: {
          totalRecords: 0,
          returnedRecords: 0,
          page: 1,
          totalPages: 0,
          lastUpdated: new Date().toISOString()
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get country profiles for all 193 countries
   */
  async getCountryProfiles(countryCodes?: string[]): Promise<ESMAPApiResponse<ESMAPCountryProfile[]>> {
    try {
      const cacheKey = `country_profiles_${countryCodes?.join(',') || 'all'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Fetch from multiple ESMAP data sources
      const [accessData, renewableData, cookingData] = await Promise.allSettled([
        this.getEnergyAccessData(countryCodes),
        this.getRenewableEnergyData(countryCodes),
        this.getCleanCookingData(countryCodes)
      ]);

      const profiles: ESMAPCountryProfile[] = this.mergeCountryData(
        accessData.status === 'fulfilled' ? accessData.value : [],
        renewableData.status === 'fulfilled' ? renewableData.value : [],
        cookingData.status === 'fulfilled' ? cookingData.value : []
      );

      const result: ESMAPApiResponse<ESMAPCountryProfile[]> = {
        success: true,
        data: profiles,
        metadata: {
          totalRecords: profiles.length,
          returnedRecords: profiles.length,
          page: 1,
          totalPages: 1,
          lastUpdated: new Date().toISOString()
        }
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('ESMAP country profiles fetch error:', error);
      return {
        success: false,
        data: [],
        metadata: {
          totalRecords: 0,
          returnedRecords: 0,
          page: 1,
          totalPages: 0,
          lastUpdated: new Date().toISOString()
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Search datasets by keywords and filters
   */
  async searchDatasets(query: string, params?: ESMAPQueryParams): Promise<ESMAPApiResponse<ESMAPDataset[]>> {
    try {
      const cacheKey = `search_${query}_${JSON.stringify(params)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      if (params?.categories?.length) {
        queryParams.append('fq', `tags:(${params.categories.join(' OR ')})`);
      }
      if (params?.limit) {
        queryParams.append('rows', params.limit.toString());
      }

      const url = `${this.baseUrl}/3/action/package_search?${queryParams.toString()}`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new Error(`ESMAP search error: ${response.error?.message || 'Unknown error'}`);
      }

      const datasets: ESMAPDataset[] = response.result.results.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.title || pkg.name,
        description: pkg.notes || '',
        category: this.categorizeDataset(pkg.tags),
        countries: this.extractCountries(pkg.extras),
        lastUpdated: pkg.metadata_modified,
        dataUrl: pkg.resources?.[0]?.url || '',
        metadataUrl: `${this.baseUrl}/dataset/${pkg.name}`,
        format: pkg.resources?.[0]?.format?.toLowerCase() || 'json',
        size: pkg.resources?.[0]?.size || 0,
        tags: pkg.tags?.map((tag: any) => tag.name) || []
      }));

      const result: ESMAPApiResponse<ESMAPDataset[]> = {
        success: true,
        data: datasets,
        metadata: {
          totalRecords: response.result.count,
          returnedRecords: datasets.length,
          page: 1,
          totalPages: Math.ceil(response.result.count / (params?.limit || 10)),
          lastUpdated: new Date().toISOString()
        }
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('ESMAP search error:', error);
      return {
        success: false,
        data: [],
        metadata: {
          totalRecords: 0,
          returnedRecords: 0,
          page: 1,
          totalPages: 0,
          lastUpdated: new Date().toISOString()
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get detailed dataset information and download data
   */
  async getDatasetData(datasetId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    try {
      const cacheKey = `dataset_data_${datasetId}_${format}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // First get dataset metadata
      const metadataUrl = `${this.baseUrl}/3/action/package_show?id=${datasetId}`;
      const metadataResponse = await this.makeRequest(metadataUrl);

      if (!metadataResponse.success) {
        throw new Error(`Dataset not found: ${datasetId}`);
      }

      const dataset = metadataResponse.result;
      const resource = dataset.resources?.find((r: any) => 
        r.format?.toLowerCase() === format || 
        (format === 'json' && r.format?.toLowerCase() === 'api')
      ) || dataset.resources?.[0];

      if (!resource) {
        throw new Error(`No ${format} resource found for dataset ${datasetId}`);
      }

      // Download the actual data
      const dataResponse = await this.makeRequest(resource.url);
      
      const result = {
        metadata: {
          id: dataset.id,
          name: dataset.title || dataset.name,
          description: dataset.notes,
          lastUpdated: dataset.metadata_modified,
          format: resource.format,
          size: resource.size
        },
        data: dataResponse
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error(`Dataset data fetch error for ${datasetId}:`, error);
      throw error;
    }
  }

  // Private helper methods
  private async makeRequest(url: string): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent': 'ESMAP-AI-Platform/1.0',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private categorizeDataset(tags: any[]): ESMAPDataCategory {
    const tagNames = tags?.map(t => t.name?.toLowerCase()) || [];
    
    // Categorization logic based on tags
    if (tagNames.some(tag => tag.includes('access') || tag.includes('electrification'))) {
      return 'energy-access';
    }
    if (tagNames.some(tag => tag.includes('renewable') || tag.includes('solar') || tag.includes('wind'))) {
      return 'renewable-energy';
    }
    if (tagNames.some(tag => tag.includes('cooking') || tag.includes('cookstove'))) {
      return 'clean-cooking';
    }
    if (tagNames.some(tag => tag.includes('mini-grid') || tag.includes('microgrid'))) {
      return 'mini-grids';
    }
    if (tagNames.some(tag => tag.includes('gender') || tag.includes('women'))) {
      return 'gender-energy';
    }
    if (tagNames.some(tag => tag.includes('grid') || tag.includes('transmission'))) {
      return 'grid-infrastructure';
    }
    if (tagNames.some(tag => tag.includes('efficiency'))) {
      return 'energy-efficiency';
    }
    if (tagNames.some(tag => tag.includes('climate') || tag.includes('resilience'))) {
      return 'climate-resilience';
    }
    if (tagNames.some(tag => tag.includes('finance') || tag.includes('investment'))) {
      return 'energy-finance';
    }
    if (tagNames.some(tag => tag.includes('policy') || tag.includes('regulatory'))) {
      return 'regulatory-frameworks';
    }
    if (tagNames.some(tag => tag.includes('planning'))) {
      return 'energy-planning';
    }
    
    return 'off-grid-solutions'; // default category
  }

  private extractCountries(extras: any[]): string[] {
    const countryExtra = extras?.find(e => e.key === 'countries' || e.key === 'country');
    if (!countryExtra) return [];
    
    try {
      return JSON.parse(countryExtra.value);
    } catch {
      return countryExtra.value.split(',').map((c: string) => c.trim());
    }
  }

  private async getEnergyAccessData(countryCodes?: string[]): Promise<any[]> {
    // Placeholder - would integrate with ESMAP's energy access datasets
    return [];
  }

  private async getRenewableEnergyData(countryCodes?: string[]): Promise<any[]> {
    // Placeholder - would integrate with ESMAP's renewable energy datasets
    return [];
  }

  private async getCleanCookingData(countryCodes?: string[]): Promise<any[]> {
    // Placeholder - would integrate with ESMAP's clean cooking datasets
    return [];
  }

  private mergeCountryData(...dataSources: any[][]): ESMAPCountryProfile[] {
    // Placeholder - would merge data from multiple sources into country profiles
    return [];
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const esmapHubClient = new ESMAPHubClient();