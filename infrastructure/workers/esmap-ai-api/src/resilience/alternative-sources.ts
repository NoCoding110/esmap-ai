/**
 * Alternative Data Source Mapping and Crowdsourced Data Integration
 * Maps government open data portals, academic databases, and crowdsourced platforms
 */

import {
  CrowdsourcedDataSource,
  QualityFilter,
  DataSourceConfig,
  DataSourceType
} from './types';

export interface GovernmentDataPortal {
  id: string;
  name: string;
  country: string;
  baseUrl: string;
  apiEndpoint: string;
  apiKey?: string;
  dataFormat: 'json' | 'xml' | 'csv';
  catalog: {
    endpoint: string;
    totalDatasets: number;
    energyDatasets: number;
  };
  authentication: {
    required: boolean;
    type?: 'api_key' | 'oauth' | 'basic_auth';
    registrationUrl?: string;
  };
  updateFrequency: string;
  dataLicense: string;
  contactInfo: {
    email: string;
    website: string;
    supportUrl?: string;
  };
  reliability: {
    uptime: number;
    responseTime: number;
    dataQuality: number;
  };
  supportedQueries: string[];
}

export interface AcademicDatabase {
  id: string;
  name: string;
  institution: string;
  baseUrl: string;
  apiEndpoint?: string;
  accessType: 'open' | 'subscription' | 'request_based';
  subjects: string[];
  dataTypes: string[];
  coverage: {
    geographic: string[];
    temporal: {
      startYear: number;
      endYear: number;
    };
  };
  searchInterface: {
    endpoint: string;
    queryParameters: string[];
    resultFormat: string;
  };
  downloadOptions: {
    formats: string[];
    restrictions: string[];
    quotas?: {
      daily: number;
      monthly: number;
    };
  };
  citationRequired: boolean;
  embargoPolicy?: string;
}

export interface OpenStreetMapQuery {
  query: string;
  bbox?: [number, number, number, number]; // [south, west, north, east]
  country?: string;
  tags: Record<string, string>;
  outputFormat: 'json' | 'xml';
  maxResults?: number;
}

export interface WikidataQuery {
  sparql: string;
  language?: string;
  format: 'json' | 'xml' | 'csv';
  timeout?: number;
}

export interface CitizenScienceProject {
  id: string;
  name: string;
  platform: string;
  apiEndpoint: string;
  dataType: string;
  participantCount: number;
  dataQualityMeasures: {
    validation: string[];
    verification: string[];
    qualityControl: string[];
  };
  dataAvailability: {
    realTime: boolean;
    historical: boolean;
    downloadable: boolean;
    apiAccess: boolean;
  };
  geographicCoverage: string[];
  temporalCoverage: {
    startDate: string;
    ongoing: boolean;
  };
}

export class AlternativeDataSourceManager {
  private governmentPortals: Map<string, GovernmentDataPortal> = new Map();
  private academicDatabases: Map<string, AcademicDatabase> = new Map();
  private crowdsourcedSources: Map<string, CrowdsourcedDataSource> = new Map();
  private citizenScienceProjects: Map<string, CitizenScienceProject> = new Map();

  constructor() {
    this.initializeDefaultSources();
  }

  /**
   * Initialize default alternative data sources
   */
  private initializeDefaultSources(): void {
    this.initializeGovernmentPortals();
    this.initializeAcademicDatabases();
    this.initializeCrowdsourcedSources();
    this.initializeCitizenScienceProjects();
  }

