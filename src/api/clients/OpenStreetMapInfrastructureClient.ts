/**
 * OpenStreetMap Infrastructure Mapper Client
 * 
 * Comprehensive client for mapping energy infrastructure using OpenStreetMap data
 * via the Overpass API with geospatial indexing and advanced analytics
 */

import {
  OverpassResponse,
  OverpassElement,
  InfrastructureAsset,
  InfrastructureType,
  PowerSource,
  VoltageLevel,
  InfrastructureQuery,
  InfrastructureSearchResult,
  InfrastructureStatistics,
  InfrastructureLocation,
  InfrastructureProperties,
  InfrastructureGeometry,
  InfrastructureMetadata,
  InfrastructureDataQuality,
  ValidationFlag,
  InfrastructureBoundingBox,
  GeospatialIndex,
  QuadTreeNode,
  InfrastructureDensity,
  DensityCell,
  HeatmapPoint,
  InfrastructureNetwork,
  NetworkNode,
  NetworkEdge,
  InfrastructureCache,
  CacheStatistics,
  CachePriority,
  InfrastructureMapperConfig,
  InfrastructureApiError,
  InfrastructureApiErrorType,
  InfrastructureApiResponse,
  InfrastructureVisualization,
  VisualizationLayer,
  GeoJSONFeature
} from '../types/InfrastructureDataTypes';

// =============================================================================
// OVERPASS QUERY BUILDER
// =============================================================================

export class OverpassQueryBuilder {
  /**
   * Build Overpass query for infrastructure assets
   */
  static buildInfrastructureQuery(query: InfrastructureQuery): string {
    const bbox = `${query.boundingBox[0]},${query.boundingBox[1]},${query.boundingBox[2]},${query.boundingBox[3]}`;
    const timeout = 180; // 3 minutes
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    let overpassQuery = `[out:json][timeout:${timeout}][maxsize:${maxSize}];\n(\n`;

    // Add queries for each infrastructure type
    for (const type of query.types) {
      const typeQueries = this.getQueriesForType(type, bbox);
      overpassQuery += typeQueries.join('\n') + '\n';
    }

    overpassQuery += ');\nout geom;';
    
    return overpassQuery;
  }

  /**
   * Get Overpass queries for specific infrastructure type
   */
  private static getQueriesForType(type: InfrastructureType, bbox: string): string[] {
    const queries: string[] = [];

    switch (type) {
      case InfrastructureType.POWER_PLANT:
        queries.push(`  node["power"="plant"](${bbox});`);
        queries.push(`  way["power"="plant"](${bbox});`);
        queries.push(`  relation["power"="plant"](${bbox});`);
        break;

      case InfrastructureType.SUBSTATION:
        queries.push(`  node["power"="substation"](${bbox});`);
        queries.push(`  way["power"="substation"](${bbox});`);
        queries.push(`  relation["power"="substation"](${bbox});`);
        break;

      case InfrastructureType.TRANSMISSION_LINE:
        queries.push(`  way["power"="line"]["voltage"~"^[1-9][0-9]{4,}$"](${bbox});`);
        queries.push(`  relation["power"="line"]["voltage"~"^[1-9][0-9]{4,}$"](${bbox});`);
        break;

      case InfrastructureType.DISTRIBUTION_LINE:
        queries.push(`  way["power"="line"]["voltage"~"^[1-9][0-9]{2,4}$"](${bbox});`);
        queries.push(`  way["power"="minor_line"](${bbox});`);
        break;

      case InfrastructureType.POWER_TOWER:
        queries.push(`  node["power"="tower"](${bbox});`);
        break;

      case InfrastructureType.POWER_POLE:
        queries.push(`  node["power"="pole"](${bbox});`);
        break;

      case InfrastructureType.TRANSFORMER:
        queries.push(`  node["power"="transformer"](${bbox});`);
        queries.push(`  way["power"="transformer"](${bbox});`);
        break;

      case InfrastructureType.SOLAR_FARM:
        queries.push(`  node["power"="plant"]["plant:output:electricity"="photovoltaic"](${bbox});`);
        queries.push(`  way["power"="plant"]["plant:output:electricity"="photovoltaic"](${bbox});`);
        queries.push(`  relation["power"="plant"]["plant:output:electricity"="photovoltaic"](${bbox});`);
        queries.push(`  way["power"="generator"]["generator:source"="solar"](${bbox});`);
        break;

      case InfrastructureType.WIND_FARM:
        queries.push(`  node["power"="plant"]["plant:output:electricity"="wind"](${bbox});`);
        queries.push(`  way["power"="plant"]["plant:output:electricity"="wind"](${bbox});`);
        queries.push(`  relation["power"="plant"]["plant:output:electricity"="wind"](${bbox});`);
        queries.push(`  node["power"="generator"]["generator:source"="wind"](${bbox});`);
        break;

      case InfrastructureType.HYDROELECTRIC:
        queries.push(`  node["power"="plant"]["plant:output:electricity"="hydro"](${bbox});`);
        queries.push(`  way["power"="plant"]["plant:output:electricity"="hydro"](${bbox});`);
        queries.push(`  relation["power"="plant"]["plant:output:electricity"="hydro"](${bbox});`);
        break;

      case InfrastructureType.NUCLEAR_PLANT:
        queries.push(`  node["power"="plant"]["plant:output:electricity"="nuclear"](${bbox});`);
        queries.push(`  way["power"="plant"]["plant:output:electricity"="nuclear"](${bbox});`);
        queries.push(`  relation["power"="plant"]["plant:output:electricity"="nuclear"](${bbox});`);
        break;

      default:
        // Generic power infrastructure
        queries.push(`  node["power"](${bbox});`);
        queries.push(`  way["power"](${bbox});`);
        queries.push(`  relation["power"](${bbox});`);
    }

    return queries;
  }

