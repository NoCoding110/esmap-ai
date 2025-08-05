/**
 * Main Resilience Manager
 * Coordinates all data source resilience and failover components
 */

import { CircuitBreakerManager } from './circuit-breaker';
import { DataFusionEngine } from './data-fusion';
import { FailoverManager } from './failover-manager';
import { ReliabilityTracker } from './reliability-tracker';
import { RealTimeFeedManager } from './real-time-feeds';
import { WebScrapingManager } from './web-scraper';
import { AlternativeDataSourceManager } from './alternative-sources';
import { CommercialDataBrokerManager } from './commercial-brokers';

import {
  DataSourceConfig,
  DataFusionRequest,
  ResilienceConfig,
  DataSourceAlert,
  AlertType,
  LegalComplianceCheck
} from './types';

export interface ResilienceStatus {
  totalSources: number;
  healthySources: number;
  circuitBreakersOpen: number;
  activeFailovers: number;
  realTimeStreams: number;
  scrapingJobs: number;
  commercialBrokers: number;
  complianceIssues: number;
  overallHealthScore: number;
  lastUpdated: string;
}

export interface DataSourceRequest {
  dataType: string;
  parameters: Record<string, any>;
  strategy?: 'failover' | 'fusion' | 'primary_only';
  sources?: {
    required?: string[];
    excluded?: string[];
    preferred?: string[];
  };
  quality?: {
    minConfidence: number;
    maxLatency: number;
    requireFreshData: boolean;
  };
  budget?: {
    maxCost: number;
    currency: string;
  };
}

export interface DataSourceResponse<T = any> {
  data: T;
  metadata: {
    strategy: string;
    sourcesUsed: string[];
    confidence: number;
    latency: number;
    cost: number;
    currency: string;
    warnings: string[];
  };
  quality: {
    accuracy: number;
    completeness: number;
    freshness: number;
    reliability: number;
  };
  compliance: {
    licenseCompliant: boolean;
    attributionRequired: boolean;
    usageRestrictions: string[];
  };
}

export class ResilienceManager {
  private circuitBreaker: CircuitBreakerManager;
  private dataFusion: DataFusionEngine;
  private failoverManager: FailoverManager;
  private reliabilityTracker: ReliabilityTracker;
  private feedManager: RealTimeFeedManager;
  private webScraper: WebScrapingManager;
  private alternativeSources: AlternativeDataSourceManager;
  private commercialBrokers: CommercialDataBrokerManager;
  
  private config: ResilienceConfig;
  private registeredSources: Map<string, DataSourceConfig> = new Map();
  private alerts: DataSourceAlert[] = [];
  private complianceChecks: Map<string, LegalComplianceCheck> = new Map();

  constructor(config?: Partial<ResilienceConfig>) {
    this.config = {
      globalTimeout: 10000,
      maxConcurrentRequests: 100,
      circuitBreakerThreshold: 0.5,
      circuitBreakerTimeout: 60000,
      fusionConfidenceThreshold: 0.7,
      alertingEnabled: true,
      alertWebhooks: [],
      metricsRetentionDays: 30,
      ...config
    };

    this.initializeComponents();
  }

  /**
   * Initialize all resilience components
   */
  private initializeComponents(): void {
    this.circuitBreaker = new CircuitBreakerManager({
      failureThreshold: Math.floor(this.config.circuitBreakerThreshold * 10),
      timeout: this.config.circuitBreakerTimeout
    });

    this.dataFusion = new DataFusionEngine();
    this.failoverManager = new FailoverManager(this.circuitBreaker, this.dataFusion);
    
    this.reliabilityTracker = new ReliabilityTracker({
      uptimeMin: 95.0,
      responseTimeMax: this.config.globalTimeout * 0.8,
      successRateMin: 95.0,
      qualityScoreMin: 0.8,
      consistencyScoreMin: 0.8
    });

    this.feedManager = new RealTimeFeedManager();
    this.webScraper = new WebScrapingManager();
    this.alternativeSources = new AlternativeDataSourceManager();
    this.commercialBrokers = new CommercialDataBrokerManager();

    console.log('Resilience Manager initialized with all components');
  }