  /**
   * Initialize government data portals
   */
  private initializeGovernmentPortals(): void {
    // Global/International Portals
    this.governmentPortals.set('world-bank-open-data', {
      id: 'world-bank-open-data',
      name: 'World Bank Open Data',
      country: 'Global',
      baseUrl: 'https://data.worldbank.org',
      apiEndpoint: 'https://api.worldbank.org/v2',
      dataFormat: 'json',
      catalog: {
        endpoint: '/indicators',
        totalDatasets: 2000,
        energyDatasets: 50
      },
      authentication: { required: false },
      updateFrequency: 'Annual',
      dataLicense: 'CC BY 4.0',
      contactInfo: {
        email: 'data@worldbank.org',
        website: 'https://data.worldbank.org',
        supportUrl: 'https://datahelpdesk.worldbank.org'
      },
      reliability: { uptime: 99.5, responseTime: 500, dataQuality: 0.95 },
      supportedQueries: ['country', 'indicator', 'date', 'format']
    });

    // US Government
    this.governmentPortals.set('us-data-gov', {
      id: 'us-data-gov',
      name: 'Data.gov (United States)',
      country: 'United States',
      baseUrl: 'https://catalog.data.gov',
      apiEndpoint: 'https://catalog.data.gov/api/3',
      dataFormat: 'json',
      catalog: {
        endpoint: '/action/package_search',
        totalDatasets: 300000,
        energyDatasets: 5000
      },
      authentication: { required: false },
      updateFrequency: 'Continuous',
      dataLicense: 'Public Domain',
      contactInfo: {
        email: 'data.gov@gsa.gov',
        website: 'https://data.gov',
        supportUrl: 'https://data.gov/contact'
      },
      reliability: { uptime: 99.0, responseTime: 800, dataQuality: 0.90 },
      supportedQueries: ['q', 'fq', 'rows', 'start']
    });

    // European Union
    this.governmentPortals.set('eu-open-data', {
      id: 'eu-open-data',
      name: 'European Data Portal',
      country: 'European Union',
      baseUrl: 'https://data.europa.eu',
      apiEndpoint: 'https://data.europa.eu/api/hub/search',
      dataFormat: 'json',
      catalog: {
        endpoint: '/datasets',
        totalDatasets: 1000000,
        energyDatasets: 15000
      },
      authentication: { required: false },
      updateFrequency: 'Daily',
      dataLicense: 'Various (mostly CC)',
      contactInfo: {
        email: 'contact@data.europa.eu',
        website: 'https://data.europa.eu',
        supportUrl: 'https://data.europa.eu/en/about'
      },
      reliability: { uptime: 98.5, responseTime: 600, dataQuality: 0.92 },
      supportedQueries: ['query', 'filter', 'facets', 'sort']
    });

    // UK Government
    this.governmentPortals.set('uk-data-gov', {
      id: 'uk-data-gov',
      name: 'Data.gov.uk',
      country: 'United Kingdom',
      baseUrl: 'https://data.gov.uk',
      apiEndpoint: 'https://data.gov.uk/api/3',
      dataFormat: 'json',
      catalog: {
        endpoint: '/action/package_search',
        totalDatasets: 60000,
        energyDatasets: 2000
      },
      authentication: { required: false },
      updateFrequency: 'Daily',
      dataLicense: 'OGL v3.0',
      contactInfo: {
        email: 'data.gov.uk@digital.cabinet-office.gov.uk',
        website: 'https://data.gov.uk',
        supportUrl: 'https://data.gov.uk/support'
      },
      reliability: { uptime: 99.2, responseTime: 700, dataQuality: 0.88 },
      supportedQueries: ['q', 'fq', 'rows', 'start', 'sort']
    });
  }

