/**
 * Multi-Source Data Fusion Engine
 * Implements sophisticated algorithms for combining data from multiple sources with confidence scoring
 */

import {
  DataFusionRequest,
  DataFusionResult,
  DataSourceContribution,
  FusionAlgorithm,
  DataQualityAssessment,
  DataSourceConfig
} from './types';

export class DataFusionEngine {
  private algorithms: Map<string, FusionAlgorithm> = new Map();
  private sourceConfigs: Map<string, DataSourceConfig> = new Map();

  constructor() {
    this.initializeDefaultAlgorithms();
  }

  /**
   * Initialize default fusion algorithms
   */
  private initializeDefaultAlgorithms(): void {
    // Weighted Average Algorithm
    this.algorithms.set('weighted_average', {
      name: 'Weighted Average',
      description: 'Combines numerical data using weighted averages based on source reliability',
      applicableDataTypes: ['number', 'percentage', 'rate'],
      calculateConfidence: this.calculateWeightedConfidence.bind(this),
      fuseData: this.fuseByWeightedAverage.bind(this),
      validateResult: this.validateNumericalResult.bind(this)
    });

    // Majority Vote Algorithm
    this.algorithms.set('majority_vote', {
      name: 'Majority Vote',
      description: 'Selects the most common value across sources',
      applicableDataTypes: ['string', 'category', 'boolean'],
      calculateConfidence: this.calculateMajorityConfidence.bind(this),
      fuseData: this.fuseByMajorityVote.bind(this),
      validateResult: this.validateCategoricalResult.bind(this)
    });

    // Temporal Fusion Algorithm
    this.algorithms.set('temporal_fusion', {
      name: 'Temporal Fusion',
      description: 'Combines time-series data with recency weighting',
      applicableDataTypes: ['timeseries', 'temporal'],
      calculateConfidence: this.calculateTemporalConfidence.bind(this),
      fuseData: this.fuseByTemporalWeighting.bind(this),
      validateResult: this.validateTemporalResult.bind(this)
    });

    // Quality-Based Selection Algorithm
    this.algorithms.set('quality_selection', {
      name: 'Quality-Based Selection',
      description: 'Selects data from the highest quality source',
      applicableDataTypes: ['any'],
      calculateConfidence: this.calculateQualityConfidence.bind(this),
      fuseData: this.fuseByQualitySelection.bind(this),
      validateResult: this.validateGenericResult.bind(this)
    });

    // Ensemble Fusion Algorithm
    this.algorithms.set('ensemble', {
      name: 'Ensemble Fusion',
      description: 'Combines multiple fusion methods for optimal results',
      applicableDataTypes: ['any'],
      calculateConfidence: this.calculateEnsembleConfidence.bind(this),
      fuseData: this.fuseByEnsemble.bind(this),
      validateResult: this.validateEnsembleResult.bind(this)
    });
  }

  /**
   * Perform data fusion from multiple sources
   */
  async fuseData<T>(request: DataFusionRequest, contributions: DataSourceContribution[]): Promise<DataFusionResult<T>> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Filter contributions by success status
    const successfulContributions = contributions.filter(c => c.status === 'success');
    
    if (successfulContributions.length === 0) {
      throw new Error('No successful data contributions available for fusion');
    }

    // Select appropriate fusion algorithm
    const algorithm = this.selectFusionAlgorithm(request.dataType, successfulContributions);
    
    // Calculate weights for each contribution
    const weightedContributions = this.calculateWeights(successfulContributions);
    
    // Perform data fusion
    const fusedData = algorithm.fuseData(weightedContributions);
    
    // Calculate overall confidence
    const confidence = algorithm.calculateConfidence(weightedContributions);
    
    // Validate result
    const isValid = algorithm.validateResult(fusedData);
    if (!isValid) {
      throw new Error('Fusion result failed validation');
    }

    // Generate warnings
    const warnings = this.generateWarnings(weightedContributions, confidence, request);

    const processingTime = Date.now() - startTime;

