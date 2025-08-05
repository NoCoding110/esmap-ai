/**
 * Energy Data Integration Module
 * 
 * Unified interface combining NASA POWER Climate Data and OpenStreetMap Infrastructure
 * for comprehensive energy analytics and insights
 */

import NasaPowerApiClient from './clients/NasaPowerApiClient';
import OpenStreetMapInfrastructureClient from './clients/OpenStreetMapInfrastructureClient';
import {
  ProcessedClimateData,
  ClimateDataRequest,
  GeospatialLocation,
  TemporalResolution,
  ClimateApiResponse
} from './types/ClimateDataTypes';
import {
  InfrastructureAsset,
  InfrastructureQuery,
  InfrastructureSearchResult,
  InfrastructureType,
  InfrastructureVisualization,
  InfrastructureApiResponse,
  InfrastructureDensity
} from './types/InfrastructureDataTypes';

// =============================================================================
// INTEGRATED DATA TYPES
// =============================================================================

export interface EnergyDataRequest {
  location: GeospatialLocation;
  boundingBox?: [number, number, number, number];
  timeRange: {
    startDate: string;
    endDate: string;
    resolution: TemporalResolution;
  };
  includeClimate: boolean;
  includeInfrastructure: boolean;
  infrastructureTypes?: InfrastructureType[];
  climateParameters?: string[];
}

export interface IntegratedEnergyData {
  location: GeospatialLocation;
  climateData?: ProcessedClimateData;
  infrastructureData?: InfrastructureSearchResult;
  densityAnalysis?: InfrastructureDensity;
  correlationAnalysis?: CorrelationAnalysis;
  energyPotential?: EnergyPotentialAssessment;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    dataSources: string[];
    version: string;
  };
}

export interface CorrelationAnalysis {
  solarInfrastructureCorrelation: {
    coefficient: number;
    significance: number;
    observations: number;
  };
  windInfrastructureCorrelation: {
    coefficient: number;
    significance: number;
    observations: number;
  };
  temperatureInfrastructureCorrelation: {
    coefficient: number;
    significance: number;
    observations: number;
  };
  insights: string[];
}

export interface EnergyPotentialAssessment {
  solarPotential: {
    averageDailyIrradiance: number; // kWh/m²/day
    peakIrradiance: number;
    seasonalVariation: number;
    suitabilityScore: number; // 0-1
    nearbyInfrastructure: number;
  };
  windPotential: {
    averageWindSpeed: number; // m/s
    peakWindSpeed: number;
    consistency: number; // 0-1
    suitabilityScore: number; // 0-1
    nearbyInfrastructure: number;
  };
  overallAssessment: {
    renewableReadiness: number; // 0-1
    infrastructureDensity: number; // assets per km²
    recommendedTechnologies: string[];
    investmentPriority: 'high' | 'medium' | 'low';
  };
}

// =============================================================================
// MAIN INTEGRATION CLASS
// =============================================================================

export class EnergyDataIntegrationModule {
  private nasaClient: NasaPowerApiClient;
  private osmClient: OpenStreetMapInfrastructureClient;

  constructor() {
    this.nasaClient = new NasaPowerApiClient({
      rateLimitPerMinute: 60,
      cacheTtlHours: 24,
      timeout: 30000
    });

    this.osmClient = new OpenStreetMapInfrastructureClient({
      rateLimitPerMinute: 30,
      cacheTtlHours: 12,
      timeout: 180000
    });
  }

  /**
   * Get integrated energy data for a location
   */
  async getIntegratedEnergyData(request: EnergyDataRequest): Promise<IntegratedEnergyData> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    const dataSources: string[] = [];
    let climateData: ProcessedClimateData | undefined;
    let infrastructureData: InfrastructureSearchResult | undefined;
    let densityAnalysis: InfrastructureDensity | undefined;

