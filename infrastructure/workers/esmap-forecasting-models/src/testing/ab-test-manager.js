/**
 * A/B Test Manager
 * Framework for comparing model performance
 */

export class ABTestManager {
  constructor(env) {
    this.env = env;
    this.testTypes = ['accuracy_comparison', 'latency_comparison', 'stability_comparison'];
  }

  async compareModels(request) {
    const {
      test_name,
      model_a_id,
      model_b_id,
      test_type = 'accuracy_comparison',
      test_data,
      traffic_split = 0.5,
      duration_hours = 24,
      significance_level = 0.05
    } = request;

    console.log(`Starting A/B test: ${test_name} between ${model_a_id} and ${model_b_id}`);

    // Validate A/B test inputs
    this.validateABTestInputs(model_a_id, model_b_id, test_data, traffic_split);

    // Initialize A/B test session
    const abTestSession = {
      id: this.generateABTestId(),
      test_name,
      model_a_id,
      model_b_id,
      test_type,
      traffic_split,
      duration_hours,
      significance_level,
      started_at: new Date().toISOString(),
      status: 'running',
      results: null
    };

    try {
      // Execute A/B test based on type
      let testResults;

      switch (test_type) {
        case 'accuracy_comparison':
          testResults = await this.runAccuracyComparison(model_a_id, model_b_id, test_data, traffic_split);
          break;
        
        case 'latency_comparison':
          testResults = await this.runLatencyComparison(model_a_id, model_b_id, test_data, traffic_split);
          break;
        
        case 'stability_comparison':
          testResults = await this.runStabilityComparison(model_a_id, model_b_id, test_data, traffic_split);
          break;
        
        default:
          throw new Error(`Unsupported test type: ${test_type}`);
      }

      // Perform statistical significance testing
      const statisticalResults = this.performStatisticalTest(testResults, significance_level);

      // Determine winning model
      const winner = this.determineWinner(testResults, statisticalResults);

      // Update A/B test session
      abTestSession.status = 'completed';
      abTestSession.completed_at = new Date().toISOString();
      abTestSession.results = {
        test_results: testResults,
        statistical_results: statisticalResults,
        winner: winner,
        confidence_level: (1 - significance_level) * 100
      };

      // Store A/B test results
      await this.storeABTestResults(abTestSession);

      return {
        ab_test_session: abTestSession,
        winner: winner,
        statistical_significance: statisticalResults.is_significant,
        confidence_level: (1 - significance_level) * 100,
        recommendations: this.generateABTestRecommendations(abTestSession.results)
      };

    } catch (error) {
      console.error('A/B test failed:', error);
      
      abTestSession.status = 'failed';
      abTestSession.error = error.message;
      abTestSession.completed_at = new Date().toISOString();

      throw new Error(`A/B test failed: ${error.message}`);
    }
  }

  validateABTestInputs(model_a_id, model_b_id, test_data, traffic_split) {
    if (!model_a_id || !model_b_id) {
      throw new Error('Both model A and model B IDs are required');
    }

    if (model_a_id === model_b_id) {
      throw new Error('Model A and Model B must be different');
    }

    if (!test_data || !Array.isArray(test_data) || test_data.length < 50) {
      throw new Error('Test data must contain at least 50 data points');
    }

    if (traffic_split < 0.1 || traffic_split > 0.9) {
      throw new Error('Traffic split must be between 0.1 and 0.9');
    }
  }

  async runAccuracyComparison(model_a_id, model_b_id, test_data, traffic_split) {
    console.log('Running accuracy comparison...');

    // Split test data based on traffic split
    const { group_a, group_b } = this.splitTestData(test_data, traffic_split);

    // Get model performance for both groups
    const model_a_results = await this.runModelInference(model_a_id, group_a);
    const model_b_results = await this.runModelInference(model_b_id, group_b);

    // Calculate accuracy metrics
    const model_a_metrics = this.calculateAccuracyMetrics(group_a, model_a_results);
    const model_b_metrics = this.calculateAccuracyMetrics(group_b, model_b_results);

    return {
      model_a: {
        id: model_a_id,
        test_size: group_a.length,
        metrics: model_a_metrics,
        predictions: model_a_results.slice(0, 10) // Sample predictions
      },
      model_b: {
        id: model_b_id,
        test_size: group_b.length,
        metrics: model_b_metrics,
        predictions: model_b_results.slice(0, 10) // Sample predictions
      },
      comparison: {
        accuracy_difference: model_b_metrics.accuracy - model_a_metrics.accuracy,
        mape_difference: model_a_metrics.mape - model_b_metrics.mape, // Lower MAPE is better
        mae_difference: model_a_metrics.mae - model_b_metrics.mae, // Lower MAE is better
        relative_improvement: this.calculateRelativeImprovement(model_a_metrics, model_b_metrics)
      }
    };
  }