  /**
   * Build query for specific bounding box with optimizations
   */
  static buildOptimizedQuery(bbox: [number, number, number, number], types: InfrastructureType[]): string {
    const area = this.calculateBboxArea(bbox);
    const timeout = area > 10000 ? 300 : 180; // Longer timeout for large areas
    
    return this.buildInfrastructureQuery({
      types,
      boundingBox: bbox,
      maxResults: area > 10000 ? 50000 : 10000
    });
  }

  /**
   * Calculate bounding box area in km²
   */
  private static calculateBboxArea(bbox: [number, number, number, number]): number {
    const [south, west, north, east] = bbox;
    const latDiff = north - south;
    const lonDiff = east - west;
    
    // Approximate area calculation
    const avgLat = (north + south) / 2;
    const latKm = latDiff * 111; // 1° latitude ≈ 111 km
    const lonKm = lonDiff * 111 * Math.cos(avgLat * Math.PI / 180);
    
    return latKm * lonKm;
  }
}

// =============================================================================
// INFRASTRUCTURE DATA PROCESSOR
// =============================================================================

export class InfrastructureDataProcessor {
  /**
   * Process Overpass response into infrastructure assets
   */
  static processOverpassResponse(response: OverpassResponse): InfrastructureAsset[] {
    const assets: InfrastructureAsset[] = [];

    for (const element of response.elements) {
      try {
        const asset = this.processElement(element);
        if (asset) {
          assets.push(asset);
        }
      } catch (error) {
        console.warn(`Failed to process element ${element.id}:`, error);
      }
    }

    return assets;
  }

  /**
   * Process individual OSM element into infrastructure asset
   */
  private static processElement(element: OverpassElement): InfrastructureAsset | null {
    if (!element.tags) return null;

    const type = this.classifyInfrastructureType(element.tags);
    if (!type) return null;

    const location = this.extractLocation(element);
    if (!location) return null;

    const properties = this.extractProperties(element.tags, type);
    const geometry = this.extractGeometry(element);
    const metadata = this.extractMetadata(element);
    const dataQuality = this.assessDataQuality(element, properties);

    return {
      id: `osm_${element.type}_${element.id}`,
      osmId: element.id,
      type,
      name: element.tags.name,
      location,
      properties,
      geometry,
      metadata,
      dataQuality,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Classify infrastructure type from OSM tags
   */
  private static classifyInfrastructureType(tags: Record<string, string>): InfrastructureType | null {
    const powerTag = tags.power;
    const plantOutput = tags['plant:output:electricity'];
    const generatorSource = tags['generator:source'];

    if (powerTag === 'plant') {
      if (plantOutput === 'photovoltaic' || generatorSource === 'solar') {
        return InfrastructureType.SOLAR_FARM;
      }
      if (plantOutput === 'wind' || generatorSource === 'wind') {
        return InfrastructureType.WIND_FARM;
      }
      if (plantOutput === 'hydro' || generatorSource === 'hydro') {
        return InfrastructureType.HYDROELECTRIC;
      }
      if (plantOutput === 'nuclear' || generatorSource === 'nuclear') {
        return InfrastructureType.NUCLEAR_PLANT;
      }
      if (plantOutput === 'coal' || plantOutput === 'gas' || plantOutput === 'oil') {
        return InfrastructureType.THERMAL_PLANT;
      }
      if (plantOutput === 'geothermal' || generatorSource === 'geothermal') {
        return InfrastructureType.GEOTHERMAL_PLANT;
      }
      return InfrastructureType.POWER_PLANT;
    }

    if (powerTag === 'substation') {
      return InfrastructureType.SUBSTATION;
    }

    if (powerTag === 'line') {
      const voltage = this.parseVoltage(tags.voltage);
      return voltage && voltage >= 100 ? 
        InfrastructureType.TRANSMISSION_LINE : 
        InfrastructureType.DISTRIBUTION_LINE;
    }

    if (powerTag === 'minor_line') {
      return InfrastructureType.DISTRIBUTION_LINE;
    }

    if (powerTag === 'tower') {
      return InfrastructureType.POWER_TOWER;
    }

    if (powerTag === 'pole') {
      return InfrastructureType.POWER_POLE;
    }

    if (powerTag === 'transformer') {
      return InfrastructureType.TRANSFORMER;
    }

    return null;
  }

  /**
   * Extract location from OSM element
   */
  private static extractLocation(element: OverpassElement): InfrastructureLocation | null {
    let lat: number, lon: number;

    if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
      lat = element.lat;
      lon = element.lon;
    } else if (element.geometry && element.geometry.length > 0) {
      // Use centroid for ways and relations
      const latSum = element.geometry.reduce((sum, point) => sum + point.lat, 0);
      const lonSum = element.geometry.reduce((sum, point) => sum + point.lon, 0);
      lat = latSum / element.geometry.length;
      lon = lonSum / element.geometry.length;
    } else {
      return null;
    }

    return {
      latitude: lat,
      longitude: lon,
      address: element.tags?.['addr:full'],
      country: element.tags?.['addr:country'],
      region: element.tags?.['addr:state'] || element.tags?.['addr:region'],
      city: element.tags?.['addr:city'],
      postalCode: element.tags?.['addr:postcode']
    };
  }

  /**
   * Extract infrastructure properties from OSM tags
   */
  private static extractProperties(tags: Record<string, string>, type: InfrastructureType): InfrastructureProperties {
    const powerSource = this.extractPowerSource(tags);
    const capacity = this.parseCapacity(tags.capacity || tags['generator:output:electricity']);
    const voltage = this.parseVoltage(tags.voltage);
    const voltageLevel = this.classifyVoltageLevel(voltage);

    return {
      powerSource,
      capacity,
      voltage,
      voltageLevel,
      operator: tags.operator,
      owner: tags.owner,
      commissioned: tags['start_date'] || tags['construction:start_date'],
      status: this.parseStatus(tags),
      technology: tags.technology || tags['generator:type'],
      fuel: tags.fuel || tags['generator:source'],
      connections: [], // Will be populated during network analysis
      tags
    };
  }

  /**
   * Extract power source from OSM tags
   */
  private static extractPowerSource(tags: Record<string, string>): PowerSource {
    const plantOutput = tags['plant:output:electricity'];
    const generatorSource = tags['generator:source'];
    const fuel = tags.fuel;

    if (plantOutput === 'photovoltaic' || generatorSource === 'solar') return PowerSource.SOLAR;
    if (plantOutput === 'wind' || generatorSource === 'wind') return PowerSource.WIND;
    if (plantOutput === 'hydro' || generatorSource === 'hydro') return PowerSource.HYDRO;
    if (plantOutput === 'nuclear' || generatorSource === 'nuclear') return PowerSource.NUCLEAR;
    if (plantOutput === 'coal' || generatorSource === 'coal' || fuel === 'coal') return PowerSource.COAL;
    if (plantOutput === 'gas' || generatorSource === 'gas' || fuel === 'gas') return PowerSource.GAS;
    if (plantOutput === 'oil' || generatorSource === 'oil' || fuel === 'oil') return PowerSource.OIL;
    if (plantOutput === 'biomass' || generatorSource === 'biomass' || fuel === 'biomass') return PowerSource.BIOMASS;
    if (plantOutput === 'geothermal' || generatorSource === 'geothermal') return PowerSource.GEOTHERMAL;
    if (generatorSource === 'waste' || fuel === 'waste') return PowerSource.WASTE;
    if (generatorSource === 'tidal') return PowerSource.TIDAL;
    if (generatorSource === 'wave') return PowerSource.WAVE;

    return PowerSource.UNKNOWN;
  }

  /**
   * Parse capacity from string (MW)
   */
  private static parseCapacity(capacityStr?: string): number | undefined {
    if (!capacityStr) return undefined;

    // Extract number and unit
    const match = capacityStr.match(/(\d+(?:\.\d+)?)\s*(MW|kW|GW)?/i);
    if (!match) return undefined;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'MW').toUpperCase();

    switch (unit) {
      case 'GW': return value * 1000;
      case 'MW': return value;
      case 'KW': return value / 1000;
      default: return value;
    }
  }