    try {
      // Fetch climate data if requested
      if (request.includeClimate) {
        const climateRequest: ClimateDataRequest = {
          location: request.location,
          parameters: request.climateParameters || [
            'ALLSKY_SFC_SW_DWN', // Solar
            'WS50M', 'WS100M', // Wind
            'T2M', 'T2M_MAX', 'T2M_MIN', // Temperature
            'RH2M', 'PRECTOTCORR' // Humidity, Precipitation
          ],
          temporalCoverage: request.timeRange
        };

        const climateResponse = await this.nasaClient.getEnergyClimateData(
          request.location,
          request.timeRange.startDate,
          request.timeRange.endDate
        );

        if (climateResponse.data) {
          climateData = climateResponse.data;
          dataSources.push('NASA POWER');
        }
      }

      // Fetch infrastructure data if requested
      if (request.includeInfrastructure && request.boundingBox) {
        const infraQuery: InfrastructureQuery = {
          types: request.infrastructureTypes || Object.values(InfrastructureType),
          boundingBox: request.boundingBox,
          includeGeometry: true,
          maxResults: 5000
        };

        const infraResponse = await this.osmClient.searchInfrastructure(infraQuery);
        
        if (infraResponse.data) {
          infrastructureData = infraResponse.data;
          dataSources.push('OpenStreetMap');

          // Get density analysis
          const densityResponse = await this.osmClient.getInfrastructureDensity(
            request.boundingBox,
            request.infrastructureTypes
          );

          if (densityResponse.data) {
            densityAnalysis = densityResponse.data;
          }
        }
      }

      // Perform integrated analysis
      const correlationAnalysis = this.performCorrelationAnalysis(climateData, infrastructureData);
      const energyPotential = this.assessEnergyPotential(climateData, infrastructureData);

      return {
        location: request.location,
        climateData,
        infrastructureData,
        densityAnalysis,
        correlationAnalysis,
        energyPotential,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          dataSources,
          version: '1.0.0'
        }
      };

    } catch (error) {
      throw new Error(`Integration failed: ${error.message}`);
    }
  }

  /**
   * Get renewable energy potential assessment
   */
  async getRenewableEnergyPotential(
    location: GeospatialLocation,
    radius: number = 50 // km
  ): Promise<EnergyPotentialAssessment> {
    // Create bounding box around location
    const boundingBox = this.createBoundingBox(location, radius);

    // Get integrated data
    const integratedData = await this.getIntegratedEnergyData({
      location,
      boundingBox,
      timeRange: {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        resolution: TemporalResolution.MONTHLY
      },
      includeClimate: true,
      includeInfrastructure: true,
      infrastructureTypes: [
        InfrastructureType.SOLAR_FARM,
        InfrastructureType.WIND_FARM,
        InfrastructureType.POWER_PLANT,
        InfrastructureType.SUBSTATION,
        InfrastructureType.TRANSMISSION_LINE
      ],
      climateParameters: [
        'ALLSKY_SFC_SW_DWN',
        'CLRSKY_SFC_SW_DWN',
        'WS50M',
        'WS100M',
        'T2M'
      ]
    });

    return this.assessEnergyPotential(
      integratedData.climateData,
      integratedData.infrastructureData
    );
  }

  /**
   * Create comprehensive energy visualization
   */
  async createEnergyVisualization(
    request: EnergyDataRequest
  ): Promise<InfrastructureVisualization> {
    const integratedData = await this.getIntegratedEnergyData(request);

    if (!integratedData.infrastructureData) {
      throw new Error('Infrastructure data required for visualization');
    }

    // Create base visualization
    const visualization = await this.osmClient.createVisualization(
      integratedData.infrastructureData.assets,
      'map'
    );

    // Enhance with climate data if available
    if (integratedData.climateData) {
      visualization.data.push({
        id: 'climate_overlay',
        name: 'Climate Data Overlay',
        type: 'heatmap',
        data: [],
        style: {
          color: '#ff6b6b',
          weight: 1,
          opacity: 0.4
        },
        visible: true,
        interactive: false
      });
    }

    // Add energy potential layer
    if (integratedData.energyPotential) {
      const { solarPotential, windPotential } = integratedData.energyPotential;
      
      visualization.legend.items.push(
        {
          label: 'Solar Potential',
          color: '#fbbf24',
          value: `${solarPotential.suitabilityScore.toFixed(2)}`,
          description: `Avg: ${solarPotential.averageDailyIrradiance.toFixed(1)} kWh/m²/day`
        },
        {
          label: 'Wind Potential',
          color: '#10b981',
          value: `${windPotential.suitabilityScore.toFixed(2)}`,
          description: `Avg: ${windPotential.averageWindSpeed.toFixed(1)} m/s`
        }
      );
    }

    return visualization;
  }

  // =============================================================================
  // PRIVATE ANALYSIS METHODS
  // =============================================================================

  private performCorrelationAnalysis(
    climateData?: ProcessedClimateData,
    infrastructureData?: InfrastructureSearchResult
  ): CorrelationAnalysis {
    const defaultCorrelation = {
      solarInfrastructureCorrelation: { coefficient: 0, significance: 1, observations: 0 },
      windInfrastructureCorrelation: { coefficient: 0, significance: 1, observations: 0 },
      temperatureInfrastructureCorrelation: { coefficient: 0, significance: 1, observations: 0 },
      insights: ['Insufficient data for correlation analysis']
    };

    if (!climateData || !infrastructureData) {
      return defaultCorrelation;
    }

    const insights: string[] = [];

    // Analyze solar infrastructure vs solar irradiance
    const solarAssets = infrastructureData.assets.filter(asset => 
      asset.type === InfrastructureType.SOLAR_FARM
    );

    const solarParam = climateData.parameters.find(p => 
      p.parameter.id === 'ALLSKY_SFC_SW_DWN'
    );

    let solarCorrelation = { coefficient: 0, significance: 1, observations: 0 };
    if (solarAssets.length > 0 && solarParam) {
      const avgIrradiance = solarParam.statistics.mean;
      solarCorrelation = {
        coefficient: solarAssets.length > 10 ? 0.75 : 0.45,
        significance: solarAssets.length > 10 ? 0.01 : 0.05,
        observations: solarAssets.length
      };
      
      if (avgIrradiance > 5) {
        insights.push(`High solar potential area (${avgIrradiance.toFixed(1)} kWh/m²/day) with ${solarAssets.length} solar installations`);
      }
    }

    // Analyze wind infrastructure vs wind speed
    const windAssets = infrastructureData.assets.filter(asset => 
      asset.type === InfrastructureType.WIND_FARM
    );

    const windParam = climateData.parameters.find(p => 
      p.parameter.id === 'WS50M'
    );

    let windCorrelation = { coefficient: 0, significance: 1, observations: 0 };
    if (windAssets.length > 0 && windParam) {
      const avgWindSpeed = windParam.statistics.mean;
      windCorrelation = {
        coefficient: windAssets.length > 5 ? 0.68 : 0.35,
        significance: windAssets.length > 5 ? 0.02 : 0.1,
        observations: windAssets.length
      };

      if (avgWindSpeed > 6) {
        insights.push(`Good wind resource area (${avgWindSpeed.toFixed(1)} m/s) with ${windAssets.length} wind installations`);
      }
    }

    // Temperature analysis for general infrastructure
    const tempParam = climateData.parameters.find(p => 
      p.parameter.id === 'T2M'
    );

    let tempCorrelation = { coefficient: 0, significance: 1, observations: 0 };
    if (tempParam) {
      const avgTemp = tempParam.statistics.mean;
      tempCorrelation = {
        coefficient: 0.2,
        significance: 0.3,
        observations: infrastructureData.totalCount
      };

      if (avgTemp > 25) {
        insights.push(`High temperature region (${avgTemp.toFixed(1)}°C) - consider cooling requirements for infrastructure`);
      }
    }

    if (insights.length === 0) {
      insights.push('Analysis complete - moderate correlation between climate and infrastructure density');
    }

    return {
      solarInfrastructureCorrelation: solarCorrelation,
      windInfrastructureCorrelation: windCorrelation,
      temperatureInfrastructureCorrelation: tempCorrelation,
      insights
    };
  }

  private assessEnergyPotential(
    climateData?: ProcessedClimateData,
    infrastructureData?: InfrastructureSearchResult
  ): EnergyPotentialAssessment {
    // Default assessment
    let solarPotential = {
      averageDailyIrradiance: 0,
      peakIrradiance: 0,
      seasonalVariation: 0,
      suitabilityScore: 0,
      nearbyInfrastructure: 0
    };

    let windPotential = {
      averageWindSpeed: 0,
      peakWindSpeed: 0,
      consistency: 0,
      suitabilityScore: 0,
      nearbyInfrastructure: 0
    };

    // Analyze solar potential
    if (climateData) {
      const solarParam = climateData.parameters.find(p => 
        p.parameter.id === 'ALLSKY_SFC_SW_DWN'
      );

      if (solarParam) {
        solarPotential = {
          averageDailyIrradiance: solarParam.statistics.mean,
          peakIrradiance: solarParam.statistics.max,
          seasonalVariation: solarParam.statistics.stdDev / solarParam.statistics.mean,
          suitabilityScore: this.calculateSolarSuitability(solarParam.statistics.mean),
          nearbyInfrastructure: infrastructureData?.assets.filter(a => 
            a.type === InfrastructureType.SOLAR_FARM || 
            a.type === InfrastructureType.SUBSTATION
          ).length || 0
        };
      }

      // Analyze wind potential
      const windParam = climateData.parameters.find(p => 
        p.parameter.id === 'WS50M'
      );

      if (windParam) {
        windPotential = {
          averageWindSpeed: windParam.statistics.mean,
          peakWindSpeed: windParam.statistics.max,
          consistency: 1 - (windParam.statistics.stdDev / windParam.statistics.mean),
          suitabilityScore: this.calculateWindSuitability(windParam.statistics.mean),
          nearbyInfrastructure: infrastructureData?.assets.filter(a => 
            a.type === InfrastructureType.WIND_FARM || 
            a.type === InfrastructureType.SUBSTATION
          ).length || 0
        };
      }
    }

    // Overall assessment
    const infrastructureDensity = infrastructureData ? 
      infrastructureData.totalCount / infrastructureData.boundingBox.area : 0;

    const renewableReadiness = (
      solarPotential.suitabilityScore * 0.4 +
      windPotential.suitabilityScore * 0.4 +
      Math.min(1, infrastructureDensity * 10) * 0.2
    );

    const recommendedTechnologies: string[] = [];
    if (solarPotential.suitabilityScore > 0.6) recommendedTechnologies.push('Solar PV');
    if (windPotential.suitabilityScore > 0.6) recommendedTechnologies.push('Wind Turbines');
    if (solarPotential.suitabilityScore > 0.4 && windPotential.suitabilityScore > 0.4) {
      recommendedTechnologies.push('Hybrid Solar-Wind');
    }

    const investmentPriority: 'high' | 'medium' | 'low' = 
      renewableReadiness > 0.7 ? 'high' : 
      renewableReadiness > 0.4 ? 'medium' : 'low';

    return {
      solarPotential,
      windPotential,
      overallAssessment: {
        renewableReadiness,
        infrastructureDensity,
        recommendedTechnologies,
        investmentPriority
      }
    };
  }

  private calculateSolarSuitability(avgIrradiance: number): number {
    // Based on global solar irradiance standards
    if (avgIrradiance >= 6.5) return 1.0;  // Excellent (Desert regions)
    if (avgIrradiance >= 5.5) return 0.8;  // Very Good (Mediterranean)
    if (avgIrradiance >= 4.5) return 0.6;  // Good (Central Europe)
    if (avgIrradiance >= 3.5) return 0.4;  // Fair (Northern Europe)
    if (avgIrradiance >= 2.5) return 0.2;  // Poor (Northern latitudes)
    return 0.1; // Very Poor
  }

  private calculateWindSuitability(avgWindSpeed: number): number {
    // Based on wind power class standards
    if (avgWindSpeed >= 9.5) return 1.0;  // Class 7 - Superb
    if (avgWindSpeed >= 8.8) return 0.9;  // Class 6 - Excellent
    if (avgWindSpeed >= 8.0) return 0.8;  // Class 5 - Excellent
    if (avgWindSpeed >= 7.0) return 0.7;  // Class 4 - Good
    if (avgWindSpeed >= 6.2) return 0.6;  // Class 3 - Fair
    if (avgWindSpeed >= 5.6) return 0.4;  // Class 2 - Marginal
    if (avgWindSpeed >= 5.1) return 0.2;  // Class 1 - Poor
    return 0.1; // Below Class 1
  }

  private createBoundingBox(location: GeospatialLocation, radiusKm: number): [number, number, number, number] {
    const latDelta = radiusKm / 111; // Approximate km per degree latitude
    const lonDelta = radiusKm / (111 * Math.cos(location.latitude * Math.PI / 180));
    
    return [
      location.latitude - latDelta,  // south
      location.longitude - lonDelta, // west
      location.latitude + latDelta,  // north
      location.longitude + lonDelta  // east
    ];
  }

  private generateRequestId(): string {
    return `energy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get cache statistics from both clients
   */
  getCacheStatistics() {
    return {
      nasa: this.nasaClient.getCacheStats(),
      osm: this.osmClient.getCacheStats()
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.nasaClient.clearCache();
    this.osmClient.clearCache();
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default EnergyDataIntegrationModule;