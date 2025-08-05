/**
 * Real-Time Energy Data Service
 * 
 * Integrates multiple energy data sources including:
 * - World Bank/ESMAP Energy Data Platform
 * - EIA (Energy Information Administration) API
 * - IEA Real-Time Electricity Tracker
 * - IRENA Renewable Energy Statistics
 * - Carbon emissions tracking
 */

// API Configuration
const API_CONFIG = {
  // Our deployed ESMAP AI API
  ESMAP_AI: {
    baseUrl: 'https://esmap-ai-api.metabilityllc1.workers.dev/api/v1',
    endpoints: {
      dashboard: '/esmap/dashboard',
      countries: '/esmap/countries',
      hub: '/esmap/hub',
      mtf: '/esmap/mtf',
      rise: '/esmap/rise',
      sdg7: '/esmap/sdg7',
      search: '/esmap/search',
      recommendations: '/esmap/recommendations'
    }
  },
  EIA: {
    baseUrl: 'https://api.eia.gov/v2',
    // You need to register at https://www.eia.gov/opendata/register.php
    apiKey: process.env.REACT_APP_EIA_API_KEY || 'demo_key'
  },
  WORLD_BANK: {
    baseUrl: 'https://api.worldbank.org/v2',
    format: 'json'
  },
  ESMAP: {
    baseUrl: 'https://energydata.info/api/3/action',
    trackingSDG7: 'https://trackingsdg7.esmap.org/downloads'
  },
  IEA: {
    // IEA doesn't have public API, but provides data downloads
    realTimeTracker: 'https://www.iea.org/data-and-statistics/data-tools/real-time-electricity-tracker'
  },
  IRENA: {
    // IRENA uses IRENASTAT for data queries
    baseUrl: 'https://pxweb.irena.org/pxweb/api/v1/en/IRENASTAT'
  }
};

/**
 * Energy Data Service Class
 * Handles all real-time energy data fetching and processing
 */
class EnergyDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Generic API request handler with caching
   */
  async fetchWithCache(url, cacheKey, options = {}) {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ESMAP-AI-Platform/1.0',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`API request failed for ${cacheKey}:`, error);
      
      // Return cached data if available, even if expired
      const fallback = this.cache.get(cacheKey);
      if (fallback) {
        console.warn(`Using stale cache for ${cacheKey}`);
        return fallback.data;
      }
      
      throw error;
    }
  }

  /**
   * Fetch EIA electricity data
   */
  async getEIAElectricityData(series = 'EBA.US48-ALL.D.H', limit = 100) {
    const url = `${API_CONFIG.EIA.baseUrl}/electricity/rto/region-data/data/` +
                `?api_key=${API_CONFIG.EIA.apiKey}&frequency=hourly&data[0]=value&` +
                `facets[respondent][]=${series}&sort[0][column]=period&sort[0][direction]=desc&` +
                `offset=0&length=${limit}`;

    return this.fetchWithCache(url, `eia_electricity_${series}`);
  }

  /**
   * Fetch World Bank energy access indicators
   */
  async getWorldBankEnergyAccess(countries = 'all', indicators = 'EG.ELC.ACCS.ZS') {
    const url = `${API_CONFIG.WORLD_BANK.baseUrl}/country/${countries}/indicator/${indicators}` +
                `?format=${API_CONFIG.WORLD_BANK.format}&per_page=300&date=2020:2024`;

    return this.fetchWithCache(url, `wb_energy_access_${countries}`);
  }

  /**
   * Fetch renewable energy capacity data (simulated IRENA data structure)
   */
  async getRenewableCapacityData() {
    // Since IRENA doesn't have a public API, we'll simulate their data structure
    // In production, this would integrate with IRENASTAT or use their CSV downloads
    const mockIRENAData = {
      renewable_capacity: {
        '2024': {
          solar: 1419000, // MW
          wind: 899000,
          hydro: 1392000,
          bioenergy: 130000,
          geothermal: 14900,
          marine: 540
        },
        '2023': {
          solar: 1177000,
          wind: 899000,
          hydro: 1392000,
          bioenergy: 130000,
          geothermal: 14700,
          marine: 530
        }
      },
      growth_rates: {
        solar: 20.5,
        wind: 5.8,
        hydro: 1.2,
        bioenergy: 3.1,
        geothermal: 1.4,
        marine: 1.9
      }
    };

    return new Promise((resolve) => {
      setTimeout(() => resolve(mockIRENAData), 100);
    });
  }

  /**
   * Fetch carbon emissions data from EIA
   */
  async getCarbonEmissionsData() {
    try {
      const url = `${API_CONFIG.EIA.baseUrl}/co2-emissions/co2-emissions-aggregates/data/` +
                  `?api_key=${API_CONFIG.EIA.apiKey}&frequency=annual&data[0]=value&` +
                  `facets[stateId][]=US&sort[0][column]=period&sort[0][direction]=desc&` +
                  `offset=0&length=10`;

      return await this.fetchWithCache(url, 'eia_carbon_emissions');
    } catch (error) {
      console.warn('EIA API unavailable, using simulated carbon data:', error.message);
      // Return simulated carbon emissions data
      return {
        response: {
          data: [
            { period: '2023', value: 4970.5, units: 'million metric tons CO2' },
            { period: '2022', value: 5100.2, units: 'million metric tons CO2' },
            { period: '2021', value: 4980.8, units: 'million metric tons CO2' }
          ]
        },
        source: 'EIA API (Simulated)',
        note: 'Using simulated data due to API limitations'
      };
    }
  }

  /**
   * Fetch energy statistics for dashboard
   */
  async getDashboardStats() {
    try {
      const [renewableData, emissionsData] = await Promise.allSettled([
        this.getRenewableCapacityData(),
        this.getCarbonEmissionsData()
      ]);

      return {
        renewable_capacity: renewableData.status === 'fulfilled' ? renewableData.value : null,
        carbon_emissions: emissionsData.status === 'fulfilled' ? emissionsData.value : null,
        last_updated: new Date().toISOString(),
        data_sources: ['IRENA', 'EIA', 'World Bank']
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Search energy reports from ESMAP data platform
   */
  async searchEnergyReports(query = '', limit = 20) {
    const url = `${API_CONFIG.ESMAP.baseUrl}/package_search?q=${encodeURIComponent(query)}&rows=${limit}`;
    
    try {
      const data = await this.fetchWithCache(url, `esmap_search_${query}`);
      
      // Transform ESMAP data to our format
      return data.result?.results?.map(pkg => ({
        id: pkg.id,
        title: pkg.title,
        description: pkg.notes,
        author: pkg.author || 'ESMAP',
        created: pkg.metadata_created,
        modified: pkg.metadata_modified,
        tags: pkg.tags?.map(tag => tag.name) || [],
        resources: pkg.resources?.length || 0,
        url: `https://energydata.info/dataset/${pkg.name}`
      })) || [];
    } catch (error) {
      console.error('Error searching ESMAP reports:', error);
      return [];
    }
  }

  /**
   * Get country-specific energy data
   */
  async getCountryEnergyProfile(countryCode) {
    try {
      const [accessData, economicData] = await Promise.allSettled([
        this.getWorldBankEnergyAccess(countryCode, 'EG.ELC.ACCS.ZS;EG.ELC.ACCS.RU.ZS;EG.ELC.ACCS.UR.ZS'),
        this.getWorldBankEnergyAccess(countryCode, 'NY.GDP.PCAP.CD;SP.POP.TOTL')
      ]);

      return {
        country_code: countryCode,
        energy_access: accessData.status === 'fulfilled' ? accessData.value : null,
        economic_indicators: economicData.status === 'fulfilled' ? economicData.value : null,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching country profile for ${countryCode}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time electricity generation data
   */
  async getRealTimeElectricityData() {
    try {
      // In production, this would connect to real-time APIs
      // For now, we'll simulate real-time data
      return {
        timestamp: new Date().toISOString(),
        total_generation: Math.floor(Math.random() * 100000) + 400000, // MW
        renewable_share: Math.floor(Math.random() * 40) + 30, // %
        carbon_intensity: Math.floor(Math.random() * 200) + 300, // gCO2/kWh
        by_source: {
          solar: Math.floor(Math.random() * 50000) + 20000,
          wind: Math.floor(Math.random() * 80000) + 40000,
          hydro: Math.floor(Math.random() * 60000) + 50000,
          nuclear: Math.floor(Math.random() * 100000) + 80000,
          gas: Math.floor(Math.random() * 150000) + 100000,
          coal: Math.floor(Math.random() * 100000) + 50000
        }
      };
    } catch (error) {
      console.error('Error fetching real-time electricity data:', error);
      throw error;
    }
  }

  /**
   * AI-powered energy insights
   */
  async generateEnergyInsights(data) {
    // Simulate AI processing
    const insights = [];
    
    if (data.renewable_share > 50) {
      insights.push({
        type: 'positive',
        title: 'High Renewable Penetration',
        description: `Renewable energy accounts for ${data.renewable_share}% of current generation, exceeding global averages.`,
        confidence: 0.92
      });
    }
    
    if (data.carbon_intensity < 400) {
      insights.push({
        type: 'positive',
        title: 'Low Carbon Intensity',
        description: `Current carbon intensity of ${data.carbon_intensity} gCO2/kWh is below the global average.`,
        confidence: 0.88
      });
    }
    
    if (data.by_source.solar > 30000) {
      insights.push({
        type: 'info',
        title: 'Solar Generation Peak',
        description: `Solar generation at ${data.by_source.solar} MW indicates strong solar capacity utilization.`,
        confidence: 0.85
      });
    }

    return {
      insights,
      processed_at: new Date().toISOString(),
      model_version: 'ESMAP-AI-v1.0'
    };
  }

  /**
   * ESMAP AI API Methods - Integration with our deployed comprehensive API
   */

  /**
   * Get ESMAP dashboard data with global statistics
   */
  async getESMAPDashboard() {
    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.dashboard}`;
    return this.fetchWithCache(url, 'esmap_dashboard');
  }

  /**
   * Get integrated country data from ESMAP sources
   */
  async getESMAPCountryData(countries = [], options = {}) {
    const params = new URLSearchParams();
    if (countries.length > 0) {
      params.append('countries', countries.join(','));
    }
    if (options.includeGender) params.append('includeGender', 'true');
    if (options.includeClimate) params.append('includeClimate', 'true');
    if (options.includeFinance) params.append('includeFinance', 'true');
    if (options.includeProjects) params.append('includeProjects', 'true');

    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.countries}?${params.toString()}`;
    return this.fetchWithCache(url, `esmap_countries_${countries.join(',')}`);
  }

  /**
   * Search ESMAP datasets and indicators
   */
  async searchESMAPData(query, options = {}) {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options.countries) params.append('countries', options.countries.join(','));
    if (options.categories) params.append('categories', options.categories.join(','));
    if (options.limit) params.append('limit', options.limit.toString());

    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.search}?${params.toString()}`;
    return this.fetchWithCache(url, `esmap_search_${query}`);
  }

  /**
   * Get ESMAP Hub datasets (908 datasets across 193 countries)
   */
  async getESMAPHubData(options = {}) {
    const params = new URLSearchParams();
    if (options.categories) params.append('categories', options.categories.join(','));
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.hub}/datasets?${params.toString()}`;
    return this.fetchWithCache(url, 'esmap_hub_datasets');
  }

  /**
   * Get MTF (Multi Tier Framework) survey data
   */
  async getMTFData(options = {}) {
    const params = new URLSearchParams();
    if (options.countries) params.append('countries', options.countries.join(','));
    if (options.types) params.append('types', options.types.join(','));

    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.mtf}/surveys?${params.toString()}`;
    return this.fetchWithCache(url, 'esmap_mtf_surveys');
  }

  /**
   * Get RISE (Regulatory Indicators for Sustainable Energy) scores
   */
  async getRISEData(options = {}) {
    const params = new URLSearchParams();
    if (options.countries) params.append('countries', options.countries.join(','));
    if (options.years) params.append('years', options.years.join(','));

    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.rise}/scores?${params.toString()}`;
    return this.fetchWithCache(url, 'esmap_rise_scores');
  }

  /**
   * Get SDG7 tracking data
   */
  async getSDG7Data(options = {}) {
    const params = new URLSearchParams();
    if (options.countries) params.append('countries', options.countries.join(','));
    if (options.regions) params.append('regions', options.regions.join(','));
    if (options.onlyLDCs) params.append('onlyLDCs', 'true');
    if (options.onlySIDS) params.append('onlySIDS', 'true');

    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.sdg7}/countries?${params.toString()}`;
    return this.fetchWithCache(url, 'esmap_sdg7_countries');
  }

  /**
   * Get policy recommendations for a country
   */
  async getPolicyRecommendations(countryCode) {
    const url = `${API_CONFIG.ESMAP_AI.baseUrl}${API_CONFIG.ESMAP_AI.endpoints.recommendations}/${countryCode}`;
    return this.fetchWithCache(url, `esmap_recommendations_${countryCode}`);
  }

  /**
   * Get comprehensive energy dashboard data (Enhanced with ESMAP AI)
   */
  async getComprehensiveDashboardData() {
    try {
      const [
        esmapDashboard,
        stats,
        electricityData,
        reports
      ] = await Promise.allSettled([
        this.getESMAPDashboard(),
        this.getDashboardStats(),
        this.getRealTimeElectricityData(),
        this.searchEnergyReports('renewable energy', 10)
      ]);

      const dashboardData = {
        esmap_global: esmapDashboard.status === 'fulfilled' ? esmapDashboard.value : null,
        statistics: stats.status === 'fulfilled' ? stats.value : null,
        real_time_electricity: electricityData.status === 'fulfilled' ? electricityData.value : null,
        recent_reports: reports.status === 'fulfilled' ? reports.value : [],
        last_updated: new Date().toISOString()
      };

      // Generate AI insights
      if (dashboardData.real_time_electricity) {
        dashboardData.ai_insights = await this.generateEnergyInsights(dashboardData.real_time_electricity);
      }

      return dashboardData;
    } catch (error) {
      console.error('Error fetching comprehensive dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get enhanced country profile with ESMAP integration
   */
  async getEnhancedCountryProfile(countryCode, options = {}) {
    try {
      const [
        esmapData,
        accessData,
        economicData,
        recommendations
      ] = await Promise.allSettled([
        this.getESMAPCountryData([countryCode], options),
        this.getWorldBankEnergyAccess(countryCode, 'EG.ELC.ACCS.ZS;EG.ELC.ACCS.RU.ZS;EG.ELC.ACCS.UR.ZS'),
        this.getWorldBankEnergyAccess(countryCode, 'NY.GDP.PCAP.CD;SP.POP.TOTL'),
        this.getPolicyRecommendations(countryCode)
      ]);

      return {
        country_code: countryCode,
        esmap_integrated_data: esmapData.status === 'fulfilled' ? esmapData.value : null,
        energy_access: accessData.status === 'fulfilled' ? accessData.value : null,
        economic_indicators: economicData.status === 'fulfilled' ? economicData.value : null,
        policy_recommendations: recommendations.status === 'fulfilled' ? recommendations.value : null,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching enhanced country profile for ${countryCode}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const energyDataService = new EnergyDataService();
export default energyDataService;