  /**
   * Initialize academic databases
   */
  private initializeAcademicDatabases(): void {
    this.academicDatabases.set('harvard-dataverse', {
      id: 'harvard-dataverse',
      name: 'Harvard Dataverse',
      institution: 'Harvard University',
      baseUrl: 'https://dataverse.harvard.edu',
      apiEndpoint: 'https://dataverse.harvard.edu/api',
      accessType: 'open',
      subjects: ['Energy', 'Environment', 'Economics', 'Social Sciences'],
      dataTypes: ['Survey Data', 'Time Series', 'Experimental Data', 'Geospatial Data'],
      coverage: {
        geographic: ['Global'],
        temporal: { startYear: 1900, endYear: 2024 }
      },
      searchInterface: {
        endpoint: '/search',
        queryParameters: ['q', 'type', 'subtree', 'sort', 'order'],
        resultFormat: 'json'
      },
      downloadOptions: {
        formats: ['CSV', 'XLSX', 'JSON', 'Stata', 'R', 'SPSS'],
        restrictions: ['Citation Required'],
        quotas: { daily: 1000, monthly: 10000 }
      },
      citationRequired: true
    });

    this.academicDatabases.set('mit-energy-data', {
      id: 'mit-energy-data',
      name: 'MIT Energy Data Repository',
      institution: 'Massachusetts Institute of Technology',
      baseUrl: 'https://energy.mit.edu/data',
      accessType: 'open',
      subjects: ['Energy Systems', 'Renewable Energy', 'Energy Economics'],
      dataTypes: ['Model Results', 'Technology Data', 'Cost Data', 'Performance Data'],
      coverage: {
        geographic: ['Global', 'United States'],
        temporal: { startYear: 1990, endYear: 2024 }
      },
      searchInterface: {
        endpoint: '/api/search',
        queryParameters: ['query', 'category', 'technology', 'region'],
        resultFormat: 'json'
      },
      downloadOptions: {
        formats: ['CSV', 'JSON', 'Excel'],
        restrictions: ['Non-commercial Use'],
        quotas: { daily: 500, monthly: 5000 }
      },
      citationRequired: true
    });

    this.academicDatabases.set('oxford-energy-data', {
      id: 'oxford-energy-data',
      name: 'Oxford Institute for Energy Studies Database',
      institution: 'Oxford University',
      baseUrl: 'https://www.oxfordenergy.org/data',
      accessType: 'subscription',
      subjects: ['Energy Markets', 'Natural Gas', 'Oil Markets', 'Energy Policy'],
      dataTypes: ['Market Data', 'Price Data', 'Production Data', 'Trade Data'],
      coverage: {
        geographic: ['Global', 'Europe', 'Middle East', 'Asia'],
        temporal: { startYear: 1970, endYear: 2024 }
      },
      searchInterface: {
        endpoint: '/api/data',
        queryParameters: ['commodity', 'region', 'timeframe', 'frequency'],
        resultFormat: 'json'
      },
      downloadOptions: {
        formats: ['CSV', 'Excel', 'PDF'],
        restrictions: ['Subscription Required', 'Commercial Use Restricted']
      },
      citationRequired: true,
      embargoPolicy: '6 months for most recent data'
    });
  }

  /**
   * Initialize crowdsourced data sources
   */
  private initializeCrowdsourcedSources(): void {
    this.crowdsourcedSources.set('openstreetmap', {
      id: 'openstreetmap',
      name: 'OpenStreetMap',
      type: 'openstreetmap',
      apiEndpoint: 'https://overpass-api.de/api/interpreter',
      queryBuilder: this.buildOSMQuery.bind(this),
      dataMapper: this.mapOSMData.bind(this),
      qualityFilters: [
        { name: 'contributor_count', condition: 'min_contributors', threshold: 2 },
        { name: 'last_edit', condition: 'max_age_days', threshold: 365 },
        { name: 'completeness', condition: 'required_tags_present', threshold: 0.8 }
      ],
      contributorVerification: false,
      minimumContributors: 1
    });

    this.crowdsourcedSources.set('wikidata', {
      id: 'wikidata',
      name: 'Wikidata',
      type: 'wikidata',
      apiEndpoint: 'https://query.wikidata.org/sparql',
      queryBuilder: this.buildWikidataQuery.bind(this),
      dataMapper: this.mapWikidataResults.bind(this),
      qualityFilters: [
        { name: 'reference_count', condition: 'min_references', threshold: 1 },
        { name: 'source_quality', condition: 'reliable_sources', threshold: 0.7 },
        { name: 'data_freshness', condition: 'max_age_years', threshold: 5 }
      ],
      contributorVerification: true,
      minimumContributors: 1
    });

    this.crowdsourcedSources.set('community-energy-monitoring', {
      id: 'community-energy-monitoring',
      name: 'Community Energy Monitoring Network',
      type: 'community_monitoring',
      apiEndpoint: 'https://api.energy-communities.org/v1',
      queryBuilder: this.buildCommunityQuery.bind(this),
      dataMapper: this.mapCommunityData.bind(this),
      qualityFilters: [
        { name: 'device_calibration', condition: 'calibration_date', threshold: 180 },
        { name: 'data_consistency', condition: 'variance_threshold', threshold: 0.2 },
        { name: 'reporting_frequency', condition: 'min_reports_per_month', threshold: 10 }
      ],
      contributorVerification: true,
      minimumContributors: 3
    });
  }