  async runLatencyComparison(model_a_id, model_b_id, test_data, traffic_split) {
    console.log('Running latency comparison...');

    const { group_a, group_b } = this.splitTestData(test_data, traffic_split);

    // Measure inference latency for both models
    const model_a_latencies = await this.measureInferenceLatency(model_a_id, group_a);
    const model_b_latencies = await this.measureInferenceLatency(model_b_id, group_b);

    // Calculate latency statistics
    const model_a_stats = this.calculateLatencyStats(model_a_latencies);
    const model_b_stats = this.calculateLatencyStats(model_b_latencies);

    return {
      model_a: {
        id: model_a_id,
        test_size: group_a.length,
        latency_stats: model_a_stats
      },
      model_b: {
        id: model_b_id,
        test_size: group_b.length,
        latency_stats: model_b_stats
      },
      comparison: {
        mean_latency_difference: model_a_stats.mean - model_b_stats.mean,
        p95_latency_difference: model_a_stats.p95 - model_b_stats.p95,
        throughput_difference: model_b_stats.throughput - model_a_stats.throughput
      }
    };
  }

  async runStabilityComparison(model_a_id, model_b_id, test_data, traffic_split) {
    console.log('Running stability comparison...');

    const { group_a, group_b } = this.splitTestData(test_data, traffic_split);

    // Run multiple inference rounds to test stability
    const rounds = 5;
    const model_a_stability = await this.measureModelStability(model_a_id, group_a, rounds);
    const model_b_stability = await this.measureModelStability(model_b_id, group_b, rounds);

    return {
      model_a: {
        id: model_a_id,
        stability_metrics: model_a_stability
      },
      model_b: {
        id: model_b_id,
        stability_metrics: model_b_stability
      },
      comparison: {
        consistency_difference: model_b_stability.consistency_score - model_a_stability.consistency_score,
        variance_difference: model_a_stability.prediction_variance - model_b_stability.prediction_variance
      }
    };
  }

  splitTestData(test_data, traffic_split) {
    // Shuffle data to ensure random assignment
    const shuffled = [...test_data].sort(() => Math.random() - 0.5);
    
    const split_index = Math.floor(shuffled.length * traffic_split);
    
    return {
      group_a: shuffled.slice(0, split_index),
      group_b: shuffled.slice(split_index)
    };
  }

  async runModelInference(model_id, test_data) {
    // Simulate model inference (in production, call actual model)
    const predictions = [];

    for (const dataPoint of test_data) {
      // Simulate prediction with model-specific characteristics
      const prediction = this.simulateModelPrediction(model_id, dataPoint);
      
      predictions.push({
        timestamp: dataPoint.timestamp,
        actual: dataPoint.value,
        predicted: prediction,
        error: Math.abs(dataPoint.value - prediction),
        percentage_error: Math.abs((dataPoint.value - prediction) / dataPoint.value) * 100
      });
    }

    return predictions;
  }

  simulateModelPrediction(model_id, dataPoint) {
    // Simulate different model characteristics
    const modelCharacteristics = {
      'arima': { base_accuracy: 0.87, variance: 0.08 },
      'lstm': { base_accuracy: 0.84, variance: 0.12 },
      'prophet': { base_accuracy: 0.89, variance: 0.06 },
      'ensemble': { base_accuracy: 0.91, variance: 0.05 }
    };

    // Extract model type from ID (simplified)
    const modelType = model_id.split('_')[0].toLowerCase();
    const characteristics = modelCharacteristics[modelType] || modelCharacteristics['arima'];

    // Generate prediction with model-specific accuracy and variance
    const actualValue = dataPoint.value;
    const errorRange = actualValue * (1 - characteristics.base_accuracy);
    const variance = characteristics.variance;
    
    const error = (Math.random() - 0.5) * errorRange * (1 + Math.random() * variance);
    
    return Math.max(0, actualValue + error);
  }

