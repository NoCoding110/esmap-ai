/**
 * ESMAP AI Model Serving and Caching Infrastructure
 * Task 3.3: Intelligent Model Serving with Advanced Caching, Load Balancing, and Monitoring
 * 
 * Features:
 * - Intelligent caching system for frequently requested predictions
 * - Load balancing across multiple model instances  
 * - Real-time monitoring and performance alerting
 * - Automatic scaling based on request volume
 * - Cost optimization through efficient resource usage
 */

// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

const CONFIG = {
  // Cache Configuration
  CACHE: {
    DEFAULT_TTL: 3600, // 1 hour default cache
    PREDICTION_TTL: 1800, // 30 minutes for predictions
    MODEL_METADATA_TTL: 86400, // 24 hours for model metadata
    MAX_CACHE_SIZE: 10000, // Maximum cached items
    CACHE_KEY_PREFIX: 'esmap_model_cache',
    INTELLIGENT_TTL: true // Dynamically adjust TTL based on request patterns
  },
  
  // Load Balancing Configuration
  LOAD_BALANCER: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
    CIRCUIT_BREAKER_THRESHOLD: 5, // failures before circuit break
    CIRCUIT_BREAKER_TIMEOUT: 60000, // 1 minute circuit breaker timeout
    WEIGHTED_ROUTING: true
  },
  
  // Performance Monitoring
  MONITORING: {
    ALERT_THRESHOLD_LATENCY: 5000, // 5 seconds
    ALERT_THRESHOLD_ERROR_RATE: 0.05, // 5% error rate
    METRICS_RETENTION: 86400, // 24 hours
    PERFORMANCE_WINDOW: 300000, // 5 minutes rolling window
    AUTO_SCALE_THRESHOLD: 100 // requests per minute trigger
  },
  
  // Cost Optimization
  COST_OPTIMIZATION: {
    ENABLE_INTELLIGENT_BATCHING: true,
    BATCH_SIZE: 10,
    BATCH_TIMEOUT: 1000, // ms
    ENABLE_MODEL_COMPRESSION: true,
    ENABLE_RESULT_COMPRESSION: true
  }
};

// Model Instance Pool with Health Status
const MODEL_INSTANCES = [
  {
    id: 'primary-us-east',
    endpoint: 'https://esmap-ai-models.metabilityllc1.workers.dev',
    region: 'us-east',
    weight: 100,
    healthy: true,
    lastHealthCheck: Date.now(),
    responseTime: 0,
    errorCount: 0,
    requestCount: 0
  },
  {
    id: 'secondary-us-west', 
    endpoint: 'https://esmap-forecasting-models.metabilityllc1.workers.dev',
    region: 'us-west',
    weight: 80,
    healthy: true,
    lastHealthCheck: Date.now(),
    responseTime: 0,
    errorCount: 0,
    requestCount: 0
  }
  // Additional instances can be added dynamically
];

// Global Performance Metrics
const PERFORMANCE_METRICS = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalLatency: 0,
  errorCount: 0,
  lastResetTime: Date.now(),
  requestsPerMinute: [],
  averageResponseTime: 0
};

// ============================================================================
// INTELLIGENT CACHING SYSTEM
// ============================================================================

class IntelligentCache {
  constructor() {
    this.cache = new Map();
    this.accessPatterns = new Map();
    this.hitRates = new Map();
  }

  // Generate intelligent cache key with context
  generateCacheKey(modelType, input, parameters = {}) {
    const contextHash = this.hashObject({
      modelType,
      input: typeof input === 'string' ? input.substring(0, 200) : JSON.stringify(input).substring(0, 200),
      parameters: JSON.stringify(parameters)
    });
    
    return `${CONFIG.CACHE.CACHE_KEY_PREFIX}:${modelType}:${contextHash}`;
  }