    return {
      data: fusedData,
      confidence,
      sources: weightedContributions,
      fusionMethod: algorithm.name,
      processingTime,
      warnings,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        totalSources: contributions.length,
        successfulSources: successfulContributions.length,
        failedSources: contributions.length - successfulContributions.length
      }
    };
  }

  /**
   * Select the most appropriate fusion algorithm
   */
  private selectFusionAlgorithm(dataType: string, contributions: DataSourceContribution[]): FusionAlgorithm {
    // Check for numerical data
    if (['number', 'percentage', 'rate', 'metric'].includes(dataType)) {
      return this.algorithms.get('weighted_average')!;
    }
    
    // Check for categorical data
    if (['string', 'category', 'boolean', 'enum'].includes(dataType)) {
      return this.algorithms.get('majority_vote')!;
    }
    
    // Check for temporal data
    if (['timeseries', 'temporal', 'time_series'].includes(dataType)) {
      return this.algorithms.get('temporal_fusion')!;
    }
    
    // Default to quality-based selection
    return this.algorithms.get('quality_selection')!;
  }

  /**
   * Calculate weights for data source contributions
   */
  private calculateWeights(contributions: DataSourceContribution[]): DataSourceContribution[] {
    return contributions.map(contribution => {
      const sourceConfig = this.sourceConfigs.get(contribution.sourceId);
      
      // Base weight factors
      let weight = 1.0;
      
      // Source reliability weight (0.3 factor)
      if (sourceConfig?.metadata.quality.reliability) {
        weight *= 0.7 + (0.3 * sourceConfig.metadata.quality.reliability);
      }
      
      // Response time weight (0.2 factor) - faster responses get higher weight
      const maxResponseTime = 5000; // 5 seconds
      const responseTimeFactor = Math.max(0.1, 1 - (contribution.responseTime / maxResponseTime));
      weight *= 0.8 + (0.2 * responseTimeFactor);
      
      // Data freshness weight (0.2 factor)
      if (sourceConfig?.metadata.quality.timeliness) {
        weight *= 0.8 + (0.2 * sourceConfig.metadata.quality.timeliness);
      }
      
      // Source priority weight (0.3 factor) - lower priority number = higher weight
      if (sourceConfig?.priority) {
        const priorityWeight = Math.max(0.1, 1 / sourceConfig.priority);
        weight *= 0.7 + (0.3 * priorityWeight);
      }

      return {
        ...contribution,
        weight: Math.min(1.0, Math.max(0.1, weight)) // Clamp between 0.1 and 1.0
      };
    });
  }

  /**
   * Weighted Average Fusion Algorithm
   */
  private fuseByWeightedAverage(contributions: DataSourceContribution[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const contrib of contributions) {
      const value = typeof contrib.data === 'number' ? contrib.data : parseFloat(contrib.data);
      if (!isNaN(value)) {
        weightedSum += value * contrib.weight;
        totalWeight += contrib.weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Majority Vote Fusion Algorithm
   */
  private fuseByMajorityVote(contributions: DataSourceContribution[]): any {
    const votes = new Map<string, { count: number; totalWeight: number; value: any }>();

    for (const contrib of contributions) {
      const key = String(contrib.data);
      const existing = votes.get(key) || { count: 0, totalWeight: 0, value: contrib.data };
      existing.count += 1;
      existing.totalWeight += contrib.weight;
      votes.set(key, existing);
    }

    // Find the option with highest weighted votes
    let maxWeight = 0;
    let winner = null;
    
    for (const [key, vote] of votes) {
      if (vote.totalWeight > maxWeight) {
        maxWeight = vote.totalWeight;
        winner = vote.value;
      }
    }

    return winner;
  }

  /**
   * Temporal Fusion Algorithm
   */
  private fuseByTemporalWeighting(contributions: DataSourceContribution[]): any[] {
    // Sort by timestamp and apply recency weighting
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return contributions
      .map(contrib => {
        const data = Array.isArray(contrib.data) ? contrib.data : [contrib.data];
        return data.map(item => {
          const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : now;
          const age = now - timestamp;
          const recencyWeight = Math.max(0.1, 1 - (age / maxAge));
          
          return {
            ...item,
            weight: contrib.weight * recencyWeight,
            sourceId: contrib.sourceId
          };
        });
      })
      .flat()
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * Quality-Based Selection Algorithm
   */
  private fuseByQualitySelection(contributions: DataSourceContribution[]): any {
    // Select data from the source with highest quality score
    let bestContribution = contributions[0];
    let bestScore = this.calculateQualityScore(bestContribution);

    for (const contrib of contributions.slice(1)) {
      const score = this.calculateQualityScore(contrib);
      if (score > bestScore) {
        bestScore = score;
        bestContribution = contrib;
      }
    }

    return bestContribution.data;
  }

  /**
   * Ensemble Fusion Algorithm
   */
  private fuseByEnsemble(contributions: DataSourceContribution[]): any {
    // Combine results from multiple algorithms and take weighted average
    const algorithms = ['weighted_average', 'majority_vote', 'quality_selection'];
    const results: Array<{ result: any; confidence: number; weight: number }> = [];

    for (const algoName of algorithms) {
      try {
        const algorithm = this.algorithms.get(algoName);
        if (algorithm) {
          const result = algorithm.fuseData(contributions);
          const confidence = algorithm.calculateConfidence(contributions);
          results.push({ result, confidence, weight: confidence });
        }
      } catch (error) {
        // Algorithm not applicable, skip
      }
    }

    if (results.length === 0) {
      return contributions[0]?.data;
    }

    // For numerical results, use weighted average
    if (results.every(r => typeof r.result === 'number')) {
      let weightedSum = 0;
      let totalWeight = 0;
      
      for (const r of results) {
        weightedSum += r.result * r.weight;
        totalWeight += r.weight;
      }
      
      return totalWeight > 0 ? weightedSum / totalWeight : results[0].result;
    }

    // For non-numerical results, select highest confidence
    return results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    ).result;
  }

  /**
   * Calculate confidence scores for different algorithms
   */
  private calculateWeightedConfidence(contributions: DataSourceContribution[]): number {
    if (contributions.length === 0) return 0;
    
    const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
    const avgWeight = totalWeight / contributions.length;
    
    // Higher confidence with more sources and better weights
    const sourceCountFactor = Math.min(1, contributions.length / 3); // Max at 3 sources
    const weightFactor = avgWeight;
    const agreementFactor = this.calculateNumericalAgreement(contributions);
    
    return (sourceCountFactor * 0.3 + weightFactor * 0.4 + agreementFactor * 0.3);
  }

  private calculateMajorityConfidence(contributions: DataSourceContribution[]): number {
    if (contributions.length === 0) return 0;
    
    const votes = new Map<string, number>();
    let totalWeight = 0;
    
    for (const contrib of contributions) {
      const key = String(contrib.data);
      votes.set(key, (votes.get(key) || 0) + contrib.weight);
      totalWeight += contrib.weight;
    }
    
    const maxVotes = Math.max(...Array.from(votes.values()));
    return totalWeight > 0 ? maxVotes / totalWeight : 0;
  }

  private calculateTemporalConfidence(contributions: DataSourceContribution[]): number {
    if (contributions.length === 0) return 0;
    
    // Confidence based on data freshness and source count
    const avgWeight = contributions.reduce((sum, c) => sum + c.weight, 0) / contributions.length;
    const sourceCountFactor = Math.min(1, contributions.length / 5);
    
    return (avgWeight * 0.7 + sourceCountFactor * 0.3);
  }

  private calculateQualityConfidence(contributions: DataSourceContribution[]): number {
    if (contributions.length === 0) return 0;
    
    const bestContribution = contributions.reduce((best, current) => 
      this.calculateQualityScore(current) > this.calculateQualityScore(best) ? current : best
    );
    
    return this.calculateQualityScore(bestContribution);
  }

  private calculateEnsembleConfidence(contributions: DataSourceContribution[]): number {
    // Average confidence from multiple algorithms
    const confidences = [
      this.calculateWeightedConfidence(contributions),
      this.calculateMajorityConfidence(contributions),
      this.calculateQualityConfidence(contributions)
    ];
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Helper methods for validation
   */
  private validateNumericalResult(result: any): boolean {
    return typeof result === 'number' && !isNaN(result) && isFinite(result);
  }

  private validateCategoricalResult(result: any): boolean {
    return result !== null && result !== undefined;
  }

  private validateTemporalResult(result: any): boolean {
    return Array.isArray(result) && result.length > 0;
  }

  private validateGenericResult(result: any): boolean {
    return result !== null && result !== undefined;
  }

  private validateEnsembleResult(result: any): boolean {
    return result !== null && result !== undefined;
  }

  /**
   * Calculate quality score for a contribution
   */
  private calculateQualityScore(contribution: DataSourceContribution): number {
    const sourceConfig = this.sourceConfigs.get(contribution.sourceId);
    if (!sourceConfig) return contribution.confidence;
    
    const quality = sourceConfig.metadata.quality;
    return (quality.accuracy + quality.completeness + quality.timeliness + quality.reliability) / 4;
  }

  /**
   * Calculate agreement between numerical contributions
   */
  private calculateNumericalAgreement(contributions: DataSourceContribution[]): number {
    const values = contributions
      .map(c => typeof c.data === 'number' ? c.data : parseFloat(c.data))
      .filter(v => !isNaN(v));
    
    if (values.length < 2) return 1;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher agreement
    const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Generate warnings based on fusion results
   */
  private generateWarnings(
    contributions: DataSourceContribution[],
    confidence: number,
    request: DataFusionRequest
  ): string[] {
    const warnings: string[] = [];
    
    if (confidence < request.confidenceThreshold) {
      warnings.push(`Confidence score ${confidence.toFixed(3)} is below threshold ${request.confidenceThreshold}`);
    }
    
    if (contributions.length < 2) {
      warnings.push('Only one data source available, no fusion performed');
    }
    
    const avgResponseTime = contributions.reduce((sum, c) => sum + c.responseTime, 0) / contributions.length;
    if (avgResponseTime > 2000) {
      warnings.push(`High average response time: ${avgResponseTime.toFixed(0)}ms`);
    }
    
    const weightVariance = this.calculateWeightVariance(contributions);
    if (weightVariance > 0.3) {
      warnings.push('High variance in source weights, results may be skewed');
    }
    
    return warnings;
  }

  /**
   * Calculate variance in source weights
   */
  private calculateWeightVariance(contributions: DataSourceContribution[]): number {
    const weights = contributions.map(c => c.weight);
    const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
    return variance;
  }

  /**
   * Register a data source configuration
   */
  registerSource(config: DataSourceConfig): void {
    this.sourceConfigs.set(config.id, config);
  }

  /**
   * Register a custom fusion algorithm
   */
  registerAlgorithm(name: string, algorithm: FusionAlgorithm): void {
    this.algorithms.set(name, algorithm);
  }

  /**
   * Get available algorithms
   */
  getAvailableAlgorithms(): string[] {
    return Array.from(this.algorithms.keys());
  }

  /**
   * Get algorithm details
   */
  getAlgorithmInfo(name: string): FusionAlgorithm | undefined {
    return this.algorithms.get(name);
  }
}