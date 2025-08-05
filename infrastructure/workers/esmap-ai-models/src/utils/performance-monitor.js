/**
 * Performance Monitor
 * Tracks and reports performance metrics for model inference
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
  }

  start(name) {
    this.timers.set(name, Date.now());
  }

  end(name) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return;
    }

    const duration = Date.now() - startTime;
    this.metrics.set(name, duration);
    this.timers.delete(name);

    // Track statistics
    this.updateStatistics(name, duration);
    
    return duration;
  }

  updateStatistics(name, duration) {
    const statsKey = `${name}_stats`;
    const stats = this.metrics.get(statsKey) || {
      count: 0,
      total: 0,
      min: Infinity,
      max: -Infinity,
      values: []
    };

    stats.count++;
    stats.total += duration;
    stats.min = Math.min(stats.min, duration);
    stats.max = Math.max(stats.max, duration);
    stats.values.push(duration);

    // Keep only last 100 values for percentile calculations
    if (stats.values.length > 100) {
      stats.values.shift();
    }

    this.metrics.set(statsKey, stats);
  }

  getMetrics() {
    const result = {
      timings: {},
      statistics: {}
    };

    for (const [key, value] of this.metrics.entries()) {
      if (key.endsWith('_stats')) {
        const metricName = key.replace('_stats', '');
        result.statistics[metricName] = {
          count: value.count,
          average: Math.round(value.total / value.count),
          min: value.min,
          max: value.max,
          p50: this.percentile(value.values, 0.5),
          p95: this.percentile(value.values, 0.95),
          p99: this.percentile(value.values, 0.99)
        };
      } else {
        result.timings[key] = value;
      }
    }

    return result;
  }

  percentile(values, p) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  reset() {
    this.metrics.clear();
    this.timers.clear();
  }

  // Utility method to measure async function execution
  async measure(name, fn) {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  // Get summary report
  getSummaryReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_operations: 0,
        average_latency_ms: 0,
        success_rate: 1.0
      },
      detailed_metrics: metrics
    };

    // Calculate summary statistics
    let totalOperations = 0;
    let totalLatency = 0;

    for (const [key, stats] of Object.entries(metrics.statistics)) {
      totalOperations += stats.count;
      totalLatency += stats.average * stats.count;
    }

    if (totalOperations > 0) {
      report.summary.total_operations = totalOperations;
      report.summary.average_latency_ms = Math.round(totalLatency / totalOperations);
    }

    return report;
  }
}