  /**
   * Initialize citizen science projects
   */
  private initializeCitizenScienceProjects(): void {
    this.citizenScienceProjects.set('globe-program', {
      id: 'globe-program',
      name: 'GLOBE Program',
      platform: 'NASA GLOBE',
      apiEndpoint: 'https://api.globe.gov/search/v1',
      dataType: 'Environmental Measurements',
      participantCount: 50000,
      dataQualityMeasures: {
        validation: ['Protocol Compliance', 'Range Checks', 'Temporal Consistency'],
        verification: ['Expert Review', 'Cross-validation', 'Instrument Calibration'],
        qualityControl: ['Automated QC', 'Community Flagging', 'Statistical Outlier Detection']
      },
      dataAvailability: {
        realTime: false,
        historical: true,
        downloadable: true,
        apiAccess: true
      },
      geographicCoverage: ['Global'],
      temporalCoverage: {
        startDate: '1995-01-01',
        ongoing: true
      }
    });

    this.citizenScienceProjects.set('smart-citizen', {
      id: 'smart-citizen',
      name: 'Smart Citizen',
      platform: 'Fab City Foundation',
      apiEndpoint: 'https://api.smartcitizen.me/v0',
      dataType: 'Urban Environmental Data',
      participantCount: 5000,
      dataQualityMeasures: {
        validation: ['Sensor Validation', 'Data Range Checks', 'Temporal Validation'],
        verification: ['Peer Validation', 'Reference Station Comparison'],
        qualityControl: ['Automated QA/QC', 'Community Moderation']
      },
      dataAvailability: {
        realTime: true,
        historical: true,
        downloadable: true,
        apiAccess: true
      },
      geographicCoverage: ['Europe', 'Americas', 'Asia'],
      temporalCoverage: {
        startDate: '2014-01-01',
        ongoing: true
      }
    });
  }

  /**
   * Query builders for different data sources
   */
  private buildOSMQuery(params: any): string {
    const { tags, bbox, country } = params;
    
    let query = '[out:json][timeout:25];\n(\n';
    
    for (const [key, value] of Object.entries(tags)) {
      if (bbox) {
        query += `  node["${key}"="${value}"](${bbox.join(',')});\n`;
        query += `  way["${key}"="${value}"](${bbox.join(',')});\n`;
        query += `  relation["${key}"="${value}"](${bbox.join(',')});\n`;
      } else if (country) {
        query += `  node["${key}"="${value}"]["addr:country"="${country}"];\n`;
        query += `  way["${key}"="${value}"]["addr:country"="${country}"];\n`;
        query += `  relation["${key}"="${value}"]["addr:country"="${country}"];\n`;
      } else {
        query += `  node["${key}"="${value}"];\n`;
        query += `  way["${key}"="${value}"];\n`;
        query += `  relation["${key}"="${value}"];\n`;
      }
    }
    
    query += ');\nout center meta;';
    return query;
  }

  private buildWikidataQuery(params: any): string {
    const { subject, properties, limit = 1000 } = params;
    
    return `
      SELECT ?item ?itemLabel ${properties.map((p: string) => `?${p}`).join(' ')} WHERE {
        ?item wdt:P31 wd:${subject} .
        ${properties.map((p: string) => `OPTIONAL { ?item wdt:${p} ?${p} . }`).join('\n        ')}
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      LIMIT ${limit}
    `;
  }

  private buildCommunityQuery(params: any): string {
    const { location, energyType, dateRange } = params;
    
    const queryParams = new URLSearchParams();
    if (location) queryParams.append('location', location);
    if (energyType) queryParams.append('energy_type', energyType);
    if (dateRange) {
      queryParams.append('start_date', dateRange.start);
      queryParams.append('end_date', dateRange.end);
    }
    
    return `/measurements?${queryParams.toString()}`;
  }

  /**
   * Data mappers for different sources
   */
  private mapOSMData(rawData: any): any {
    const elements = rawData.elements || [];
    
    return elements.map((element: any) => ({
      id: element.id,
      type: element.type,
      coordinates: element.type === 'node' ? 
        [element.lat, element.lon] : 
        element.center ? [element.center.lat, element.center.lon] : null,
      tags: element.tags || {},
      lastModified: element.timestamp,
      contributors: element.uid ? [element.uid] : [],
      version: element.version || 1
    }));
  }

  private mapWikidataResults(rawData: any): any {
    const bindings = rawData.results?.bindings || [];
    
    return bindings.map((binding: any) => {
      const mapped: any = {};
      
      for (const [key, value] of Object.entries(binding)) {
        mapped[key] = (value as any).value;
      }
      
      return mapped;
    });
  }