  // Hash function for cache keys
  hashObject(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Intelligent TTL calculation based on access patterns
  calculateIntelligentTTL(cacheKey, baseInput) {
    if (!CONFIG.CACHE.INTELLIGENT_TTL) {
      return CONFIG.CACHE.PREDICTION_TTL;
    }

    const accessPattern = this.accessPatterns.get(cacheKey) || { count: 0, lastAccess: Date.now() };
    const hitRate = this.hitRates.get(cacheKey) || 0;
    
    // Increase TTL for frequently accessed items
    let ttlMultiplier = 1;
    if (accessPattern.count > 10) ttlMultiplier += 0.5;
    if (accessPattern.count > 50) ttlMultiplier += 1;
    if (hitRate > 0.8) ttlMultiplier += 0.5;
    
    // Decrease TTL for time-sensitive data
    if (this.isTimeSensitive(baseInput)) {
      ttlMultiplier *= 0.5;
    }
    
    return Math.min(CONFIG.CACHE.PREDICTION_TTL * ttlMultiplier, CONFIG.CACHE.DEFAULT_TTL * 2);
  }

  // Check if input data is time-sensitive
  isTimeSensitive(input) {
    const timeSensitiveKeywords = ['realtime', 'current', 'latest', 'today', 'now'];
    const inputStr = JSON.stringify(input).toLowerCase();
    return timeSensitiveKeywords.some(keyword => inputStr.includes(keyword));
  }

  // Get cached result
  async get(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      // Update access pattern
      const accessPattern = this.accessPatterns.get(cacheKey) || { count: 0, lastAccess: 0 };
      accessPattern.count++;
      accessPattern.lastAccess = Date.now();
      this.accessPatterns.set(cacheKey, accessPattern);
      
      PERFORMANCE_METRICS.cacheHits++;
      return cached.data;
    }
    
    // Remove expired cache
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    PERFORMANCE_METRICS.cacheMisses++;
    return null;
  }

  // Set cached result with intelligent TTL
  async set(cacheKey, data, baseInput) {
    const ttl = this.calculateIntelligentTTL(cacheKey, baseInput);
    const expiresAt = Date.now() + (ttl * 1000);
    
    // Implement cache size limit
    if (this.cache.size >= CONFIG.CACHE.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }
    
    this.cache.set(cacheKey, {
      data,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    // Update hit rate
    const currentHitRate = this.hitRates.get(cacheKey) || 0;
    this.hitRates.set(cacheKey, Math.min(currentHitRate + 0.1, 1));
  }

  // Evict least recently used cache entries
  evictLeastUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.createdAt < oldestTime) {
        oldestTime = value.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessPatterns.delete(oldestKey);
      this.hitRates.delete(oldestKey);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      hitRate: PERFORMANCE_METRICS.cacheHits / (PERFORMANCE_METRICS.cacheHits + PERFORMANCE_METRICS.cacheMisses) || 0,
      totalHits: PERFORMANCE_METRICS.cacheHits,
      totalMisses: PERFORMANCE_METRICS.cacheMisses
    };
  }
}

// ============================================================================
// LOAD BALANCER WITH HEALTH MONITORING
// ============================================================================

class IntelligentLoadBalancer {
  constructor() {
    this.circuitBreakers = new Map();
    this.healthCheckInterval = null;
    this.startHealthChecking();
  }

  // Start periodic health checking (disabled in Cloudflare Workers due to global scope restrictions)
  startHealthChecking() {
    // Health checks will be triggered by cron or manual requests
    // Cloudflare Workers don't allow setInterval in global scope
  }