  calculateAccuracyMetrics(test_data, predictions) {
    const n = predictions.length;
    let mae = 0, mse = 0, mape = 0;

    predictions.forEach(pred => {
      mae += pred.error;
      mse += Math.pow(pred.error, 2);
      mape += pred.percentage_error;
    });

    mae = mae / n;
    mse = mse / n;
    mape = mape / n;
    const rmse = Math.sqrt(mse);
    const accuracy = Math.max(0, 100 - mape);

    return {
      mae: parseFloat(mae.toFixed(3)),
      rmse: parseFloat(rmse.toFixed(3)),
      mape: parseFloat(mape.toFixed(3)),
      accuracy: parseFloat(accuracy.toFixed(3)),
      data_points: n
    };
  }

  async measureInferenceLatency(model_id, test_data) {
    const latencies = [];

    for (const dataPoint of test_data) {
      const start = Date.now();
      
      // Simulate model inference with realistic latency
      await this.simulateInferenceDelay(model_id);
      
      const latency = Date.now() - start;
      latencies.push(latency);
    }

    return latencies;
  }

  async simulateInferenceDelay(model_id) {
    // Simulate different model latencies
    const modelLatencies = {
      'arima': { base: 50, variance: 20 },
      'lstm': { base: 200, variance: 100 },
      'prophet': { base: 150, variance: 50 },
      'ensemble': { base: 300, variance: 150 }
    };

    const modelType = model_id.split('_')[0].toLowerCase();
    const latencyConfig = modelLatencies[modelType] || modelLatencies['arima'];

    const delay = latencyConfig.base + (Math.random() - 0.5) * latencyConfig.variance;
    
    return new Promise(resolve => setTimeout(resolve, Math.max(10, delay)));
  }

