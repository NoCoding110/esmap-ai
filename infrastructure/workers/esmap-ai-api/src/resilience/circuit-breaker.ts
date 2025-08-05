/**
 * Circuit Breaker Implementation for Data Source Resilience
 * Implements the Circuit Breaker pattern to prevent cascade failures
 */

import { CircuitBreakerState, CircuitState, DataSourceHealth, HealthStatus } from './types';

export interface CircuitBreakerConfig {
  failureThreshold: number; // number of failures to open circuit
  successThreshold: number; // number of successes to close circuit from half-open
  timeout: number; // milliseconds to wait before trying half-open
  monitoringWindow: number; // milliseconds to track failures
  healthCheckInterval: number; // milliseconds between health checks
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private failureTimestamps: number[] = [];
  private lastHealthCheck: number = 0;

  constructor(
    sourceId: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      healthCheckInterval: 30000, // 30 seconds
      ...config
    };

    this.state = {
      sourceId,
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      halfOpenSuccessThreshold: this.config.successThreshold
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Check if circuit should transition states
    await this.checkStateTransitions(now);

    // If circuit is open, reject immediately
    if (this.state.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker is OPEN for source ${this.state.sourceId}. Next attempt at ${this.state.nextAttempt}`);
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private async onSuccess(): Promise<void> {
    if (this.state.state === CircuitState.HALF_OPEN) {
      this.state.successCount++;
      
      if (this.state.successCount >= this.config.successThreshold) {
        await this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.state.failureCount = 0;
      this.failureTimestamps = [];
    }
  }

  /**
   * Record a failed operation
   */
  private async onFailure(error: Error): Promise<void> {
    const now = Date.now();
    this.failureTimestamps.push(now);
    
    // Clean old failures outside monitoring window
    this.cleanOldFailures(now);
    
    this.state.failureCount = this.failureTimestamps.length;
    this.state.lastFailure = new Date(now).toISOString();

    if (this.state.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      await this.transitionTo(CircuitState.OPEN);
    } else if (this.state.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.state.failureCount >= this.config.failureThreshold) {
        await this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Check if state transitions are needed
   */
  private async checkStateTransitions(now: number): Promise<void> {
    if (this.state.state === CircuitState.OPEN && this.state.nextAttempt) {
      const nextAttemptTime = new Date(this.state.nextAttempt).getTime();
      if (now >= nextAttemptTime) {
        await this.transitionTo(CircuitState.HALF_OPEN);
      }
    }

    // Periodic health checks
    if (now - this.lastHealthCheck > this.config.healthCheckInterval) {
      this.lastHealthCheck = now;
      // Health check logic would go here
    }
  }

  /**
   * Transition circuit to a new state
   */
  private async transitionTo(newState: CircuitState): Promise<void> {
    const oldState = this.state.state;
    this.state.state = newState;

    switch (newState) {
      case CircuitState.OPEN:
        this.state.nextAttempt = new Date(Date.now() + this.config.timeout).toISOString();
        console.warn(`Circuit breaker OPENED for source ${this.state.sourceId}`);
        break;
      
      case CircuitState.HALF_OPEN:
        this.state.successCount = 0;
        this.state.nextAttempt = undefined;
        console.info(`Circuit breaker transitioning to HALF_OPEN for source ${this.state.sourceId}`);
        break;
      
      case CircuitState.CLOSED:
        this.state.failureCount = 0;
        this.state.successCount = 0;
        this.state.nextAttempt = undefined;
        this.failureTimestamps = [];
        console.info(`Circuit breaker CLOSED for source ${this.state.sourceId}`);
        break;
    }

    // Log state transition
    await this.logStateTransition(oldState, newState);
  }

  /**
   * Clean failures outside the monitoring window
   */
  private cleanOldFailures(now: number): void {
    const cutoff = now - this.config.monitoringWindow;
    this.failureTimestamps = this.failureTimestamps.filter(timestamp => timestamp > cutoff);
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    const now = Date.now();
    this.cleanOldFailures(now);
    
    return {
      sourceId: this.state.sourceId,
      state: this.state.state,
      failureCount: this.state.failureCount,
      successCount: this.state.successCount,
      failureRate: this.calculateFailureRate(),
      isHealthy: this.state.state === CircuitState.CLOSED,
      nextAttempt: this.state.nextAttempt,
      lastFailure: this.state.lastFailure
    };
  }

  /**
   * Force circuit to specific state (for testing/maintenance)
   */
  async forceState(state: CircuitState): Promise<void> {
    await this.transitionTo(state);
  }

  /**
   * Reset circuit breaker to initial state
   */
  async reset(): Promise<void> {
    this.failureTimestamps = [];
    await this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Calculate current failure rate
   */
  private calculateFailureRate(): number {
    if (this.failureTimestamps.length === 0) return 0;
    
    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow;
    const recentFailures = this.failureTimestamps.filter(t => t > windowStart);
    
    // Estimate total requests (this is simplified - in production you'd track this)
    const estimatedRequests = Math.max(recentFailures.length, 10);
    return recentFailures.length / estimatedRequests;
  }

  /**
   * Log state transition for monitoring
   */
  private async logStateTransition(oldState: CircuitState, newState: CircuitState): Promise<void> {
    // In production, this would send to logging/monitoring system
    console.log(`Circuit breaker state transition: ${this.state.sourceId} ${oldState} -> ${newState}`, {
      sourceId: this.state.sourceId,
      oldState,
      newState,
      failureCount: this.state.failureCount,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Circuit Breaker Manager for handling multiple data sources
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig?: Partial<CircuitBreakerConfig>) {
    this.defaultConfig = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringWindow: 300000,
      healthCheckInterval: 30000,
      ...defaultConfig
    };
  }

  /**
   * Get or create circuit breaker for a data source
   */
  getCircuitBreaker(sourceId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(sourceId)) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      this.circuitBreakers.set(sourceId, new CircuitBreaker(sourceId, circuitConfig));
    }
    return this.circuitBreakers.get(sourceId)!;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(sourceId: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(sourceId, config);
    return await circuitBreaker.execute(fn);
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getState());
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics() {
    const metrics = new Map();
    for (const [sourceId, circuitBreaker] of this.circuitBreakers) {
      metrics.set(sourceId, circuitBreaker.getMetrics());
    }
    return metrics;
  }

  /**
   * Get healthy data sources
   */
  getHealthySources(): string[] {
    return Array.from(this.circuitBreakers.entries())
      .filter(([_, cb]) => cb.getState().state === CircuitState.CLOSED)
      .map(([sourceId, _]) => sourceId);
  }

  /**
   * Get unhealthy data sources
   */
  getUnhealthySources(): string[] {
    return Array.from(this.circuitBreakers.entries())
      .filter(([_, cb]) => cb.getState().state !== CircuitState.CLOSED)
      .map(([sourceId, _]) => sourceId);
  }

  /**
   * Force all circuits to specific state
   */
  async forceAllStates(state: CircuitState): Promise<void> {
    const promises = Array.from(this.circuitBreakers.values()).map(cb => cb.forceState(state));
    await Promise.all(promises);
  }

  /**
   * Reset all circuit breakers
   */
  async resetAll(): Promise<void> {
    const promises = Array.from(this.circuitBreakers.values()).map(cb => cb.reset());
    await Promise.all(promises);
  }

  /**
   * Remove circuit breaker for a source
   */
  removeCircuitBreaker(sourceId: string): boolean {
    return this.circuitBreakers.delete(sourceId);
  }

  /**
   * Get circuit breaker summary statistics
   */
  getSummaryStats() {
    const all = Array.from(this.circuitBreakers.values());
    const healthy = all.filter(cb => cb.getState().state === CircuitState.CLOSED);
    const open = all.filter(cb => cb.getState().state === CircuitState.OPEN);
    const halfOpen = all.filter(cb => cb.getState().state === CircuitState.HALF_OPEN);

    return {
      total: all.length,
      healthy: healthy.length,
      open: open.length,
      halfOpen: halfOpen.length,
      healthyPercentage: all.length > 0 ? (healthy.length / all.length) * 100 : 100
    };
  }
}