  // Perform health checks on all instances
  async performHealthChecks() {
    const healthCheckPromises = MODEL_INSTANCES.map(async (instance) => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${instance.endpoint}/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          instance.healthy = true;
          instance.responseTime = responseTime;
          instance.lastHealthCheck = Date.now();
          this.resetCircuitBreaker(instance.id);
        } else {
          this.markInstanceUnhealthy(instance);
        }
      } catch (error) {
        this.markInstanceUnhealthy(instance);
      }
    });
    
    await Promise.all(healthCheckPromises);
  }

  // Mark instance as unhealthy
  markInstanceUnhealthy(instance) {
    instance.healthy = false;
    instance.errorCount++;
    instance.lastHealthCheck = Date.now();
    
    // Trigger circuit breaker if error threshold exceeded
    if (instance.errorCount >= CONFIG.LOAD_BALANCER.CIRCUIT_BREAKER_THRESHOLD) {
      this.triggerCircuitBreaker(instance.id);
    }
  }

  // Circuit breaker management
  triggerCircuitBreaker(instanceId) {
    this.circuitBreakers.set(instanceId, {
      triggered: true,
      triggerTime: Date.now(),
      timeout: CONFIG.LOAD_BALANCER.CIRCUIT_BREAKER_TIMEOUT
    });
  }

  resetCircuitBreaker(instanceId) {
    this.circuitBreakers.delete(instanceId);
  }

  isCircuitBreakerOpen(instanceId) {
    const breaker = this.circuitBreakers.get(instanceId);
    if (!breaker) return false;
    
    if (Date.now() - breaker.triggerTime > breaker.timeout) {
      this.resetCircuitBreaker(instanceId);
      return false;
    }
    
    return breaker.triggered;
  }

  // Weighted round-robin selection with health awareness
  selectHealthyInstance() {
    const healthyInstances = MODEL_INSTANCES.filter(instance => 
      instance.healthy && !this.isCircuitBreakerOpen(instance.id)
    );
    
    if (healthyInstances.length === 0) {
      throw new Error('No healthy model instances available');
    }
    
    if (!CONFIG.LOAD_BALANCER.WEIGHTED_ROUTING) {
      return healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
    }
    
    // Weighted selection based on performance and weight
    const weightedInstances = healthyInstances.map(instance => ({
      ...instance,
      effectiveWeight: this.calculateEffectiveWeight(instance)
    }));
    
    const totalWeight = weightedInstances.reduce((sum, instance) => sum + instance.effectiveWeight, 0);
    let random = Math.random() * totalWeight;
    
    for (const instance of weightedInstances) {
      random -= instance.effectiveWeight;
      if (random <= 0) {
        return instance;
      }
    }
    
    return weightedInstances[0]; // Fallback
  }

  // Calculate effective weight based on performance metrics
  calculateEffectiveWeight(instance) {
    let effectiveWeight = instance.weight;
    
    // Reduce weight for slow responses
    if (instance.responseTime > 2000) {
      effectiveWeight *= 0.8;
    } else if (instance.responseTime > 1000) {
      effectiveWeight *= 0.9;
    }
    
    // Reduce weight for high error rates
    const errorRate = instance.errorCount / (instance.requestCount || 1);
    if (errorRate > 0.1) {
      effectiveWeight *= 0.5;
    } else if (errorRate > 0.05) {
      effectiveWeight *= 0.7;
    }
    
    return Math.max(effectiveWeight, instance.weight * 0.1); // Minimum 10% of original weight
  }

  // Make request with automatic retry and failover
  async makeRequest(path, options = {}) {
    let lastError = null;
    
    for (let attempt = 0; attempt < CONFIG.LOAD_BALANCER.MAX_RETRIES; attempt++) {
      try {
        const instance = this.selectHealthyInstance();
        const startTime = Date.now();
        
        const response = await fetch(`${instance.endpoint}${path}`, {
          ...options,
          timeout: 30000 // 30 second timeout
        });
        
        const responseTime = Date.now() - startTime;
        
        // Update instance metrics
        instance.requestCount++;
        instance.responseTime = (instance.responseTime + responseTime) / 2; // Moving average
        
        if (response.ok) {
          return response;
        } else {
          instance.errorCount++;
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        lastError = error;
        
        if (attempt < CONFIG.LOAD_BALANCER.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.LOAD_BALANCER.RETRY_DELAY));
        }
      }
    }
    
    throw lastError || new Error('All model instances failed');
  }

  // Get load balancer statistics
  getStats() {
    return {
      instances: MODEL_INSTANCES.map(instance => ({
        id: instance.id,
        healthy: instance.healthy,
        responseTime: instance.responseTime,
        errorRate: instance.errorCount / (instance.requestCount || 1),
        requestCount: instance.requestCount,
        weight: instance.weight,
        effectiveWeight: this.calculateEffectiveWeight(instance)
      })),
      circuitBreakers: Array.from(this.circuitBreakers.entries())
    };
  }
}