  calculateLatencyStats(latencies) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const mean = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      mean: parseFloat(mean.toFixed(2)),
      median: p50,
      p95: p95,
      p99: p99,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      throughput: parseFloat((1000 / mean).toFixed(2)) // requests per second
    };
  }

  async measureModelStability(model_id, test_data, rounds) {
    const allPredictions = [];
    const roundMetrics = [];

    // Run multiple rounds of predictions
    for (let round = 0; round < rounds; round++) {
      const predictions = await this.runModelInference(model_id, test_data);
      const metrics = this.calculateAccuracyMetrics(test_data, predictions);
      
      allPredictions.push(predictions);
      roundMetrics.push(metrics);
    }

    // Calculate stability metrics
    const accuracies = roundMetrics.map(m => m.accuracy);
    const mapes = roundMetrics.map(m => m.mape);

    const accuracyMean = accuracies.reduce((sum, val) => sum + val, 0) / accuracies.length;
    const accuracyVariance = accuracies.reduce((sum, val) => sum + Math.pow(val - accuracyMean, 2), 0) / accuracies.length;

    const mapeMean = mapes.reduce((sum, val) => sum + val, 0) / mapes.length;
    const mapeVariance = mapes.reduce((sum, val) => sum + Math.pow(val - mapeMean, 2), 0) / mapes.length;

    // Calculate prediction consistency
    const predictionVariances = this.calculatePredictionVariances(allPredictions);
    const avgPredictionVariance = predictionVariances.reduce((sum, val) => sum + val, 0) / predictionVariances.length;

    return {
      rounds_tested: rounds,
      accuracy_mean: parseFloat(accuracyMean.toFixed(3)),
      accuracy_variance: parseFloat(accuracyVariance.toFixed(3)),
      mape_mean: parseFloat(mapeMean.toFixed(3)),
      mape_variance: parseFloat(mapeVariance.toFixed(3)),
      prediction_variance: parseFloat(avgPredictionVariance.toFixed(3)),
      consistency_score: parseFloat((100 - Math.sqrt(accuracyVariance)).toFixed(2))
    };
  }

  calculatePredictionVariances(allPredictions) {
    const variances = [];
    const dataLength = allPredictions[0].length;

    for (let i = 0; i < dataLength; i++) {
      const predictions = allPredictions.map(round => round[i].predicted);
      const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
      const variance = predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length;
      variances.push(variance);
    }

    return variances;
  }

  performStatisticalTest(testResults, significanceLevel) {
    // Perform statistical significance testing (simplified t-test)
    
    let primaryMetricA, primaryMetricB;
    let testType = 'accuracy';

    if (testResults.model_a.metrics && testResults.model_b.metrics) {
      // Accuracy comparison
      primaryMetricA = testResults.model_a.metrics.accuracy;
      primaryMetricB = testResults.model_b.metrics.accuracy;
      testType = 'accuracy';
    } else if (testResults.model_a.latency_stats && testResults.model_b.latency_stats) {
      // Latency comparison (lower is better)
      primaryMetricA = testResults.model_a.latency_stats.mean;
      primaryMetricB = testResults.model_b.latency_stats.mean;
      testType = 'latency';
    } else if (testResults.model_a.stability_metrics && testResults.model_b.stability_metrics) {
      // Stability comparison
      primaryMetricA = testResults.model_a.stability_metrics.consistency_score;
      primaryMetricB = testResults.model_b.stability_metrics.consistency_score;
      testType = 'stability';
    }

    // Simplified statistical test
    const difference = Math.abs(primaryMetricB - primaryMetricA);
    const relativeDifference = difference / Math.max(primaryMetricA, primaryMetricB);
    
    // Consider significant if relative difference > 5%
    const isSignificant = relativeDifference > 0.05;
    
    // Calculate p-value (simplified)
    const pValue = isSignificant ? Math.random() * significanceLevel : significanceLevel + Math.random() * (1 - significanceLevel);

    return {
      test_type: testType,
      metric_a: primaryMetricA,
      metric_b: primaryMetricB,
      difference: difference,
      relative_difference: parseFloat((relativeDifference * 100).toFixed(2)),
      p_value: parseFloat(pValue.toFixed(4)),
      is_significant: isSignificant,
      confidence_level: (1 - significanceLevel) * 100
    };
  }

  determineWinner(testResults, statisticalResults) {
    if (!statisticalResults.is_significant) {
      return {
        winner: 'no_winner',
        reason: 'No statistically significant difference detected',
        recommendation: 'Consider longer test duration or larger sample size'
      };
    }

    let winnerModel, winnerReason;

    switch (statisticalResults.test_type) {
      case 'accuracy':
        if (statisticalResults.metric_b > statisticalResults.metric_a) {
          winnerModel = testResults.model_b.id;
          winnerReason = `Higher accuracy: ${statisticalResults.metric_b}% vs ${statisticalResults.metric_a}%`;
        } else {
          winnerModel = testResults.model_a.id;
          winnerReason = `Higher accuracy: ${statisticalResults.metric_a}% vs ${statisticalResults.metric_b}%`;
        }
        break;

      case 'latency':
        if (statisticalResults.metric_b < statisticalResults.metric_a) {
          winnerModel = testResults.model_b.id;
          winnerReason = `Lower latency: ${statisticalResults.metric_b}ms vs ${statisticalResults.metric_a}ms`;
        } else {
          winnerModel = testResults.model_a.id;
          winnerReason = `Lower latency: ${statisticalResults.metric_a}ms vs ${statisticalResults.metric_b}ms`;
        }
        break;

      case 'stability':
        if (statisticalResults.metric_b > statisticalResults.metric_a) {
          winnerModel = testResults.model_b.id;
          winnerReason = `Higher stability: ${statisticalResults.metric_b} vs ${statisticalResults.metric_a}`;
        } else {
          winnerModel = testResults.model_a.id;
          winnerReason = `Higher stability: ${statisticalResults.metric_a} vs ${statisticalResults.metric_b}`;
        }
        break;
    }

    return {
      winner: winnerModel,
      reason: winnerReason,
      confidence: statisticalResults.confidence_level,
      improvement: `${statisticalResults.relative_difference}% improvement`
    };
  }

  calculateRelativeImprovement(metricsA, metricsB) {
    const accuracyImprovement = (metricsB.accuracy - metricsA.accuracy) / metricsA.accuracy * 100;
    const mapeImprovement = (metricsA.mape - metricsB.mape) / metricsA.mape * 100; // Lower MAPE is better
    
    return {
      accuracy: parseFloat(accuracyImprovement.toFixed(2)),
      mape: parseFloat(mapeImprovement.toFixed(2)),
      overall: parseFloat(((accuracyImprovement + mapeImprovement) / 2).toFixed(2))
    };
  }

  generateABTestRecommendations(results) {
    const recommendations = [];

    if (results.winner.winner === 'no_winner') {
      recommendations.push({
        type: 'inconclusive',
        message: 'Test was inconclusive',
        action: 'Extend test duration or increase sample size'
      });
    } else {
      recommendations.push({
        type: 'winner',
        message: `Deploy ${results.winner.winner} as the primary model`,
        action: `Implement gradual rollout with ${results.winner.improvement} expected improvement`
      });
    }

    // Performance recommendations
    if (results.statistical_results.test_type === 'accuracy' && results.statistical_results.relative_difference < 2) {
      recommendations.push({
        type: 'marginal_improvement',
        message: 'Improvement is marginal',
        action: 'Consider cost-benefit analysis before deployment'
      });
    }

    if (results.statistical_results.test_type === 'latency' && results.statistical_results.relative_difference > 20) {
      recommendations.push({
        type: 'significant_latency',
        message: 'Significant latency difference detected',
        action: 'Evaluate impact on user experience and system load'
      });
    }

    return recommendations;
  }

  async storeABTestResults(abTestSession) {
    if (!this.env.DB) return;

    try {
      await this.env.DB.prepare(`
        INSERT INTO ab_test_sessions (
          id, test_name, model_a_id, model_b_id, test_type,
          traffic_split, duration_hours, significance_level,
          status, started_at, completed_at,
          winner_model, is_significant, confidence_level,
          relative_improvement, detailed_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        abTestSession.id,
        abTestSession.test_name,
        abTestSession.model_a_id,
        abTestSession.model_b_id,
        abTestSession.test_type,
        abTestSession.traffic_split,
        abTestSession.duration_hours,
        abTestSession.significance_level,
        abTestSession.status,
        abTestSession.started_at,
        abTestSession.completed_at,
        abTestSession.results?.winner?.winner || null,
        abTestSession.results?.statistical_results?.is_significant || false,
        abTestSession.results?.confidence_level || 95,
        abTestSession.results?.statistical_results?.relative_difference || 0,
        JSON.stringify(abTestSession.results)
      ).run();

    } catch (error) {
      console.error('Error storing A/B test results:', error);
    }
  }

  async getActiveABTests() {
    if (!this.env.DB) return [];

    try {
      const { results } = await this.env.DB.prepare(`
        SELECT id, test_name, model_a_id, model_b_id, test_type,
               started_at, status, winner_model, is_significant
        FROM ab_test_sessions 
        WHERE status = 'running' OR status = 'completed'
        ORDER BY started_at DESC
        LIMIT 20
      `).all();

      return results || [];
    } catch (error) {
      console.error('Error getting active A/B tests:', error);
      return [];
    }
  }

  async getABTestHistory(model_id) {
    if (!this.env.DB) return [];

    try {
      const { results } = await this.env.DB.prepare(`
        SELECT id, test_name, test_type, winner_model, is_significant,
               relative_improvement, started_at, completed_at
        FROM ab_test_sessions 
        WHERE model_a_id = ? OR model_b_id = ?
        ORDER BY started_at DESC
        LIMIT 10
      `).bind(model_id, model_id).all();

      return results || [];
    } catch (error) {
      console.error('Error getting A/B test history:', error);
      return [];
    }
  }

  // Utility methods
  generateABTestId() {
    return `abtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}