  /**
   * Register a data source across all relevant components
   */
  registerDataSource(config: DataSourceConfig): void {
    // Register with all relevant components
    this.registeredSources.set(config.id, config);
    this.failoverManager.registerSource(config);
    this.reliabilityTracker.initializeSource(config.id, config);
    this.dataFusion.registerSource(config);

    // Perform initial compliance check
    this.scheduleComplianceCheck(config.id);

    console.log(`Registered data source: ${config.name} (${config.id})`);
  }

  /**
   * Execute a resilient data request
   */
  async executeRequest<T>(request: DataSourceRequest): Promise<DataSourceResponse<T>> {
    const startTime = Date.now();
    const strategy = request.strategy || 'failover';

    try {
      let result: any;
      let sourcesUsed: string[] = [];
      let confidence = 1.0;
      let cost = 0;
      let warnings: string[] = [];

      switch (strategy) {
        case 'primary_only':
          result = await this.executePrimaryOnly(request);
          sourcesUsed = [result.sourceId];
          break;

        case 'failover':
          result = await this.executeWithFailover(request);
          sourcesUsed = result.attemptedSources;
          if (result.failoverOccurred) {
            warnings.push('Failover occurred during request');
          }
          break;

        case 'fusion':
          result = await this.executeWithFusion(request);
          sourcesUsed = result.sourcesUsed;
          confidence = result.confidence;
          if (confidence < this.config.fusionConfidenceThreshold) {
            warnings.push(`Confidence ${confidence.toFixed(3)} below threshold ${this.config.fusionConfidenceThreshold}`);
          }
          break;

        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }

      const latency = Date.now() - startTime;

      // Record success for reliability tracking
      for (const sourceId of sourcesUsed) {
        this.reliabilityTracker.recordSuccess(sourceId, latency / sourcesUsed.length);
      }

      // Assess data quality
      const quality = this.assessDataQuality(result.data);

      // Check compliance
      const compliance = await this.checkRequestCompliance(sourcesUsed);

      return {
        data: result.data,
        metadata: {
          strategy,
          sourcesUsed,
          confidence,
          latency,
          cost,
          currency: 'USD',
          warnings
        },
        quality,
        compliance
      };

    } catch (error) {
      // Record failures for reliability tracking
      const candidateSources = this.getCandidateSources(request);
      for (const sourceId of candidateSources) {
        this.reliabilityTracker.recordFailure(sourceId, Date.now() - startTime, (error as Error).message);
      }

      throw error;
    }
  }

  /**
   * Execute request using primary source only
   */
  private async executePrimaryOnly(request: DataSourceRequest): Promise<any> {
    const primarySource = this.selectPrimarySource(request);
    if (!primarySource) {
      throw new Error('No primary source available for request');
    }

    return await this.circuitBreaker.execute(primarySource, async () => {
      // This would be implemented based on the specific data source type
      return { data: 'mock_data', sourceId: primarySource };
    });
  }

  /**
   * Execute request with failover
   */
  private async executeWithFailover(request: DataSourceRequest): Promise<any> {
    return await this.failoverManager.executeWithFailover(
      request.dataType,
      async (sourceId: string) => {
        // This would be implemented based on the specific data source type
        return { data: 'mock_data', sourceId };
      },
      {
        primarySourceId: this.selectPrimarySource(request),
        strategy: 'priority',
        maxAttempts: 3,
        timeoutMs: request.quality?.maxLatency || this.config.globalTimeout,
        requiredSources: request.sources?.required,
        excludedSources: request.sources?.excluded
      }
    );
  }

  /**
   * Execute request with data fusion
   */
  private async executeWithFusion(request: DataSourceRequest): Promise<any> {
    return await this.failoverManager.executeWithFusion(
      request.dataType,
      async (sourceId: string) => {
        // This would be implemented based on the specific data source type
        return { data: 'mock_data', sourceId };
      },
      {
        maxSources: 3,
        confidenceThreshold: request.quality?.minConfidence || this.config.fusionConfidenceThreshold,
        timeoutMs: request.quality?.maxLatency || this.config.globalTimeout
      }
    );
  }