  /**
   * Parse voltage from string (kV)
   */
  private static parseVoltage(voltageStr?: string): number | undefined {
    if (!voltageStr) return undefined;

    // Handle voltage ranges (e.g., "110;220")
    const voltages = voltageStr.split(/[;,]/).map(v => v.trim());
    const highestVoltage = voltages.reduce((max, v) => {
      const match = v.match(/(\d+(?:\.\d+)?)\s*(kV|V)?/i);
      if (!match) return max;

      const value = parseFloat(match[1]);
      const unit = (match[2] || 'kV').toUpperCase();
      const kV = unit === 'V' ? value / 1000 : value;

      return Math.max(max, kV);
    }, 0);

    return highestVoltage > 0 ? highestVoltage : undefined;
  }

  /**
   * Classify voltage level
   */
  private static classifyVoltageLevel(voltage?: number): VoltageLevel {
    if (!voltage) return VoltageLevel.UNKNOWN;

    if (voltage < 1) return VoltageLevel.LOW_VOLTAGE;
    if (voltage < 35) return VoltageLevel.MEDIUM_VOLTAGE;
    if (voltage < 100) return VoltageLevel.HIGH_VOLTAGE;
    if (voltage < 800) return VoltageLevel.EXTRA_HIGH_VOLTAGE;
    return VoltageLevel.ULTRA_HIGH_VOLTAGE;
  }

  /**
   * Parse status from OSM tags
   */
  private static parseStatus(tags: Record<string, string>): 'operational' | 'under_construction' | 'planned' | 'decommissioned' {
    const construction = tags.construction;
    const disused = tags.disused;
    const abandoned = tags.abandoned;
    const proposed = tags.proposed;

    if (disused === 'yes' || abandoned === 'yes') return 'decommissioned';
    if (construction === 'yes' || proposed === 'yes') return 'under_construction';
    if (tags.lifecycle === 'proposed') return 'planned';

    return 'operational';
  }

  /**
   * Extract geometry from OSM element
   */
  private static extractGeometry(element: OverpassElement): InfrastructureGeometry {
    if (element.type === 'node') {
      return {
        type: 'Point',
        coordinates: [element.lon!, element.lat!]
      };
    }

    if (element.type === 'way' && element.geometry) {
      const coordinates = element.geometry.map(p => [p.lon, p.lat]);
      
      // Check if it's a closed way (polygon)
      const isPolygon = coordinates.length >= 4 && 
        coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
        coordinates[0][1] === coordinates[coordinates.length - 1][1];

      if (isPolygon) {
        return {
          type: 'Polygon',
          coordinates: [coordinates],
          area: this.calculatePolygonArea(coordinates)
        };
      } else {
        return {
          type: 'LineString',
          coordinates,
          length: this.calculateLineLength(coordinates)
        };
      }
    }

    if (element.type === 'relation' && element.geometry) {
      // Simplified: treat relations as multipolygons
      const coordinates = element.geometry.map(p => [p.lon, p.lat]);
      return {
        type: 'MultiPolygon',
        coordinates: [[coordinates]]
      };
    }

    // Fallback to point
    return {
      type: 'Point',
      coordinates: [0, 0]
    };
  }