  private mapCommunityData(rawData: any): any {
    const measurements = rawData.measurements || [];
    
    return measurements.map((measurement: any) => ({
      id: measurement.id,
      deviceId: measurement.device_id,
      location: measurement.location,
      energyType: measurement.energy_type,
      value: measurement.value,
      unit: measurement.unit,
      timestamp: measurement.timestamp,
      quality: measurement.quality_score,
      contributors: measurement.contributors || []
    }));
  }

  /**
   * Query government data portal
   */
  async queryGovernmentPortal(portalId: string, query: Record<string, any>): Promise<any> {
    const portal = this.governmentPortals.get(portalId);
    if (!portal) {
      throw new Error(`Government portal ${portalId} not found`);
    }

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (portal.supportedQueries.includes(key)) {
        queryParams.append(key, String(value));
      }
    }

    const url = `${portal.apiEndpoint}${portal.catalog.endpoint}?${queryParams.toString()}`;
    
    const headers: Record<string, string> = {
      'Accept': portal.dataFormat === 'json' ? 'application/json' : 'application/xml',
      'User-Agent': 'ESMAP-AI-Platform/1.0'
    };

    if (portal.apiKey) {
      headers['Authorization'] = `Bearer ${portal.apiKey}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = portal.dataFormat === 'json' ? 
        await response.json() : 
        await response.text();

      return {
        portalId,
        portalName: portal.name,
        data,
        metadata: {
          responseTime: 0, // Would be calculated
          dataFormat: portal.dataFormat,
          license: portal.dataLicense,
          source: portal.baseUrl
        }
      };

    } catch (error) {
      console.error(`Error querying government portal ${portalId}:`, error);
      throw error;
    }
  }

  /**
   * Query academic database
   */
  async queryAcademicDatabase(databaseId: string, query: Record<string, any>): Promise<any> {
    const database = this.academicDatabases.get(databaseId);
    if (!database) {
      throw new Error(`Academic database ${databaseId} not found`);
    }

    if (database.accessType === 'subscription') {
      throw new Error(`Database ${databaseId} requires subscription access`);
    }

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (database.searchInterface.queryParameters.includes(key)) {
        queryParams.append(key, String(value));
      }
    }

    const url = `${database.baseUrl}${database.searchInterface.endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ESMAP-AI-Platform/1.0 (Research Use)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        databaseId,
        databaseName: database.name,
        institution: database.institution,
        data,
        metadata: {
          citationRequired: database.citationRequired,
          embargoPolicy: database.embargoPolicy,
          accessType: database.accessType,
          availableFormats: database.downloadOptions.formats
        }
      };

    } catch (error) {
      console.error(`Error querying academic database ${databaseId}:`, error);
      throw error;
    }
  }

  /**
   * Query crowdsourced data source
   */
  async queryCrowdsourcedSource(sourceId: string, params: any): Promise<any> {
    const source = this.crowdsourcedSources.get(sourceId);
    if (!source) {
      throw new Error(`Crowdsourced source ${sourceId} not found`);
    }

    try {
      let query: string;
      let url: string;
      let method = 'GET';
      let body: string | undefined;

      if (sourceId === 'openstreetmap') {
        query = source.queryBuilder(params);
        url = source.apiEndpoint;
        method = 'POST';
        body = query;
      } else if (sourceId === 'wikidata') {
        query = source.queryBuilder(params);
        url = `${source.apiEndpoint}?query=${encodeURIComponent(query)}&format=json`;
      } else {
        query = source.queryBuilder(params);
        url = `${source.apiEndpoint}${query}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ESMAP-AI-Platform/1.0',
          ...(method === 'POST' && { 'Content-Type': 'text/plain' })
        },
        body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      const mappedData = source.dataMapper(rawData);

      // Apply quality filters
      const filteredData = this.applyQualityFilters(mappedData, source.qualityFilters);

      return {
        sourceId,
        sourceName: source.name,
        data: filteredData,
        metadata: {
          totalResults: mappedData.length,
          filteredResults: filteredData.length,
          qualityFilters: source.qualityFilters,
          contributorVerification: source.contributorVerification,
          minimumContributors: source.minimumContributors
        }
      };

    } catch (error) {
      console.error(`Error querying crowdsourced source ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * Apply quality filters to crowdsourced data
   */
  private applyQualityFilters(data: any[], filters: QualityFilter[]): any[] {
    return data.filter(item => {
      return filters.every(filter => {
        switch (filter.condition) {
          case 'min_contributors':
            return (item.contributors?.length || 0) >= filter.threshold;
          case 'max_age_days':
            const ageMs = Date.now() - new Date(item.lastModified || item.timestamp).getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            return ageDays <= filter.threshold;
          case 'required_tags_present':
            const requiredTags = ['name', 'type'];
            const presentTags = requiredTags.filter(tag => item.tags?.[tag]).length;
            return (presentTags / requiredTags.length) >= filter.threshold;
          case 'min_references':
            return (item.references?.length || 0) >= filter.threshold;
          case 'reliable_sources':
            return (item.sourceQuality || 0) >= filter.threshold;
          case 'max_age_years':
            const ageYears = (Date.now() - new Date(item.timestamp).getTime()) / (1000 * 60 * 60 * 24 * 365);
            return ageYears <= filter.threshold;
          default:
            return true;
        }
      });
    });
  }

  /**
   * Get available government portals
   */
  getGovernmentPortals(): GovernmentDataPortal[] {
    return Array.from(this.governmentPortals.values());
  }

  /**
   * Get available academic databases
   */
  getAcademicDatabases(): AcademicDatabase[] {
    return Array.from(this.academicDatabases.values());
  }

  /**
   * Get available crowdsourced sources
   */
  getCrowdsourcedSources(): CrowdsourcedDataSource[] {
    return Array.from(this.crowdsourcedSources.values());
  }

  /**
   * Get available citizen science projects
   */
  getCitizenScienceProjects(): CitizenScienceProject[] {
    return Array.from(this.citizenScienceProjects.values());
  }

  /**
   * Register custom data source
   */
  registerGovernmentPortal(portal: GovernmentDataPortal): void {
    this.governmentPortals.set(portal.id, portal);
  }

  registerAcademicDatabase(database: AcademicDatabase): void {
    this.academicDatabases.set(database.id, database);
  }

  registerCrowdsourcedSource(source: CrowdsourcedDataSource): void {
    this.crowdsourcedSources.set(source.id, source);
  }

  registerCitizenScienceProject(project: CitizenScienceProject): void {
    this.citizenScienceProjects.set(project.id, project);
  }

  /**
   * Convert alternative sources to standard DataSourceConfig format
   */
  convertToDataSourceConfig(sourceType: 'government' | 'academic' | 'crowdsourced', sourceId: string): DataSourceConfig | null {
    let source: any;
    let type: DataSourceType;

    switch (sourceType) {
      case 'government':
        source = this.governmentPortals.get(sourceId);
        type = DataSourceType.GOVERNMENT;
        break;
      case 'academic':
        source = this.academicDatabases.get(sourceId);
        type = DataSourceType.ACADEMIC;
        break;
      case 'crowdsourced':
        source = this.crowdsourcedSources.get(sourceId);
        type = DataSourceType.CROWDSOURCED;
        break;
      default:
        return null;
    }

    if (!source) return null;

    return {
      id: source.id,
      name: source.name,
      type,
      priority: 3, // Alternative sources have lower priority
      baseUrl: source.baseUrl || source.apiEndpoint,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      timeout: 10000,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        jitter: true
      },
      healthCheck: {
        endpoint: '/health',
        interval: 300,
        timeout: 5000
      },
      compliance: {
        respectsRobotsTxt: true,
        hasTermsOfService: true,
        requiresAttribution: true,
        dataUsageRestrictions: [],
        lastComplianceCheck: new Date().toISOString(),
        complianceNotes: `Alternative data source: ${sourceType}`
      },
      metadata: {
        description: source.name,
        dataFormat: 'json',
        updateFrequency: source.updateFrequency || 'Unknown',
        coverage: {
          geographic: source.geographicCoverage || ['Unknown'],
          temporal: {
            startDate: source.temporalCoverage?.startDate,
            endDate: source.temporalCoverage?.ongoing ? undefined : '2024-12-31'
          },
          topics: source.subjects || ['Energy']
        },
        quality: {
          accuracy: source.reliability?.dataQuality || 0.8,
          completeness: 0.8,
          timeliness: 0.8,
          reliability: source.reliability?.uptime || 95,
          overall: source.reliability?.dataQuality || 0.8
        },
        lastUpdated: new Date().toISOString(),
        maintainer: {
          name: source.institution || source.platform || source.country,
          contact: source.contactInfo?.email || '',
          organization: source.institution || source.platform || 'Government'
        }
      }
    };
  }
}