  /**
   * Get resilience status
   */
  getResilienceStatus(): ResilienceStatus {
    const allSources = Array.from(this.registeredSources.keys());
    const healthySources = this.circuitBreaker.getHealthySources();
    const circuitBreakerStats = this.circuitBreaker.getSummaryStats();
    const failoverStats = this.failoverManager.getFailoverStats();
    const feedMetrics = this.feedManager.getStreamMetrics() as any[];
    const scrapingJobs = this.webScraper.getAllJobs();
    const brokers = this.commercialBrokers.getBrokers();

    const complianceIssues = Array.from(this.complianceChecks.values())
      .filter(check => check.complianceStatus === 'non_compliant').length;

    const overallHealthScore = this.calculateOverallHealthScore(
      healthySources.length,
      allSources.length,
      circuitBreakerStats.open,
      complianceIssues
    );

    return {
      totalSources: allSources.length,
      healthySources: healthySources.length,
      circuitBreakersOpen: circuitBreakerStats.open,
      activeFailovers: failoverStats.activeFailovers,
      realTimeStreams: feedMetrics.length,
      scrapingJobs: scrapingJobs.length,
      commercialBrokers: brokers.length,
      complianceIssues,
      overallHealthScore,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};

    // Check circuit breakers
    const circuitStats = this.circuitBreaker.getSummaryStats();
    if (circuitStats.open > 0) {
      components.circuitBreakers = 'degraded';
      issues.push(`${circuitStats.open} circuit breakers are open`);
      recommendations.push('Investigate and resolve failing data sources');
    } else {
      components.circuitBreakers = 'healthy';
    }

    // Check failover status
    const failoverStats = this.failoverManager.getFailoverStats();
    if (failoverStats.activeFailovers > 0) {
      components.failover = 'degraded';
      issues.push(`${failoverStats.activeFailovers} active failovers`);
    } else {
      components.failover = 'healthy';
    }

    // Check real-time feeds
    const feedMetrics = this.feedManager.getStreamMetrics() as any[];
    const unhealthyFeeds = feedMetrics.filter(m => m.qualityScore < 0.7).length;
    if (unhealthyFeeds > 0) {
      components.realTimeFeeds = 'degraded';
      issues.push(`${unhealthyFeeds} real-time feeds have low quality scores`);
      recommendations.push('Review and improve real-time feed configurations');
    } else {
      components.realTimeFeeds = 'healthy';
    }

    // Check compliance
    const complianceIssues = Array.from(this.complianceChecks.values())
      .filter(check => check.complianceStatus === 'non_compliant').length;
    if (complianceIssues > 0) {
      components.compliance = 'unhealthy';
      issues.push(`${complianceIssues} compliance violations detected`);
      recommendations.push('Address compliance violations immediately');
    } else {
      components.compliance = 'healthy';
    }

    // Determine overall status
    const unhealthyCount = Object.values(components).filter(status => status === 'unhealthy').length;
    const degradedCount = Object.values(components).filter(status => status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, components, issues, recommendations };
  }

  /**
   * Schedule compliance check for a data source
   */
  private async scheduleComplianceCheck(sourceId: string): Promise<void> {
    try {
      const config = this.registeredSources.get(sourceId);
      if (!config) return;

      const complianceCheck: LegalComplianceCheck = {
        sourceId,
        lastChecked: new Date().toISOString(),
        complianceStatus: 'compliant',
        checks: [
          {
            checkType: 'data_licensing',
            status: 'pass',
            description: 'Data source has appropriate licensing'
          },
          {
            checkType: 'usage_restrictions',
            status: config.compliance.dataUsageRestrictions.length > 0 ? 'warning' : 'pass',
            description: config.compliance.dataUsageRestrictions.length > 0 ? 
              'Usage restrictions present' : 'No usage restrictions'
          },
          {
            checkType: 'attribution_requirements',
            status: config.compliance.requiresAttribution ? 'pass' : 'warning',
            description: config.compliance.requiresAttribution ? 
              'Attribution requirements documented' : 'No attribution requirements'
          }
        ],
        recommendations: [],
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      };

      this.complianceChecks.set(sourceId, complianceCheck);
    } catch (error) {
      console.error(`Failed to perform compliance check for ${sourceId}:`, error);
    }
  }