  /**
   * Calculate polygon area in km²
   */
  private static calculatePolygonArea(coordinates: number[][]): number {
    // Simplified area calculation using shoelace formula
    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n - 1; i++) {
      area += coordinates[i][0] * coordinates[i + 1][1];
      area -= coordinates[i + 1][0] * coordinates[i][1];
    }

    area = Math.abs(area) / 2;
    
    // Convert to km² (very rough approximation)
    return area * 12100; // 1° ≈ 110km at equator
  }

  /**
   * Calculate line length in km
   */
  private static calculateLineLength(coordinates: number[][]): number {
    let length = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[i + 1];
      
      // Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      length += R * c;
    }

    return length;
  }

  /**
   * Extract metadata from OSM element
   */
  private static extractMetadata(element: OverpassElement): InfrastructureMetadata {
    return {
      osmVersion: element.version,
      osmTimestamp: element.timestamp,
      osmChangeset: element.changeset,
      osmUser: element.user,
      extractedAt: new Date().toISOString(),
      processingVersion: '1.0.0',
      confidence: this.calculateConfidence(element),
      validationFlags: this.validateElement(element)
    };
  }

  /**
   * Calculate confidence score for data quality
   */
  private static calculateConfidence(element: OverpassElement): number {
    let confidence = 0.5; // Base confidence

    if (element.tags?.name) confidence += 0.1;
    if (element.tags?.operator) confidence += 0.1;
    if (element.tags?.voltage) confidence += 0.1;
    if (element.tags?.capacity) confidence += 0.1;
    if (element.tags?.['plant:output:electricity']) confidence += 0.1;
    if (element.version > 1) confidence += 0.05; // Edited data is often more accurate
    if (element.timestamp) {
      const age = Date.now() - new Date(element.timestamp).getTime();
      const ageYears = age / (1000 * 60 * 60 * 24 * 365);
      confidence += Math.max(0, 0.1 * (5 - ageYears) / 5); // Newer data gets higher confidence
    }

    return Math.min(1, confidence);
  }

  /**
   * Validate element and return validation flags
   */
  private static validateElement(element: OverpassElement): ValidationFlag[] {
    const flags: ValidationFlag[] = [];

    if (!element.tags?.name) {
      flags.push({
        type: 'missing_data',
        severity: 'low',
        field: 'name',
        message: 'Asset name is missing'
      });
    }

    if (element.tags?.power === 'plant' && !element.tags?.capacity && !element.tags?.['generator:output:electricity']) {
      flags.push({
        type: 'missing_data',
        severity: 'medium',
        field: 'capacity',
        message: 'Power plant capacity is missing'
      });
    }

    if (element.tags?.power === 'line' && !element.tags?.voltage) {
      flags.push({
        type: 'missing_data',
        severity: 'medium',
        field: 'voltage',
        message: 'Power line voltage is missing'
      });
    }

    // Check for outdated data
    if (element.timestamp) {
      const age = Date.now() - new Date(element.timestamp).getTime();
      const ageYears = age / (1000 * 60 * 60 * 24 * 365);
      
      if (ageYears > 5) {
        flags.push({
          type: 'outdated',
          severity: 'low',
          field: 'timestamp',
          message: `Data is ${ageYears.toFixed(1)} years old`
        });
      }
    }

    return flags;
  }

  /**
   * Assess overall data quality
   */
  private static assessDataQuality(element: OverpassElement, properties: InfrastructureProperties): InfrastructureDataQuality {
    const flags = this.validateElement(element);
    const confidence = this.calculateConfidence(element);

    // Calculate component scores
    const completeness = this.calculateCompleteness(element.tags || {});
    const accuracy = confidence;
    const consistency = 0.9; // OSM data is generally consistent
    const timeliness = this.calculateTimeliness(element.timestamp);

    const overall = (completeness * 0.3 + accuracy * 0.3 + consistency * 0.2 + timeliness * 0.2);

    return {
      completeness,
      accuracy,
      consistency,
      timeliness,
      overall,
      flags
    };
  }

  /**
   * Calculate data completeness score
   */
  private static calculateCompleteness(tags: Record<string, string>): number {
    const importantFields = ['name', 'operator', 'voltage', 'capacity', 'plant:output:electricity'];
    const presentFields = importantFields.filter(field => tags[field]).length;
    return presentFields / importantFields.length;
  }

  /**
   * Calculate data timeliness score
   */
  private static calculateTimeliness(timestamp?: string): number {
    if (!timestamp) return 0.5;

    const age = Date.now() - new Date(timestamp).getTime();
    const ageYears = age / (1000 * 60 * 60 * 24 * 365);

    if (ageYears < 1) return 1.0;
    if (ageYears < 3) return 0.8;
    if (ageYears < 5) return 0.6;
    return 0.4;
  }
}

// =============================================================================
// MAIN OPENSTREETMAP INFRASTRUCTURE CLIENT
// =============================================================================