// ============================================================================
// PERFORMANCE MONITORING AND ALERTING
// ============================================================================

class PerformanceMonitor {
  constructor() {
    this.metricsHistory = [];
    this.alertCallbacks = [];
    this.startMonitoring();
  }

  // Start performance monitoring (disabled in Cloudflare Workers due to global scope restrictions)
  startMonitoring() {
    // Metrics collection will be triggered by requests or cron
    // Cloudflare Workers don't allow setInterval in global scope
  }

  // Collect performance metrics
  collectMetrics() {
    const now = Date.now();
    const windowStart = now - CONFIG.MONITORING.PERFORMANCE_WINDOW;
    
    // Calculate current metrics
    const currentMetrics = {
      timestamp: now,
      totalRequests: PERFORMANCE_METRICS.totalRequests,
      cacheHitRate: PERFORMANCE_METRICS.cacheHits / (PERFORMANCE_METRICS.cacheHits + PERFORMANCE_METRICS.cacheMisses) || 0,
      averageResponseTime: PERFORMANCE_METRICS.averageResponseTime,
      errorRate: PERFORMANCE_METRICS.errorCount / PERFORMANCE_METRICS.totalRequests || 0,
      requestsPerMinute: this.calculateRequestsPerMinute()
    };
    
    this.metricsHistory.push(currentMetrics);
    
    // Keep only recent history
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > windowStart);
  }

  // Calculate requests per minute
  calculateRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = PERFORMANCE_METRICS.requestsPerMinute.filter(timestamp => timestamp > oneMinuteAgo);
    return recentRequests.length;
  }

  // Check for performance alerts
  checkAlerts() {
    if (this.metricsHistory.length === 0) return;
    
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    
    // Check latency alert
    if (latest.averageResponseTime > CONFIG.MONITORING.ALERT_THRESHOLD_LATENCY) {
      this.triggerAlert('HIGH_LATENCY', {
        current: latest.averageResponseTime,
        threshold: CONFIG.MONITORING.ALERT_THRESHOLD_LATENCY
      });
    }
    
    // Check error rate alert
    if (latest.errorRate > CONFIG.MONITORING.ALERT_THRESHOLD_ERROR_RATE) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        current: latest.errorRate,
        threshold: CONFIG.MONITORING.ALERT_THRESHOLD_ERROR_RATE
      });
    }
    
    // Check scaling alert
    if (latest.requestsPerMinute > CONFIG.MONITORING.AUTO_SCALE_THRESHOLD) {
      this.triggerAlert('HIGH_LOAD', {
        current: latest.requestsPerMinute,
        threshold: CONFIG.MONITORING.AUTO_SCALE_THRESHOLD
      });
    }
  }

  // Trigger performance alert
  triggerAlert(alertType, data) {
    const alert = {
      type: alertType,
      timestamp: Date.now(),
      data,
      severity: this.calculateAlertSeverity(alertType, data)
    };
    
    // Call registered alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback failed:', error);
      }
    });
  }

  // Calculate alert severity
  calculateAlertSeverity(alertType, data) {
    switch (alertType) {
      case 'HIGH_LATENCY':
        return data.current > data.threshold * 2 ? 'CRITICAL' : 'WARNING';
      case 'HIGH_ERROR_RATE':
        return data.current > data.threshold * 2 ? 'CRITICAL' : 'WARNING';
      case 'HIGH_LOAD':
        return data.current > data.threshold * 1.5 ? 'CRITICAL' : 'WARNING';
      default:
        return 'INFO';
    }
  }

  // Register alert callback
  onAlert(callback) {
    this.alertCallbacks.push(callback);
  }

  // Get performance statistics
  getStats() {
    return {
      current: this.metricsHistory[this.metricsHistory.length - 1] || {},
      history: this.metricsHistory,
      alerts: this.alertCallbacks.length
    };
  }
}