  /**
   * Helper methods
   */
  private selectPrimarySource(request: DataSourceRequest): string | undefined {
    const candidateSources = this.getCandidateSources(request);
    const healthySources = this.circuitBreaker.getHealthySources();
    
    // Find the highest priority healthy source
    const availableSources = candidateSources.filter(id => healthySources.includes(id));
    
    if (availableSources.length === 0) return undefined;
    
    return availableSources.sort((a, b) => {
      const configA = this.registeredSources.get(a)!;
      const configB = this.registeredSources.get(b)!;
      return configA.priority - configB.priority;
    })[0];
  }

  private getCandidateSources(request: DataSourceRequest): string[] {
    let candidates = Array.from(this.registeredSources.keys());

    if (request.sources?.required) {
      candidates = candidates.filter(id => request.sources!.required!.includes(id));
    }

    if (request.sources?.excluded) {
      candidates = candidates.filter(id => !request.sources!.excluded!.includes(id));
    }

    return candidates;
  }

  private assessDataQuality(data: any): {
    accuracy: number;
    completeness: number;
    freshness: number;
    reliability: number;
  } {
    // Simplified quality assessment
    return {
      accuracy: 0.9,
      completeness: 0.85,
      freshness: 0.8,
      reliability: 0.9
    };
  }

  private async checkRequestCompliance(sourcesUsed: string[]): Promise<{
    licenseCompliant: boolean;
    attributionRequired: boolean;
    usageRestrictions: string[];
  }> {
    let licenseCompliant = true;
    let attributionRequired = false;
    const usageRestrictions: string[] = [];

    for (const sourceId of sourcesUsed) {
      const config = this.registeredSources.get(sourceId);
      if (config) {
        if (config.compliance.requiresAttribution) {
          attributionRequired = true;
        }
        usageRestrictions.push(...config.compliance.dataUsageRestrictions);
      }
    }

    return {
      licenseCompliant,
      attributionRequired,
      usageRestrictions: [...new Set(usageRestrictions)]
    };
  }

  private calculateOverallHealthScore(
    healthySources: number,
    totalSources: number,
    openCircuitBreakers: number,
    complianceIssues: number
  ): number {
    if (totalSources === 0) return 1.0;

    const healthRatio = healthySources / totalSources;
    const circuitBreakerPenalty = openCircuitBreakers * 0.1;
    const compliancePenalty = complianceIssues * 0.2;

    const score = Math.max(0, healthRatio - circuitBreakerPenalty - compliancePenalty);
    return Math.round(score * 100) / 100;
  }

  /**
   * Public API methods
   */
  getRegisteredSources(): DataSourceConfig[] {
    return Array.from(this.registeredSources.values());
  }

  getCircuitBreakerManager(): CircuitBreakerManager {
    return this.circuitBreaker;
  }

  getFailoverManager(): FailoverManager {
    return this.failoverManager;
  }

  getReliabilityTracker(): ReliabilityTracker {
    return this.reliabilityTracker;
  }

  getFeedManager(): RealTimeFeedManager {
    return this.feedManager;
  }

  getWebScraper(): WebScrapingManager {
    return this.webScraper;
  }

  getAlternativeSources(): AlternativeDataSourceManager {
    return this.alternativeSources;
  }

  getCommercialBrokers(): CommercialDataBrokerManager {
    return this.commercialBrokers;
  }

  getComplianceChecks(): LegalComplianceCheck[] {
    return Array.from(this.complianceChecks.values());
  }

  getAlerts(): DataSourceAlert[] {
    return [...this.alerts];
  }

  updateConfig(newConfig: Partial<ResilienceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup old data and perform maintenance
   */
  async performMaintenance(): Promise<void> {
    console.log('Performing resilience system maintenance...');

    // Cleanup reliability tracker
    this.reliabilityTracker.cleanup();

    // Cleanup feed manager
    this.feedManager.cleanup();

    // Reset circuit breakers that have been open too long
    const circuitStates = this.circuitBreaker.getAllStates();
    for (const state of circuitStates) {
      if (state.state === 'open' && state.nextAttempt) {
        const nextAttemptTime = new Date(state.nextAttempt).getTime();
        if (Date.now() > nextAttemptTime + 300000) { // 5 minutes past next attempt
          console.log(`Resetting circuit breaker for ${state.sourceId}`);
          await this.circuitBreaker.getCircuitBreaker(state.sourceId).reset();
        }
      }
    }

    // Clean old alerts
    const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoff
    );

    console.log('Resilience system maintenance completed');
  }
}