export class OpenStreetMapInfrastructureClient {
  private config: InfrastructureMapperConfig;
  private cache: Map<string, InfrastructureCache> = new Map();
  private geospatialIndex?: GeospatialIndex;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: Partial<InfrastructureMapperConfig> = {}) {
    this.config = {
      baseUrl: 'https://overpass-api.de/api/interpreter',
      timeout: 180000, // 3 minutes
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimitPerMinute: 30,
      maxQuerySize: 100 * 1024 * 1024, // 100MB
      cacheTtlHours: 24,
      maxCacheSize: 500, // MB
      enableCompression: true,
      userAgent: 'ESMAP-Infrastructure-Mapper/1.0',
      maxAssetsPerQuery: 10000,
      minDataQualityScore: 0.3,
      enableGeospatialIndexing: true,
      indexUpdateInterval: 24,
      enableNetworkAnalysis: true,
      densityGridSize: 10, // km
      ...config
    };
  }

  /**
   * Search for infrastructure assets in a bounding box
   */
  async searchInfrastructure(query: InfrastructureQuery): Promise<InfrastructureApiResponse<InfrastructureSearchResult>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Validate query
      this.validateQuery(query);

      // Check cache
      const cacheKey = this.generateCacheKey(query);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() < cached.expiresAt) {
        return {
          data: cached.data,
          error: null,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            cached: true,
            processingTime: Date.now() - startTime,
            dataSource: 'cache',
            version: '1.0.0'
          }
        };
      }

      // Build and execute Overpass query
      const overpassQuery = OverpassQueryBuilder.buildInfrastructureQuery(query);
      const response = await this.executeOverpassQuery(overpassQuery);

      // Process response
      const assets = InfrastructureDataProcessor.processOverpassResponse(response);
      
      // Filter by quality threshold
      const qualityFilteredAssets = assets.filter(asset => 
        asset.dataQuality.overall >= this.config.minDataQualityScore
      );

      // Apply additional filters
      const filteredAssets = this.applyFilters(qualityFilteredAssets, query);

      // Limit results
      const limitedAssets = query.maxResults ? 
        filteredAssets.slice(0, query.maxResults) : filteredAssets;

      // Calculate statistics
      const statistics = this.calculateStatistics(limitedAssets);
      const boundingBox = this.calculateBoundingBox(limitedAssets);

      const result: InfrastructureSearchResult = {
        assets: limitedAssets,
        totalCount: filteredAssets.length,
        boundingBox,
        statistics,
        queryExecutionTime: Date.now() - startTime,
        cacheHit: false
      };

      // Cache result
      this.cacheResult(cacheKey, result, query);

      return {
        data: result,
        error: null,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime: Date.now() - startTime,
          dataSource: 'overpass_api',
          version: '1.0.0'
        }
      };

    } catch (error) {
      return {
        data: null,
        error: this.createError(error, query),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime: Date.now() - startTime,
          dataSource: 'error',
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * Get infrastructure density analysis
   */
  async getInfrastructureDensity(
    boundingBox: [number, number, number, number],
    types: InfrastructureType[] = Object.values(InfrastructureType)
  ): Promise<InfrastructureApiResponse<InfrastructureDensity>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Search for assets in the bounding box
      const searchResult = await this.searchInfrastructure({
        types,
        boundingBox,
        includeGeometry: true
      });

      if (!searchResult.data) {
        throw new Error('Failed to retrieve infrastructure data');
      }

      // Generate density analysis
      const density = this.calculateDensityAnalysis(searchResult.data.assets, boundingBox);

      return {
        data: density,
        error: null,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime: Date.now() - startTime,
          dataSource: 'computed',
          version: '1.0.0'
        }
      };

    } catch (error) {
      return {
        data: null,
        error: this.createError(error),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: false,
          processingTime: Date.now() - startTime,
          dataSource: 'error',
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * Create visualization data for infrastructure assets
   */
  async createVisualization(
    assets: InfrastructureAsset[],
    type: 'map' | 'heatmap' | 'network' = 'map'
  ): Promise<InfrastructureVisualization> {
    const layers: VisualizationLayer[] = [];

    if (type === 'map' || type === 'network') {
      // Create point layer for nodes
      const pointFeatures = assets
        .filter(asset => asset.geometry.type === 'Point')
        .map(asset => this.assetToGeoJSON(asset));

      if (pointFeatures.length > 0) {
        layers.push({
          id: 'infrastructure_points',
          name: 'Infrastructure Points',
          type: 'point',
          data: pointFeatures,
          style: {
            color: '#2563eb',
            weight: 2,
            opacity: 0.8,
            radius: 6,
            popup: {
              title: '{name}',
              fields: [
                { label: 'Type', property: 'type' },
                { label: 'Operator', property: 'operator' },
                { label: 'Capacity', property: 'capacity', format: 'number', unit: 'MW' },
                { label: 'Voltage', property: 'voltage', format: 'number', unit: 'kV' }
              ]
            }
          },
          visible: true,
          interactive: true
        });
      }

      // Create line layer for transmission lines
      const lineFeatures = assets
        .filter(asset => asset.geometry.type === 'LineString')
        .map(asset => this.assetToGeoJSON(asset));

      if (lineFeatures.length > 0) {
        layers.push({
          id: 'transmission_lines',
          name: 'Transmission Lines',
          type: 'line',
          data: lineFeatures,
          style: {
            color: '#dc2626',
            weight: 3,
            opacity: 0.7,
            popup: {
              title: '{name}',
              fields: [
                { label: 'Voltage', property: 'voltage', format: 'number', unit: 'kV' },
                { label: 'Length', property: 'length', format: 'number', unit: 'km' },
                { label: 'Operator', property: 'operator' }
              ]
            }
          },
          visible: true,
          interactive: true
        });
      }
    }

    if (type === 'heatmap') {
      // Create heatmap layer
      const heatmapData = assets
        .filter(asset => asset.geometry.type === 'Point')
        .map(asset => ({
          latitude: asset.location.latitude,
          longitude: asset.location.longitude,
          intensity: this.calculateAssetIntensity(asset),
          assetCount: 1,
          totalCapacity: asset.properties.capacity || 0
        }));

      layers.push({
        id: 'infrastructure_heatmap',
        name: 'Infrastructure Density',
        type: 'heatmap',
        data: [], // Heatmap data handled separately
        style: {
          color: '#ff0000',
          weight: 1,
          opacity: 0.6
        },
        visible: true,
        interactive: false
      });
    }

    // Calculate bounds
    const bounds = this.calculateVisualizationBounds(assets);

    return {
      id: `infrastructure_viz_${Date.now()}`,
      title: 'Infrastructure Visualization',
      description: `Visualization of ${assets.length} infrastructure assets`,
      type,
      data: layers,
      style: {
        baseMap: 'osm',
        center: bounds ? [
          (bounds[0] + bounds[2]) / 2, // avg lat
          (bounds[1] + bounds[3]) / 2  // avg lon
        ] : [0, 0],
        zoom: 10,
        bounds: bounds ? [[bounds[0], bounds[1]], [bounds[2], bounds[3]]] : undefined
      },
      interactivity: {
        hover: true,
        click: true,
        select: true,
        filter: true,
        search: true,
        clustering: true,
        clusterRadius: 50
      },
      legend: {
        title: 'Infrastructure Types',
        position: 'topright',
        items: this.createLegendItems(assets)
      }
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private validateQuery(query: InfrastructureQuery): void {
    const [south, west, north, east] = query.boundingBox;
    
    if (south >= north || west >= east) {
      throw new Error('Invalid bounding box coordinates');
    }

    if (south < -90 || south > 90 || north < -90 || north > 90) {
      throw new Error('Invalid latitude values');
    }

    if (west < -180 || west > 180 || east < -180 || east > 180) {
      throw new Error('Invalid longitude values');
    }

    // Check area size (prevent overly large queries)
    const area = OverpassQueryBuilder['calculateBboxArea'](query.boundingBox);
    if (area > 100000) { // 100,000 km²
      throw new Error('Query area too large (max 100,000 km²)');
    }
  }

  private async executeOverpassQuery(query: string): Promise<OverpassResponse> {
    return this.queueRequest(async () => {
      let lastError: Error;

      for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

          const response = await fetch(this.config.baseUrl, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': this.config.userAgent
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          return data as OverpassResponse;

        } catch (error) {
          lastError = error as Error;
          
          if (attempt < this.config.retryAttempts - 1) {
            await this.delay(this.config.retryDelay * Math.pow(2, attempt));
          }
        }
      }

      throw lastError!;
    });
  }

  private queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      
      // Rate limiting
      await this.delay(60000 / this.config.rateLimitPerMinute);
    }
    
    this.isProcessingQueue = false;
  }

  private applyFilters(assets: InfrastructureAsset[], query: InfrastructureQuery): InfrastructureAsset[] {
    return assets.filter(asset => {
      // Power source filter
      if (query.powerSources?.length && asset.properties.powerSource) {
        if (!query.powerSources.includes(asset.properties.powerSource)) {
          return false;
        }
      }

      // Voltage range filter
      if (query.voltageRange && asset.properties.voltage) {
        const [minVoltage, maxVoltage] = query.voltageRange;
        if (asset.properties.voltage < minVoltage || asset.properties.voltage > maxVoltage) {
          return false;
        }
      }

      // Capacity range filter
      if (query.capacityRange && asset.properties.capacity) {
        const [minCapacity, maxCapacity] = query.capacityRange;
        if (asset.properties.capacity < minCapacity || asset.properties.capacity > maxCapacity) {
          return false;
        }
      }

      // Status filter
      if (query.status?.length && asset.properties.status) {
        if (!query.status.includes(asset.properties.status)) {
          return false;
        }
      }

      // Quality threshold
      if (query.qualityThreshold && asset.dataQuality.overall < query.qualityThreshold) {
        return false;
      }

      return true;
    });
  }

  private calculateStatistics(assets: InfrastructureAsset[]): InfrastructureStatistics {
    const assetsByType: Record<InfrastructureType, number> = {} as any;
    const assetsByPowerSource: Record<PowerSource, number> = {} as any;
    const assetsByVoltageLevel: Record<VoltageLevel, number> = {} as any;
    const assetsByStatus: Record<string, number> = {};
    const countries: Record<string, number> = {};
    const regions: Record<string, number> = {};

    let totalCapacity = 0;
    let capacityCount = 0;
    let totalQuality = 0;

    assets.forEach(asset => {
      // Count by type
      assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;

      // Count by power source
      if (asset.properties.powerSource) {
        assetsByPowerSource[asset.properties.powerSource] = 
          (assetsByPowerSource[asset.properties.powerSource] || 0) + 1;
      }

      // Count by voltage level
      if (asset.properties.voltageLevel) {
        assetsByVoltageLevel[asset.properties.voltageLevel] = 
          (assetsByVoltageLevel[asset.properties.voltageLevel] || 0) + 1;
      }

      // Count by status
      if (asset.properties.status) {
        assetsByStatus[asset.properties.status] = 
          (assetsByStatus[asset.properties.status] || 0) + 1;
      }

      // Geographic distribution
      if (asset.location.country) {
        countries[asset.location.country] = (countries[asset.location.country] || 0) + 1;
      }
      if (asset.location.region) {
        regions[asset.location.region] = (regions[asset.location.region] || 0) + 1;
      }

      // Capacity calculation
      if (asset.properties.capacity) {
        totalCapacity += asset.properties.capacity;
        capacityCount++;
      }

      // Quality calculation
      totalQuality += asset.dataQuality.overall;
    });

    return {
      totalAssets: assets.length,
      assetsByType,
      assetsByPowerSource,
      assetsByVoltageLevel,
      assetsByStatus,
      averageCapacity: capacityCount > 0 ? totalCapacity / capacityCount : 0,
      totalCapacity,
      averageDataQuality: assets.length > 0 ? totalQuality / assets.length : 0,
      geographicDistribution: {
        countries,
        regions
      }
    };
  }

  private calculateBoundingBox(assets: InfrastructureAsset[]): InfrastructureBoundingBox {
    if (assets.length === 0) {
      return {
        south: 0, west: 0, north: 0, east: 0,
        center: { latitude: 0, longitude: 0 },
        area: 0
      };
    }

    let south = 90, west = 180, north = -90, east = -180;

    assets.forEach(asset => {
      const { latitude, longitude } = asset.location;
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
    });

    const center = {
      latitude: (south + north) / 2,
      longitude: (west + east) / 2
    };

    // Calculate approximate area
    const latDiff = north - south;
    const lonDiff = east - west;
    const avgLat = center.latitude;
    const area = latDiff * lonDiff * 111 * 111 * Math.cos(avgLat * Math.PI / 180);

    return { south, west, north, east, center, area };
  }

  private calculateDensityAnalysis(
    assets: InfrastructureAsset[], 
    boundingBox: [number, number, number, number]
  ): InfrastructureDensity {
    const [south, west, north, east] = boundingBox;
    const gridSize = this.config.densityGridSize;
    
    // Calculate grid dimensions
    const latRange = north - south;
    const lonRange = east - west;
    const gridRows = Math.ceil(latRange / (gridSize / 111)); // ~111 km per degree
    const gridCols = Math.ceil(lonRange / (gridSize / 111));

    // Initialize density grid
    const densityMap: DensityCell[][] = Array(gridRows).fill(null).map(() =>
      Array(gridCols).fill(null).map(() => ({
        bounds: { south: 0, west: 0, north: 0, east: 0, center: { latitude: 0, longitude: 0 }, area: 0 },
        assetCount: 0,
        totalCapacity: 0,
        dominantType: InfrastructureType.POWER_PLANT,
        diversityIndex: 0,
        assets: []
      }))
    );

    // Populate grid cells
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cellSouth = south + (row * latRange) / gridRows;
        const cellNorth = south + ((row + 1) * latRange) / gridRows;
        const cellWest = west + (col * lonRange) / gridCols;
        const cellEast = west + ((col + 1) * lonRange) / gridCols;

        densityMap[row][col].bounds = {
          south: cellSouth,
          west: cellWest,
          north: cellNorth,
          east: cellEast,
          center: {
            latitude: (cellSouth + cellNorth) / 2,
            longitude: (cellWest + cellEast) / 2
          },
          area: gridSize * gridSize
        };
      }
    }

    // Place assets in grid cells
    const typeCounts: Record<string, Record<InfrastructureType, number>> = {};

    assets.forEach(asset => {
      const { latitude, longitude } = asset.location;
      
      const row = Math.floor(((latitude - south) / latRange) * gridRows);
      const col = Math.floor(((longitude - west) / lonRange) * gridCols);
      
      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        const cell = densityMap[row][col];
        cell.assetCount++;
        cell.totalCapacity += asset.properties.capacity || 0;
        cell.assets.push(asset.id);

        // Track type counts for this cell
        const cellKey = `${row},${col}`;
        if (!typeCounts[cellKey]) {
          typeCounts[cellKey] = {} as Record<InfrastructureType, number>;
        }
        typeCounts[cellKey][asset.type] = (typeCounts[cellKey][asset.type] || 0) + 1;
      }
    });

    // Calculate dominant types and diversity
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cellKey = `${row},${col}`;
        const cell = densityMap[row][col];
        const cellTypeCounts = typeCounts[cellKey] || {};

        // Find dominant type
        let maxCount = 0;
        let dominantType = InfrastructureType.POWER_PLANT;
        
        Object.entries(cellTypeCounts).forEach(([type, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantType = type as InfrastructureType;
          }
        });

        cell.dominantType = dominantType;

        // Calculate Shannon diversity index
        const totalCount = Object.values(cellTypeCounts).reduce((sum, count) => sum + count, 0);
        if (totalCount > 0) {
          let diversity = 0;
          Object.values(cellTypeCounts).forEach(count => {
            const proportion = count / totalCount;
            if (proportion > 0) {
              diversity -= proportion * Math.log2(proportion);
            }
          });
          cell.diversityIndex = diversity;
        }
      }
    }

    // Generate heatmap data
    const heatmapData: HeatmapPoint[] = [];
    let maxDensity = 0;
    let totalDensity = 0;
    let nonZeroCells = 0;

    densityMap.forEach(row => {
      row.forEach(cell => {
        if (cell.assetCount > 0) {
          const density = cell.assetCount / cell.bounds.area;
          maxDensity = Math.max(maxDensity, density);
          totalDensity += density;
          nonZeroCells++;

          heatmapData.push({
            latitude: cell.bounds.center.latitude,
            longitude: cell.bounds.center.longitude,
            intensity: density,
            assetCount: cell.assetCount,
            totalCapacity: cell.totalCapacity
          });
        }
      });
    });

    const averageDensity = nonZeroCells > 0 ? totalDensity / nonZeroCells : 0;

    return {
      gridSize,
      densityMap,
      statistics: {
        maxDensity,
        averageDensity,
        hotspots: [], // Would be calculated based on clustering
        sparsityIndex: 1 - (nonZeroCells / (gridRows * gridCols))
      },
      heatmapData
    };
  }

  private assetToGeoJSON(asset: InfrastructureAsset): GeoJSONFeature {
    return {
      type: 'Feature',
      geometry: {
        type: asset.geometry.type,
        coordinates: asset.geometry.coordinates
      },
      properties: {
        id: asset.id,
        type: asset.type,
        name: asset.name,
        capacity: asset.properties.capacity,
        voltage: asset.properties.voltage,
        operator: asset.properties.operator,
        status: asset.properties.status,
        powerSource: asset.properties.powerSource,
        dataQuality: asset.dataQuality.overall
      }
    };
  }

  private calculateAssetIntensity(asset: InfrastructureAsset): number {
    // Calculate intensity based on capacity, voltage, and type
    let intensity = 0.5; // Base intensity

    if (asset.properties.capacity) {
      intensity += Math.min(0.3, asset.properties.capacity / 1000); // Scale by 1GW
    }

    if (asset.properties.voltage) {
      intensity += Math.min(0.2, asset.properties.voltage / 500); // Scale by 500kV
    }

    // Type-based intensity
    const typeWeights: Record<InfrastructureType, number> = {
      [InfrastructureType.NUCLEAR_PLANT]: 1.0,
      [InfrastructureType.THERMAL_PLANT]: 0.8,
      [InfrastructureType.HYDROELECTRIC]: 0.7,
      [InfrastructureType.WIND_FARM]: 0.6,
      [InfrastructureType.SOLAR_FARM]: 0.6,
      [InfrastructureType.POWER_PLANT]: 0.7,
      [InfrastructureType.SUBSTATION]: 0.5,
      [InfrastructureType.TRANSMISSION_LINE]: 0.3,
      [InfrastructureType.DISTRIBUTION_LINE]: 0.2,
      [InfrastructureType.POWER_TOWER]: 0.1,
      [InfrastructureType.POWER_POLE]: 0.1,
      [InfrastructureType.TRANSFORMER]: 0.2,
      [InfrastructureType.GEOTHERMAL_PLANT]: 0.6
    };

    intensity *= typeWeights[asset.type] || 0.5;

    return Math.min(1, intensity);
  }

  private calculateVisualizationBounds(assets: InfrastructureAsset[]): [number, number, number, number] | null {
    if (assets.length === 0) return null;

    let south = 90, west = 180, north = -90, east = -180;

    assets.forEach(asset => {
      const { latitude, longitude } = asset.location;
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
    });

    return [south, west, north, east];
  }

  private createLegendItems(assets: InfrastructureAsset[]) {
    const typeCounts: Record<InfrastructureType, number> = {} as any;
    
    assets.forEach(asset => {
      typeCounts[asset.type] = (typeCounts[asset.type] || 0) + 1;
    });

    const typeColors: Record<InfrastructureType, string> = {
      [InfrastructureType.POWER_PLANT]: '#dc2626',
      [InfrastructureType.NUCLEAR_PLANT]: '#7c3aed',
      [InfrastructureType.THERMAL_PLANT]: '#ea580c',
      [InfrastructureType.HYDROELECTRIC]: '#0891b2',
      [InfrastructureType.WIND_FARM]: '#16a34a',
      [InfrastructureType.SOLAR_FARM]: '#eab308',
      [InfrastructureType.GEOTHERMAL_PLANT]: '#dc2626',
      [InfrastructureType.SUBSTATION]: '#4f46e5',
      [InfrastructureType.TRANSMISSION_LINE]: '#dc2626',
      [InfrastructureType.DISTRIBUTION_LINE]: '#f59e0b',
      [InfrastructureType.POWER_TOWER]: '#6b7280',
      [InfrastructureType.POWER_POLE]: '#9ca3af',
      [InfrastructureType.TRANSFORMER]: '#8b5cf6'
    };

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: typeColors[type as InfrastructureType] || '#6b7280',
        value: count.toString(),
        description: `${count} assets`
      }));
  }

  private generateCacheKey(query: InfrastructureQuery): string {
    const bbox = query.boundingBox.join(',');
    const types = query.types.sort().join(',');
    const filters = [
      query.powerSources?.sort().join(','),
      query.voltageRange?.join('-'),
      query.capacityRange?.join('-'),
      query.status?.sort().join(','),
      query.maxResults?.toString()
    ].filter(Boolean).join('|');
    
    return `${bbox}_${types}_${filters}`;
  }

  private cacheResult(key: string, result: InfrastructureSearchResult, query: InfrastructureQuery): void {
    const size = JSON.stringify(result).length;
    
    // Evict old entries if cache is too large
    while (this.cache.size * 1000000 > this.config.maxCacheSize * 1024 * 1024) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    const entry: InfrastructureCache = {
      key,
      data: result,
      query,
      timestamp: Date.now(),
      expiresAt: Date.now() + (this.config.cacheTtlHours * 60 * 60 * 1000),
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      priority: CachePriority.MEDIUM
    };

    this.cache.set(key, entry);
  }

  private createError(error: any, query?: InfrastructureQuery): InfrastructureApiError {
    const infraError = new Error(error.message || 'Unknown error') as InfrastructureApiError;
    
    if (error.name === 'AbortError') {
      infraError.type = InfrastructureApiErrorType.TIMEOUT_ERROR;
    } else if (error.message?.includes('coordinates') || error.message?.includes('bounding box')) {
      infraError.type = InfrastructureApiErrorType.INVALID_BBOX;
    } else if (error.message?.includes('too large')) {
      infraError.type = InfrastructureApiErrorType.QUERY_TOO_LARGE;
    } else if (error.message?.includes('HTTP')) {
      infraError.type = InfrastructureApiErrorType.NETWORK_ERROR;
      infraError.statusCode = parseInt(error.message.match(/\d+/)?.[0] || '0');
    } else {
      infraError.type = InfrastructureApiErrorType.OVERPASS_ERROR;
    }

    if (query) {
      infraError.query = query;
    }

    return infraError;
  }

  private generateRequestId(): string {
    return `osm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStatistics {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: 0, // Would need to track hits/misses
      missRate: 0,
      evictionCount: 0, // Would need to track evictions
      averageAccessTime: 0, // Would need to track timing
      memoryUsage: totalSize / (1024 * 1024) // MB
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default OpenStreetMapInfrastructureClient;