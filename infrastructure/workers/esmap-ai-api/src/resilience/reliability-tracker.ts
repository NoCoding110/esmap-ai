/**
 * Data Source Reliability Tracking System
 * Comprehensive monitoring and analysis of data source performance and reliability
 */

import {
  DataSourceReliabilityMetrics,
  ReliabilityIncident,
  DataSourceHealth,
  DataSourceConfig,
  DataQualityAssessment,
  QualityIssue
} from './types';

export interface ReliabilityThresholds {
  uptimeMin: number; // minimum uptime percentage
  responseTimeMax: number; // maximum acceptable response time (ms)
  successRateMin: number; // minimum success rate percentage
  qualityScoreMin: number; // minimum data quality score
  consistencyScoreMin: number; // minimum consistency score
}

export interface ReliabilityAlert {
  sourceId: string;
  metric: string;
  current: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export class ReliabilityTracker {
  private metrics: Map<string, DataSourceReliabilityMetrics> = new Map();
  private incidents: Map<string, ReliabilityIncident[]> = new Map();
  private qualityHistory: Map<string, DataQualityAssessment[]> = new Map();
  private performanceHistory: Map<string, Array<{ timestamp: number; responseTime: number; success: boolean }>> = new Map();
  
  private readonly defaultThresholds: ReliabilityThresholds = {
    uptimeMin: 95.0, // 95%
    responseTimeMax: 2000, // 2 seconds
    successRateMin: 98.0, // 98%
    qualityScoreMin: 0.8, // 80%
    consistencyScoreMin: 0.85 // 85%
  };

  constructor(private thresholds: Partial<ReliabilityThresholds> = {}) {
    this.thresholds = { ...this.defaultThresholds, ...thresholds };
  }

  /**
   * Initialize tracking for a data source
   */
  initializeSource(sourceId: string, config: DataSourceConfig): void {
    this.metrics.set(sourceId, {
      sourceId,
      period: '24h',
      uptime: 100,
      averageResponseTime: 0,
      successRate: 100,
      dataQualityScore: config.metadata.quality.overall || 0.8,
      consistencyScore: 0.9,
      freshnessScore: config.metadata.quality.timeliness || 0.8,
      costEfficiency: 1.0,
      userSatisfactionScore: 0.8,
      incidents: []
    });

    this.incidents.set(sourceId, []);
    this.qualityHistory.set(sourceId, []);
    this.performanceHistory.set(sourceId, []);
  }

  /**
   * Record a successful request
   */
  recordSuccess(sourceId: string, responseTime: number, dataQuality?: DataQualityAssessment): void {
    const timestamp = Date.now();
    
    // Record performance data
    const perfHistory = this.performanceHistory.get(sourceId) || [];
    perfHistory.push({ timestamp, responseTime, success: true });
    
    // Keep only last 24 hours of data
    const cutoff = timestamp - (24 * 60 * 60 * 1000);
    const recentHistory = perfHistory.filter(p => p.timestamp > cutoff);
    this.performanceHistory.set(sourceId, recentHistory);

    // Record quality data if provided
    if (dataQuality) {
      const qualityHistory = this.qualityHistory.get(sourceId) || [];
      qualityHistory.push({ ...dataQuality, timestamp: new Date().toISOString() } as any);
      
      // Keep only last 100 quality assessments
      if (qualityHistory.length > 100) {
        qualityHistory.splice(0, qualityHistory.length - 100);
      }
      this.qualityHistory.set(sourceId, qualityHistory);
    }

    // Update metrics
    this.updateMetrics(sourceId);
  }

  /**
   * Record a failed request
   */
  recordFailure(sourceId: string, responseTime: number, error: string): void {
    const timestamp = Date.now();
    
    // Record performance data
    const perfHistory = this.performanceHistory.get(sourceId) || [];
    perfHistory.push({ timestamp, responseTime, success: false });
    
    // Keep only last 24 hours of data
    const cutoff = timestamp - (24 * 60 * 60 * 1000);
    const recentHistory = perfHistory.filter(p => p.timestamp > cutoff);
    this.performanceHistory.set(sourceId, recentHistory);

    // Check if this constitutes an incident
    this.checkForIncident(sourceId, error);

    // Update metrics
    this.updateMetrics(sourceId);
  }

  /**
   * Update reliability metrics for a source
   */
  private updateMetrics(sourceId: string): void {
    const perfHistory = this.performanceHistory.get(sourceId) || [];
    const qualityHistory = this.qualityHistory.get(sourceId) || [];
    
    if (perfHistory.length === 0) return;

    const metrics = this.metrics.get(sourceId);
    if (!metrics) return;

    // Calculate uptime
    const successCount = perfHistory.filter(p => p.success).length;
    metrics.uptime = (successCount / perfHistory.length) * 100;

    // Calculate average response time
    const totalResponseTime = perfHistory.reduce((sum, p) => sum + p.responseTime, 0);
    metrics.averageResponseTime = totalResponseTime / perfHistory.length;

    // Calculate success rate
    metrics.successRate = (successCount / perfHistory.length) * 100;

    // Calculate data quality score (average of recent assessments)
    if (qualityHistory.length > 0) {
      const recentQuality = qualityHistory.slice(-10); // Last 10 assessments
      metrics.dataQualityScore = recentQuality.reduce((sum, q) => sum + q.overall, 0) / recentQuality.length;
    }

    // Calculate consistency score
    metrics.consistencyScore = this.calculateConsistencyScore(perfHistory);

    // Calculate freshness score
    metrics.freshnessScore = this.calculateFreshnessScore(sourceId);

    // Calculate cost efficiency
    metrics.costEfficiency = this.calculateCostEfficiency(sourceId);

    // Update user satisfaction score based on performance
    metrics.userSatisfactionScore = this.calculateUserSatisfactionScore(metrics);

    // Update incidents reference
    metrics.incidents = this.incidents.get(sourceId) || [];

    // Update timestamp
    metrics.period = '24h'; // Could be made configurable
  }

  /**
   * Calculate consistency score based on response time variance
   */
  private calculateConsistencyScore(perfHistory: Array<{ timestamp: number; responseTime: number; success: boolean }>): number {
    if (perfHistory.length < 2) return 1.0;

    const responseTimes = perfHistory.filter(p => p.success).map(p => p.responseTime);
    if (responseTimes.length < 2) return 0.5;

    // Calculate coefficient of variation
    const mean = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    // Convert to score (lower variation = higher score)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Calculate freshness score based on data update frequency
   */
  private calculateFreshnessScore(sourceId: string): number {
    // This would integrate with actual data timestamps
    // For now, return a baseline score
    const metrics = this.metrics.get(sourceId);
    return metrics?.freshnessScore || 0.8;
  }

  /**
   * Calculate cost efficiency score
   */
  private calculateCostEfficiency(sourceId: string): number {
    // This would integrate with actual cost data
    // For now, return a baseline score based on performance
    const metrics = this.metrics.get(sourceId);
    if (!metrics) return 1.0;

    // Higher quality and uptime with lower response time = better efficiency
    const qualityFactor = metrics.dataQualityScore;
    const uptimeFactor = metrics.uptime / 100;
    const responseFactor = Math.max(0.1, 1 - (metrics.averageResponseTime / 5000)); // 5s max

    return (qualityFactor + uptimeFactor + responseFactor) / 3;
  }

  /**
   * Calculate user satisfaction score
   */
  private calculateUserSatisfactionScore(metrics: DataSourceReliabilityMetrics): number {
    // Weighted combination of key metrics
    const uptimeWeight = 0.3;
    const responseTimeWeight = 0.2;
    const qualityWeight = 0.3;
    const consistencyWeight = 0.2;

    const uptimeScore = metrics.uptime / 100;
    const responseTimeScore = Math.max(0, 1 - (metrics.averageResponseTime / 3000)); // 3s max
    const qualityScore = metrics.dataQualityScore;
    const consistencyScore = metrics.consistencyScore;

    return (
      uptimeScore * uptimeWeight +
      responseTimeScore * responseTimeWeight +
      qualityScore * qualityWeight +
      consistencyScore * consistencyWeight
    );
  }

  /**
   * Check for incidents based on recent failures
   */
  private checkForIncident(sourceId: string, error: string): void {
    const perfHistory = this.performanceHistory.get(sourceId) || [];
    const recentFailures = perfHistory.filter(p => !p.success && (Date.now() - p.timestamp) < 300000); // 5 minutes

    // Create incident if multiple recent failures
    if (recentFailures.length >= 3) {
      const incident: ReliabilityIncident = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'outage',
        severity: recentFailures.length >= 5 ? 'critical' : 'high',
        description: `Multiple failures detected: ${error}`,
        duration: 0, // Will be updated when resolved
        impact: `${recentFailures.length} failed requests in 5 minutes`,
        resolution: 'Pending investigation',
        preventionMeasures: []
      };

      const incidents = this.incidents.get(sourceId) || [];
      incidents.push(incident);
      this.incidents.set(sourceId, incidents);

      console.warn(`Incident created for source ${sourceId}:`, incident);
    }
  }

  /**
   * Assess data quality
   */
  assessDataQuality(sourceId: string, data: any): DataQualityAssessment {
    const assessment: DataQualityAssessment = {
      accuracy: this.assessAccuracy(data),
      completeness: this.assessCompleteness(data),
      consistency: this.assessConsistency(data),
      timeliness: this.assessTimeliness(data),
      validity: this.assessValidity(data),
      uniqueness: this.assessUniqueness(data),
      overall: 0,
      issues: []
    };

    // Calculate overall score (weighted average)
    const weights = {
      accuracy: 0.25,
      completeness: 0.20,
      consistency: 0.15,
      timeliness: 0.15,
      validity: 0.15,
      uniqueness: 0.10
    };

    assessment.overall = (
      assessment.accuracy * weights.accuracy +
      assessment.completeness * weights.completeness +
      assessment.consistency * weights.consistency +
      assessment.timeliness * weights.timeliness +
      assessment.validity * weights.validity +
      assessment.uniqueness * weights.uniqueness
    );

    // Record assessment
    this.recordSuccess(sourceId, 0, assessment);

    return assessment;
  }

  /**
   * Quality assessment methods
   */
  private assessAccuracy(data: any): number {
    // Implement accuracy checks based on data type and known patterns
    // This is a simplified implementation
    if (!data || typeof data !== 'object') return 0.5;
    
    // Check for realistic values in energy data
    let accuracyScore = 0.8; // baseline
    
    // Example checks for energy data
    if (data.energy_access_rate && (data.energy_access_rate < 0 || data.energy_access_rate > 100)) {
      accuracyScore -= 0.3;
    }
    
    return Math.max(0, Math.min(1, accuracyScore));
  }

  private assessCompleteness(data: any): number {
    if (!data || typeof data !== 'object') return 0;
    
    const totalFields = Object.keys(data).length;
    const completeFields = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
    
    return totalFields > 0 ? completeFields / totalFields : 0;
  }

  private assessConsistency(data: any): number {
    // Check internal consistency within the data
    // This is a simplified implementation
    return 0.85; // Placeholder
  }

  private assessTimeliness(data: any): number {
    if (!data.timestamp && !data.date && !data.updated_at) return 0.5;
    
    const timestamp = data.timestamp || data.date || data.updated_at;
    const dataTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageHours = (now - dataTime) / (1000 * 60 * 60);
    
    // Fresher data gets higher score
    if (ageHours <= 1) return 1.0;
    if (ageHours <= 24) return 0.9;
    if (ageHours <= 168) return 0.7; // 1 week
    if (ageHours <= 720) return 0.5; // 1 month
    return 0.3;
  }

  private assessValidity(data: any): number {
    // Check if data conforms to expected schema/format
    // This is a simplified implementation
    return 0.9; // Placeholder
  }

  private assessUniqueness(data: any): number {
    // Check for duplicate records
    // This would require comparing with historical data
    return 0.95; // Placeholder
  }

  /**
   * Generate reliability alerts
   */
  checkThresholds(sourceId: string): ReliabilityAlert[] {
    const metrics = this.metrics.get(sourceId);
    if (!metrics) return [];

    const alerts: ReliabilityAlert[] = [];

    // Check uptime
    if (metrics.uptime < this.thresholds.uptimeMin!) {
      alerts.push({
        sourceId,
        metric: 'uptime',
        current: metrics.uptime,
        threshold: this.thresholds.uptimeMin!,
        severity: metrics.uptime < 90 ? 'critical' : 'warning',
        message: `Source uptime ${metrics.uptime.toFixed(1)}% is below threshold ${this.thresholds.uptimeMin}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Check response time
    if (metrics.averageResponseTime > this.thresholds.responseTimeMax!) {
      alerts.push({
        sourceId,
        metric: 'response_time',
        current: metrics.averageResponseTime,
        threshold: this.thresholds.responseTimeMax!,
        severity: metrics.averageResponseTime > 5000 ? 'critical' : 'warning',
        message: `Average response time ${metrics.averageResponseTime.toFixed(0)}ms exceeds threshold ${this.thresholds.responseTimeMax}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Check success rate
    if (metrics.successRate < this.thresholds.successRateMin!) {
      alerts.push({
        sourceId,
        metric: 'success_rate',
        current: metrics.successRate,
        threshold: this.thresholds.successRateMin!,
        severity: metrics.successRate < 95 ? 'critical' : 'warning',
        message: `Success rate ${metrics.successRate.toFixed(1)}% is below threshold ${this.thresholds.successRateMin}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Check data quality
    if (metrics.dataQualityScore < this.thresholds.qualityScoreMin!) {
      alerts.push({
        sourceId,
        metric: 'data_quality',
        current: metrics.dataQualityScore,
        threshold: this.thresholds.qualityScoreMin!,
        severity: metrics.dataQualityScore < 0.6 ? 'critical' : 'warning',
        message: `Data quality score ${metrics.dataQualityScore.toFixed(2)} is below threshold ${this.thresholds.qualityScoreMin}`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Generate reliability report
   */
  generateReport(sourceId?: string): any {
    if (sourceId) {
      return this.generateSourceReport(sourceId);
    }

    // Generate summary report for all sources
    const allMetrics = Array.from(this.metrics.values());
    const totalSources = allMetrics.length;
    
    if (totalSources === 0) {
      return { message: 'No sources being tracked' };
    }

    const avgUptime = allMetrics.reduce((sum, m) => sum + m.uptime, 0) / totalSources;
    const avgResponseTime = allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / totalSources;
    const avgSuccessRate = allMetrics.reduce((sum, m) => sum + m.successRate, 0) / totalSources;
    const avgQualityScore = allMetrics.reduce((sum, m) => sum + m.dataQualityScore, 0) / totalSources;

    const healthySources = allMetrics.filter(m => 
      m.uptime >= this.thresholds.uptimeMin! &&
      m.successRate >= this.thresholds.successRateMin! &&
      m.dataQualityScore >= this.thresholds.qualityScoreMin!
    ).length;

    return {
      summary: {
        totalSources,
        healthySources,
        healthyPercentage: (healthySources / totalSources) * 100,
        averageUptime: avgUptime,
        averageResponseTime: avgResponseTime,
        averageSuccessRate: avgSuccessRate,
        averageQualityScore: avgQualityScore
      },
      sources: allMetrics.map(m => ({
        sourceId: m.sourceId,
        uptime: m.uptime,
        responseTime: m.averageResponseTime,
        successRate: m.successRate,
        qualityScore: m.dataQualityScore,
        incidentCount: m.incidents.length
      })),
      thresholds: this.thresholds
    };
  }

  /**
   * Generate detailed report for a specific source
   */
  private generateSourceReport(sourceId: string): any {
    const metrics = this.metrics.get(sourceId);
    const incidents = this.incidents.get(sourceId) || [];
    const qualityHistory = this.qualityHistory.get(sourceId) || [];
    const perfHistory = this.performanceHistory.get(sourceId) || [];

    if (!metrics) {
      return { error: `Source ${sourceId} not found` };
    }

    const alerts = this.checkThresholds(sourceId);
    
    return {
      sourceId,
      metrics,
      incidents: incidents.slice(-10), // Last 10 incidents
      qualityTrend: qualityHistory.slice(-20).map(q => ({
        timestamp: (q as any).timestamp,
        overall: q.overall,
        accuracy: q.accuracy,
        completeness: q.completeness
      })),
      performanceTrend: perfHistory.slice(-100).map(p => ({
        timestamp: p.timestamp,
        responseTime: p.responseTime,
        success: p.success
      })),
      alerts,
      recommendations: this.generateRecommendations(sourceId, metrics, alerts)
    };
  }

  /**
   * Generate recommendations for improving source reliability
   */
  private generateRecommendations(
    sourceId: string,
    metrics: DataSourceReliabilityMetrics,
    alerts: ReliabilityAlert[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.uptime < 95) {
      recommendations.push('Consider implementing retry logic with exponential backoff');
      recommendations.push('Investigate underlying infrastructure issues');
    }

    if (metrics.averageResponseTime > 2000) {
      recommendations.push('Optimize API endpoint performance');
      recommendations.push('Consider implementing caching layer');
      recommendations.push('Review network connectivity and routing');
    }

    if (metrics.dataQualityScore < 0.8) {
      recommendations.push('Implement additional data validation rules');
      recommendations.push('Consider alternative data sources for cross-validation');
    }

    if (metrics.consistencyScore < 0.8) {
      recommendations.push('Investigate data source stability');
      recommendations.push('Consider implementing data smoothing algorithms');
    }

    if (metrics.incidents.length > 5) {
      recommendations.push('Implement proactive monitoring and alerting');
      recommendations.push('Create incident response playbook');
    }

    return recommendations;
  }

  /**
   * Get metrics for a source
   */
  getMetrics(sourceId: string): DataSourceReliabilityMetrics | undefined {
    return this.metrics.get(sourceId);
  }

  /**
   * Get all tracked sources
   */
  getAllMetrics(): DataSourceReliabilityMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get incidents for a source
   */
  getIncidents(sourceId: string): ReliabilityIncident[] {
    return this.incidents.get(sourceId) || [];
  }

  /**
   * Clear old data
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;

    // Clean performance history
    for (const [sourceId, history] of this.performanceHistory) {
      const filtered = history.filter(p => p.timestamp > cutoff);
      this.performanceHistory.set(sourceId, filtered);
    }

    // Clean quality history (keep last 50 regardless of age)
    for (const [sourceId, history] of this.qualityHistory) {
      if (history.length > 50) {
        const recent = history.slice(-50);
        this.qualityHistory.set(sourceId, recent);
      }
    }

    // Clean old incidents
    for (const [sourceId, incidents] of this.incidents) {
      const filtered = incidents.filter(i => 
        new Date(i.timestamp).getTime() > cutoff
      );
      this.incidents.set(sourceId, filtered);
    }
  }
}