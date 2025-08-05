/**
 * Automatic Failover Manager
 * Handles intelligent failover between data sources with priority-based routing
 */

import {
  DataSourceConfig,
  DataSourceHealth,
  HealthStatus,
  FailoverEvent,
  DataSourceAlert,
  AlertType
} from './types';
import { CircuitBreakerManager } from './circuit-breaker';
import { DataFusionEngine } from './data-fusion';

export interface FailoverStrategy {
  name: string;
  description: string;
  shouldFailover: (source: DataSourceHealth, alternatives: DataSourceHealth[]) => boolean;
  selectAlternative: (alternatives: DataSourceHealth[]) => DataSourceHealth | null;
  canFailback: (originalSource: DataSourceHealth, currentSource: DataSourceHealth) => boolean;
}

export class FailoverManager {
  private sources: Map<string, DataSourceConfig> = new Map();
  private healthStatus: Map<string, DataSourceHealth> = new Map();
  private circuitBreaker: CircuitBreakerManager;
  private fusionEngine: DataFusionEngine;
  private strategies: Map<string, FailoverStrategy> = new Map();
  private failoverHistory: FailoverEvent[] = [];
  private activeFailovers: Map<string, string> = new Map(); // original -> current

  constructor(circuitBreaker: CircuitBreakerManager, fusionEngine: DataFusionEngine) {
    this.circuitBreaker = circuitBreaker;
    this.fusionEngine = fusionEngine;
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default failover strategies
   */
  private initializeDefaultStrategies(): void {
    // Priority-Based Failover
    this.strategies.set('priority', {
      name: 'Priority-Based',
      description: 'Fails over to next highest priority source',
      shouldFailover: this.shouldFailoverPriority.bind(this),
      selectAlternative: this.selectByPriority.bind(this),
      canFailback: this.canFailbackPriority.bind(this)
    });

    // Performance-Based Failover
    this.strategies.set('performance', {
      name: 'Performance-Based',
      description: 'Fails over to fastest responding healthy source',
      shouldFailover: this.shouldFailoverPerformance.bind(this),
      selectAlternative: this.selectByPerformance.bind(this),
      canFailback: this.canFailbackPerformance.bind(this)
    });

    // Quality-Based Failover
    this.strategies.set('quality', {
      name: 'Quality-Based',
      description: 'Fails over to highest quality source',
      shouldFailover: this.shouldFailoverQuality.bind(this),
      selectAlternative: this.selectByQuality.bind(this),
      canFailback: this.canFailbackQuality.bind(this)
    });

    // Load-Balanced Failover
    this.strategies.set('load_balanced', {
      name: 'Load-Balanced',
      description: 'Distributes load across healthy sources',
      shouldFailover: this.shouldFailoverLoadBalanced.bind(this),
      selectAlternative: this.selectByLoadBalance.bind(this),
      canFailback: this.canFailbackLoadBalanced.bind(this)
    });
  }

  /**
   * Register a data source
   */
  registerSource(config: DataSourceConfig): void {
    this.sources.set(config.id, config);
    this.fusionEngine.registerSource(config);
    
    // Initialize health status
    this.healthStatus.set(config.id, {
      sourceId: config.id,
      status: HealthStatus.HEALTHY,
      lastChecked: new Date().toISOString(),
      responseTime: 0,
      successRate: 1.0,
      consecutiveFailures: 0,
      metrics: {
        requestsToday: 0,
        errorsToday: 0,
        avgResponseTime: 0,
        dataQualityScore: config.metadata.quality.overall || 0.8
      }
    });
  }

  /**
   * Execute request with automatic failover
   */
  async executeWithFailover<T>(
    dataType: string,
    requestFn: (sourceId: string) => Promise<T>,
    options: {
      primarySourceId?: string;
      strategy?: string;
      maxAttempts?: number;
      timeoutMs?: number;
      requiredSources?: string[];
      excludedSources?: string[];
    } = {}
  ): Promise<{
    data: T;
    sourceId: string;
    failoverOccurred: boolean;
    attemptedSources: string[];
    executionTime: number;
  }> {
    const startTime = Date.now();
    const strategy = this.strategies.get(options.strategy || 'priority')!;
    const maxAttempts = options.maxAttempts || 3;
    const attemptedSources: string[] = [];
    let failoverOccurred = false;

    // Get candidate sources
    let candidates = this.getCandidateSources(
      options.primarySourceId,
      options.requiredSources,
      options.excludedSources
    );

    if (candidates.length === 0) {
      throw new Error('No candidate sources available');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts && candidates.length > 0; attempt++) {
      // Select source for this attempt
      const sourceHealth = attempt === 0 && options.primarySourceId 
        ? this.healthStatus.get(options.primarySourceId)!
        : strategy.selectAlternative(candidates);

      if (!sourceHealth) {
        break;
      }

      const sourceId = sourceHealth.sourceId;
      attemptedSources.push(sourceId);

      // Remove this source from candidates for next attempt
      candidates = candidates.filter(c => c.sourceId !== sourceId);

      try {
        // Execute request with circuit breaker protection
        const data = await this.circuitBreaker.execute(
          sourceId,
          () => requestFn(sourceId),
          { timeout: options.timeoutMs }
        );

        // Update health status on success
        await this.updateHealthOnSuccess(sourceId, Date.now() - startTime);

        // Check if failback is possible
        if (failoverOccurred) {
          await this.checkFailback(options.primarySourceId || attemptedSources[0], sourceId);
        }

        return {
          data,
          sourceId,
          failoverOccurred,
          attemptedSources,
          executionTime: Date.now() - startTime
        };

      } catch (error) {
        lastError = error as Error;
        
        // Update health status on failure
        await this.updateHealthOnFailure(sourceId, error as Error);

        // Record failover if this isn't the first attempt
        if (attempt > 0 || sourceId !== options.primarySourceId) {
          failoverOccurred = true;
          await this.recordFailoverEvent(
            options.primarySourceId || attemptedSources[0],
            sourceId,
            lastError.message,
            dataType
          );
        }

        // Check if we should trigger alerts
        await this.checkAndTriggerAlerts(sourceId, error as Error);
      }
    }

    // All sources failed
    throw new Error(`All ${attemptedSources.length} data source attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * Execute request with data fusion from multiple sources
   */
  async executeWithFusion<T>(
    dataType: string,
    requestFn: (sourceId: string) => Promise<T>,
    options: {
      maxSources?: number;
      confidenceThreshold?: number;
      timeoutMs?: number;
      strategy?: string;
    } = {}
  ): Promise<{
    data: T;
    confidence: number;
    sourcesUsed: string[];
    fusionMethod: string;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const maxSources = options.maxSources || 3;
    const confidenceThreshold = options.confidenceThreshold || 0.7;

    // Get healthy sources
    const healthySources = this.getHealthySources()
      .slice(0, maxSources)
      .map(sourceId => this.healthStatus.get(sourceId)!)
      .sort((a, b) => {
        const configA = this.sources.get(a.sourceId)!;
        const configB = this.sources.get(b.sourceId)!;
        return configA.priority - configB.priority;
      });

    if (healthySources.length === 0) {
      throw new Error('No healthy sources available for fusion');
    }

    // Execute requests in parallel
    const contributions = await Promise.allSettled(
      healthySources.map(async (source) => {
        const requestStart = Date.now();
        try {
          const data = await this.circuitBreaker.execute(
            source.sourceId,
            () => requestFn(source.sourceId),
            { timeout: options.timeoutMs }
          );
          
          const responseTime = Date.now() - requestStart;
          await this.updateHealthOnSuccess(source.sourceId, responseTime);

          return {
            sourceId: source.sourceId,
            data,
            confidence: source.metrics.dataQualityScore,
            weight: 0, // Will be calculated by fusion engine
            responseTime,
            status: 'success' as const
          };
        } catch (error) {
          await this.updateHealthOnFailure(source.sourceId, error as Error);
          return {
            sourceId: source.sourceId,
            data: null,
            confidence: 0,
            weight: 0,
            responseTime: Date.now() - requestStart,
            status: 'failed' as const,
            error: (error as Error).message
          };
        }
      })
    );

    // Extract successful contributions
    const successfulContributions = contributions
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(contrib => contrib.status === 'success');

    if (successfulContributions.length === 0) {
      throw new Error('No successful contributions for data fusion');
    }

    // Perform data fusion
    const fusionResult = await this.fusionEngine.fuseData({
      dataType,
      parameters: {},
      confidenceThreshold,
      maxSources,
      timeoutMs: options.timeoutMs || 5000
    }, successfulContributions);

    return {
      data: fusionResult.data,
      confidence: fusionResult.confidence,
      sourcesUsed: successfulContributions.map(c => c.sourceId),
      fusionMethod: fusionResult.fusionMethod,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Get candidate sources for failover
   */
  private getCandidateSources(
    primarySourceId?: string,
    requiredSources?: string[],
    excludedSources?: string[]
  ): DataSourceHealth[] {
    let candidates = Array.from(this.healthStatus.values());

    // Filter by required sources if specified
    if (requiredSources && requiredSources.length > 0) {
      candidates = candidates.filter(h => requiredSources.includes(h.sourceId));
    }

    // Exclude specified sources
    if (excludedSources && excludedSources.length > 0) {
      candidates = candidates.filter(h => !excludedSources.includes(h.sourceId));
    }

    // Only include healthy sources (circuit breaker not open)
    const healthySources = this.circuitBreaker.getHealthySources();
    candidates = candidates.filter(h => 
      healthySources.includes(h.sourceId) && 
      h.status !== HealthStatus.CIRCUIT_OPEN
    );

    // Sort by priority (lower number = higher priority)
    return candidates.sort((a, b) => {
      const configA = this.sources.get(a.sourceId)!;
      const configB = this.sources.get(b.sourceId)!;
      return configA.priority - configB.priority;
    });
  }

  /**
   * Failover strategy implementations
   */
  private shouldFailoverPriority(source: DataSourceHealth, alternatives: DataSourceHealth[]): boolean {
    return source.status === HealthStatus.UNHEALTHY || 
           source.status === HealthStatus.CIRCUIT_OPEN ||
           source.consecutiveFailures >= 3;
  }

  private selectByPriority(alternatives: DataSourceHealth[]): DataSourceHealth | null {
    return alternatives.length > 0 ? alternatives[0] : null;
  }

  private canFailbackPriority(original: DataSourceHealth, current: DataSourceHealth): boolean {
    const originalConfig = this.sources.get(original.sourceId)!;
    const currentConfig = this.sources.get(current.sourceId)!;
    
    return original.status === HealthStatus.HEALTHY &&
           original.consecutiveFailures === 0 &&
           originalConfig.priority < currentConfig.priority;
  }

  private shouldFailoverPerformance(source: DataSourceHealth, alternatives: DataSourceHealth[]): boolean {
    if (source.status !== HealthStatus.HEALTHY) return true;
    
    const avgResponseTime = alternatives.reduce((sum, alt) => sum + alt.responseTime, 0) / alternatives.length;
    return source.responseTime > avgResponseTime * 2; // Fail over if 2x slower than average
  }

  private selectByPerformance(alternatives: DataSourceHealth[]): DataSourceHealth | null {
    return alternatives.sort((a, b) => a.responseTime - b.responseTime)[0] || null;
  }

  private canFailbackPerformance(original: DataSourceHealth, current: DataSourceHealth): boolean {
    return original.status === HealthStatus.HEALTHY &&
           original.responseTime < current.responseTime * 0.8; // Fail back if 20% faster
  }

  private shouldFailoverQuality(source: DataSourceHealth, alternatives: DataSourceHealth[]): boolean {
    if (source.status !== HealthStatus.HEALTHY) return true;
    
    const maxQuality = Math.max(...alternatives.map(alt => alt.metrics.dataQualityScore));
    return source.metrics.dataQualityScore < maxQuality * 0.8; // Fail over if quality is 20% worse
  }

  private selectByQuality(alternatives: DataSourceHealth[]): DataSourceHealth | null {
    return alternatives.sort((a, b) => b.metrics.dataQualityScore - a.metrics.dataQualityScore)[0] || null;
  }

  private canFailbackQuality(original: DataSourceHealth, current: DataSourceHealth): boolean {
    return original.status === HealthStatus.HEALTHY &&
           original.metrics.dataQualityScore > current.metrics.dataQualityScore * 1.1;
  }

  private shouldFailoverLoadBalanced(source: DataSourceHealth, alternatives: DataSourceHealth[]): boolean {
    if (source.status !== HealthStatus.HEALTHY) return true;
    
    // Consider load balancing if source has significantly more requests
    const avgRequests = alternatives.reduce((sum, alt) => sum + alt.metrics.requestsToday, 0) / alternatives.length;
    return source.metrics.requestsToday > avgRequests * 1.5;
  }

  private selectByLoadBalance(alternatives: DataSourceHealth[]): DataSourceHealth | null {
    // Select source with lowest current load
    return alternatives.sort((a, b) => a.metrics.requestsToday - b.metrics.requestsToday)[0] || null;
  }

  private canFailbackLoadBalanced(original: DataSourceHealth, current: DataSourceHealth): boolean {
    return original.status === HealthStatus.HEALTHY &&
           original.metrics.requestsToday < current.metrics.requestsToday * 0.8;
  }

  /**
   * Health status management
   */
  private async updateHealthOnSuccess(sourceId: string, responseTime: number): Promise<void> {
    const health = this.healthStatus.get(sourceId);
    if (!health) return;

    health.lastChecked = new Date().toISOString();
    health.responseTime = responseTime;
    health.consecutiveFailures = 0;
    health.metrics.requestsToday++;
    
    // Update moving average of response time
    health.metrics.avgResponseTime = (health.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
    
    // Update success rate
    const totalRequests = health.metrics.requestsToday;
    const successfulRequests = totalRequests - health.metrics.errorsToday;
    health.successRate = successfulRequests / totalRequests;
    
    // Update status
    if (health.status !== HealthStatus.HEALTHY && health.consecutiveFailures === 0) {
      health.status = HealthStatus.HEALTHY;
    }
  }

  private async updateHealthOnFailure(sourceId: string, error: Error): Promise<void> {
    const health = this.healthStatus.get(sourceId);
    if (!health) return;

    health.lastChecked = new Date().toISOString();
    health.consecutiveFailures++;
    health.lastError = error.message;
    health.metrics.errorsToday++;
    
    // Update success rate
    const totalRequests = health.metrics.requestsToday;
    const successfulRequests = totalRequests - health.metrics.errorsToday;
    health.successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
    
    // Update status based on failure count
    if (health.consecutiveFailures >= 5) {
      health.status = HealthStatus.UNHEALTHY;
    } else if (health.consecutiveFailures >= 3) {
      health.status = HealthStatus.DEGRADED;
    }
  }

  /**
   * Get healthy sources
   */
  private getHealthySources(): string[] {
    return Array.from(this.healthStatus.values())
      .filter(h => h.status === HealthStatus.HEALTHY || h.status === HealthStatus.DEGRADED)
      .map(h => h.sourceId);
  }

  /**
   * Record failover event
   */
  private async recordFailoverEvent(
    primarySource: string,
    failoverSource: string,
    reason: string,
    dataType: string
  ): Promise<void> {
    const event: FailoverEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      primarySource,
      failoverSource,
      reason,
      dataType,
      impactDuration: 0, // Will be updated when primary recovers
      dataLoss: false,
      automaticRecovery: true
    };

    this.failoverHistory.push(event);
    
    // Keep only last 1000 events
    if (this.failoverHistory.length > 1000) {
      this.failoverHistory = this.failoverHistory.slice(-1000);
    }

    // Track active failover
    this.activeFailovers.set(primarySource, failoverSource);
  }

  /**
   * Check for failback opportunities
   */
  private async checkFailback(originalSourceId: string, currentSourceId: string): Promise<void> {
    const originalHealth = this.healthStatus.get(originalSourceId);
    const currentHealth = this.healthStatus.get(currentSourceId);
    
    if (!originalHealth || !currentHealth) return;

    const strategy = this.strategies.get('priority')!; // Default strategy for failback
    
    if (strategy.canFailback(originalHealth, currentHealth)) {
      // Remove active failover
      this.activeFailovers.delete(originalSourceId);
      
      // Log failback event
      console.info(`Failback occurred: ${currentSourceId} -> ${originalSourceId}`);
    }
  }

  /**
   * Check and trigger alerts
   */
  private async checkAndTriggerAlerts(sourceId: string, error: Error): Promise<void> {
    const health = this.healthStatus.get(sourceId);
    if (!health) return;

    // Source down alert
    if (health.consecutiveFailures >= 5) {
      await this.triggerAlert({
        id: crypto.randomUUID(),
        sourceId,
        type: AlertType.SOURCE_DOWN,
        severity: 'critical',
        message: `Data source ${sourceId} is down (${health.consecutiveFailures} consecutive failures)`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { error: error.message }
      });
    }

    // High latency alert
    if (health.responseTime > 5000) {
      await this.triggerAlert({
        id: crypto.randomUUID(),
        sourceId,
        type: AlertType.HIGH_LATENCY,
        severity: 'warning',
        message: `High latency detected for source ${sourceId}: ${health.responseTime}ms`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { responseTime: health.responseTime }
      });
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(alert: DataSourceAlert): Promise<void> {
    // In production, this would send to alerting system
    console.warn(`ALERT: ${alert.type} - ${alert.message}`, alert);
  }

  /**
   * Get failover statistics
   */
  getFailoverStats() {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentEvents = this.failoverHistory.filter(e => 
      new Date(e.timestamp).getTime() > last24h
    );

    return {
      totalFailovers: this.failoverHistory.length,
      recentFailovers: recentEvents.length,
      activeFailovers: this.activeFailovers.size,
      sourceStats: this.getSourceStats(),
      averageFailoverTime: this.calculateAverageFailoverTime(recentEvents)
    };
  }

  /**
   * Get source statistics
   */
  private getSourceStats() {
    const stats = new Map();
    
    for (const [sourceId, health] of this.healthStatus) {
      stats.set(sourceId, {
        status: health.status,
        successRate: health.successRate,
        responseTime: health.responseTime,
        consecutiveFailures: health.consecutiveFailures,
        requestsToday: health.metrics.requestsToday,
        errorsToday: health.metrics.errorsToday
      });
    }
    
    return Object.fromEntries(stats);
  }

  /**
   * Calculate average failover time
   */
  private calculateAverageFailoverTime(events: FailoverEvent[]): number {
    if (events.length === 0) return 0;
    
    const totalTime = events.reduce((sum, event) => sum + event.impactDuration, 0);
    return totalTime / events.length;
  }

  /**
   * Register custom failover strategy
   */
  registerStrategy(name: string, strategy: FailoverStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Get all registered sources
   */
  getSources(): DataSourceConfig[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get health status for all sources
   */
  getHealthStatus(): DataSourceHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get failover history
   */
  getFailoverHistory(): FailoverEvent[] {
    return [...this.failoverHistory];
  }
}