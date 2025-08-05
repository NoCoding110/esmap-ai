/**
 * Performance Monitor for Forecasting Models
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

    return duration;
  }

  getMetrics() {
    const result = {};
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    return {
      timings: result,
      total_operations: this.metrics.size
    };
  }

  reset() {
    this.metrics.clear();
    this.timers.clear();
  }
}