// ============================================================================
// AUTO SCALING SYSTEM
// ============================================================================

class AutoScaler {
  constructor(loadBalancer, monitor) {
    this.loadBalancer = loadBalancer;
    this.monitor = monitor;
    this.scalingHistory = [];
    this.setupScaling();
  }

  // Setup auto scaling
  setupScaling() {
    this.monitor.onAlert((alert) => {
      if (alert.type === 'HIGH_LOAD' && alert.severity === 'CRITICAL') {
        this.scaleUp();
      }
    });
  }

  // Scale up by adding more model instances
  async scaleUp() {
    const scaleEvent = {
      timestamp: Date.now(),
      action: 'SCALE_UP',
      reason: 'HIGH_LOAD_DETECTED',
      beforeInstances: MODEL_INSTANCES.length
    };

    try {
      // Add additional model instances (would integrate with actual deployment)
      const newInstance = {
        id: `auto-scaled-${Date.now()}`,
        endpoint: 'https://esmap-ai-models.metabilityllc1.workers.dev', // Could be different endpoint
        region: 'auto-scaled',
        weight: 50,
        healthy: true,
        lastHealthCheck: Date.now(),
        responseTime: 0,
        errorCount: 0,
        requestCount: 0
      };

      MODEL_INSTANCES.push(newInstance);
      
      scaleEvent.afterInstances = MODEL_INSTANCES.length;
      scaleEvent.success = true;
      
    } catch (error) {
      scaleEvent.success = false;
      scaleEvent.error = error.message;
    }

    this.scalingHistory.push(scaleEvent);
  }

  // Scale down when load decreases
  async scaleDown() {
    if (MODEL_INSTANCES.length <= 2) return; // Keep minimum instances

    const scaleEvent = {
      timestamp: Date.now(),
      action: 'SCALE_DOWN',
      reason: 'LOW_LOAD_DETECTED',
      beforeInstances: MODEL_INSTANCES.length
    };

    try {
      // Remove auto-scaled instances first
      const autoScaledIndex = MODEL_INSTANCES.findIndex(instance => instance.id.startsWith('auto-scaled-'));
      if (autoScaledIndex !== -1) {
        MODEL_INSTANCES.splice(autoScaledIndex, 1);
      }
      
      scaleEvent.afterInstances = MODEL_INSTANCES.length;
      scaleEvent.success = true;
      
    } catch (error) {
      scaleEvent.success = false;
      scaleEvent.error = error.message;
    }

    this.scalingHistory.push(scaleEvent);
  }

  // Get scaling statistics
  getStats() {
    return {
      currentInstances: MODEL_INSTANCES.length,
      scalingHistory: this.scalingHistory.slice(-10), // Last 10 scaling events
      canScaleUp: true,
      canScaleDown: MODEL_INSTANCES.length > 2
    };
  }
}

// ============================================================================
// COST OPTIMIZATION ENGINE
// ============================================================================

class CostOptimizer {
  constructor() {
    this.batchQueue = [];
    this.batchProcessor = null;
    this.costMetrics = {
      totalRequests: 0,
      batchedRequests: 0,
      compressionSavings: 0,
      cacheHitSavings: 0
    };
    
    if (CONFIG.COST_OPTIMIZATION.ENABLE_INTELLIGENT_BATCHING) {
      this.startBatchProcessing();
    }
  }

  // Start batch processing for cost optimization (disabled in Cloudflare Workers due to global scope restrictions)
  startBatchProcessing() {
    // Batch processing will be triggered by request volume or manual triggers
    // Cloudflare Workers don't allow setInterval in global scope
  }

  // Add request to batch queue
  addToBatch(request) {
    if (!CONFIG.COST_OPTIMIZATION.ENABLE_INTELLIGENT_BATCHING) {
      return false; // Batching disabled
    }

    this.batchQueue.push({
      ...request,
      timestamp: Date.now()
    });

    // Process immediately if batch is full
    if (this.batchQueue.length >= CONFIG.COST_OPTIMIZATION.BATCH_SIZE) {
      this.processBatch();
      return true;
    }

    return true; // Added to batch
  }

  // Process batch of requests
  async processBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, CONFIG.COST_OPTIMIZATION.BATCH_SIZE);
    
    try {
      // Group similar requests for efficiency
      const groupedRequests = this.groupSimilarRequests(batch);
      
      for (const group of groupedRequests) {
        await this.processBatchGroup(group);
      }
      
      this.costMetrics.batchedRequests += batch.length;
      
    } catch (error) {
      // Handle batch processing errors
      console.error('Batch processing failed:', error);
      
      // Process requests individually as fallback
      for (const request of batch) {
        try {
          await this.processSingleRequest(request);
        } catch (singleError) {
          console.error('Single request fallback failed:', singleError);
        }
      }
    }
  }

  // Group similar requests for batch processing
  groupSimilarRequests(requests) {
    const groups = new Map();
    
    for (const request of requests) {
      const groupKey = `${request.modelType}_${request.parameters?.temperature || 'default'}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey).push(request);
    }
    
    return Array.from(groups.values());
  }

  // Process a group of similar requests
  async processBatchGroup(group) {
    // Implementation would depend on specific model API capabilities
    // For now, process individually but with shared configuration
    const promises = group.map(request => this.processSingleRequest(request));
    await Promise.all(promises);
  }

  // Process single request
  async processSingleRequest(request) {
    // Placeholder for individual request processing
    this.costMetrics.totalRequests++;
  }

  // Compress response data
  compressResponse(data) {
    if (!CONFIG.COST_OPTIMIZATION.ENABLE_RESULT_COMPRESSION) {
      return data;
    }

    const originalSize = JSON.stringify(data).length;
    
    // Simple compression strategy (in real implementation, use actual compression)
    const compressed = {
      compressed: true,
      data: data,
      originalSize: originalSize
    };
    
    const compressedSize = JSON.stringify(compressed).length;
    this.costMetrics.compressionSavings += (originalSize - compressedSize);
    
    return compressed;
  }

  // Get cost optimization statistics
  getStats() {
    return {
      ...this.costMetrics,
      batchQueueSize: this.batchQueue.length,
      batchingEnabled: CONFIG.COST_OPTIMIZATION.ENABLE_INTELLIGENT_BATCHING,
      compressionEnabled: CONFIG.COST_OPTIMIZATION.ENABLE_RESULT_COMPRESSION,
      averageBatchSize: this.costMetrics.batchedRequests / Math.max(this.costMetrics.totalRequests, 1)
    };
  }
}

// ============================================================================
// DURABLE OBJECTS FOR STATE MANAGEMENT
// ============================================================================

// Performance Monitor Durable Object
export class PerformanceMonitorDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request) {
    return new Response('Performance Monitor DO');
  }
}

// Load Balancer State Durable Object
export class LoadBalancerStateDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request) {
    return new Response('Load Balancer State DO');
  }
}

// ============================================================================
// MAIN MODEL SERVING HANDLER
// ============================================================================

// Global components (initialized lazily)
let cache = null;
let loadBalancer = null;
let monitor = null;
let autoScaler = null;
let costOptimizer = null;

// Initialize components lazily
function initializeComponents() {
  if (!cache) {
    cache = new IntelligentCache();
    loadBalancer = new IntelligentLoadBalancer();
    monitor = new PerformanceMonitor();
    autoScaler = new AutoScaler(loadBalancer, monitor);
    costOptimizer = new CostOptimizer();
  }
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    // Initialize components on first request
    initializeComponents();
    const startTime = Date.now();
    PERFORMANCE_METRICS.totalRequests++;
    PERFORMANCE_METRICS.requestsPerMinute.push(startTime);
    
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Handle different endpoints
      switch (path) {
        case '/predict':
          return await handlePrediction(request);
        case '/health':
          return handleHealthCheck();
        case '/metrics':
          return handleMetrics();
        case '/admin/cache':
          return handleCacheAdmin(request);
        case '/admin/scaling':
          return handleScalingAdmin(request);
        default:
          return new Response('Model Serving API - ESMAP AI Platform', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
      }
      
    } catch (error) {
      PERFORMANCE_METRICS.errorCount++;
      
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      const responseTime = Date.now() - startTime;
      PERFORMANCE_METRICS.totalLatency += responseTime;
      PERFORMANCE_METRICS.averageResponseTime = PERFORMANCE_METRICS.totalLatency / PERFORMANCE_METRICS.totalRequests;
    }
  }
};

// Handle prediction requests with intelligent caching
async function handlePrediction(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const body = await request.json();
    const { modelType, input, parameters = {} } = body;
    
    if (!modelType || !input) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: modelType, input'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate cache key
    const cacheKey = cache.generateCacheKey(modelType, input, parameters);
    
    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return new Response(JSON.stringify({
        result: cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if request can be batched
    const batchRequest = {
      modelType,
      input,
      parameters,
      cacheKey,
      resolve: null,
      reject: null
    };
    
    if (costOptimizer.addToBatch(batchRequest)) {
      // Return a promise that will be resolved when batch is processed
      return new Promise((resolve, reject) => {
        batchRequest.resolve = resolve;
        batchRequest.reject = reject;
      });
    }
    
    // Make request through load balancer
    const response = await loadBalancer.makeRequest('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    // Cache the result
    await cache.set(cacheKey, result, input);
    
    // Apply cost optimization
    const optimizedResult = costOptimizer.compressResponse(result);
    
    return new Response(JSON.stringify({
      result: optimizedResult,
      cached: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Prediction failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle health check
function handleHealthCheck() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - PERFORMANCE_METRICS.lastResetTime,
    version: '1.0.0',
    components: {
      cache: cache.getStats(),
      loadBalancer: loadBalancer.getStats(),
      monitor: monitor.getStats(),
      autoScaler: autoScaler.getStats(),
      costOptimizer: costOptimizer.getStats()
    }
  };
  
  return new Response(JSON.stringify(healthStatus), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle metrics endpoint
function handleMetrics() {
  const metrics = {
    performance: PERFORMANCE_METRICS,
    cache: cache.getStats(),
    loadBalancer: loadBalancer.getStats(),
    monitoring: monitor.getStats(),
    autoScaling: autoScaler.getStats(),
    costOptimization: costOptimizer.getStats(),
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(metrics), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle cache administration
async function handleCacheAdmin(request) {
  if (request.method === 'DELETE') {
    // Clear cache
    cache.cache.clear();
    cache.accessPatterns.clear();
    cache.hitRates.clear();
    
    return new Response(JSON.stringify({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(cache.getStats()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle scaling administration
async function handleScalingAdmin(request) {
  if (request.method === 'POST') {
    const body = await request.json();
    
    if (body.action === 'scale_up') {
      await autoScaler.scaleUp();
    } else if (body.action === 'scale_down') {
      await autoScaler.scaleDown();
    }
  }
  
  return new Response(JSON.stringify(autoScaler.getStats()), {
    headers: { 'Content-Type': 'application/json' }
  });
}