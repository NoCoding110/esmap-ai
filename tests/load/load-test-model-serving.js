/**
 * ESMAP AI Model Serving Load Testing Suite
 * Comprehensive testing for caching, load balancing, and scaling
 */

const LOAD_TEST_CONFIG = {
  BASE_URL: 'https://esmap-model-serving.metabilityllc1.workers.dev',
  CONCURRENT_USERS: 50,
  TEST_DURATION: 300000, // 5 minutes
  RAMP_UP_DURATION: 30000, // 30 seconds
  REQUEST_TIMEOUT: 30000, // 30 seconds
  SCENARIOS: {
    CACHE_TEST: {
      weight: 30,
      description: 'Test caching effectiveness with repeated requests'
    },
    LOAD_BALANCE_TEST: {
      weight: 40,
      description: 'Test load balancing across instances'
    },
    SCALING_TEST: {
      weight: 20,
      description: 'Test auto-scaling under high load'
    },
    FAILOVER_TEST: {
      weight: 10,
      description: 'Test failover and error handling'
    }
  }
};

// Test data templates
const TEST_REQUESTS = {
  ENERGY_PREDICTION: {
    modelType: 'energy_forecasting',
    input: {
      country: 'Nigeria',
      energyType: 'solar',
      timeHorizon: '12months',
      currentCapacity: 1500,
      factors: ['population_growth', 'economic_indicators', 'weather_patterns']
    },
    parameters: {
      temperature: 0.7,
      maxTokens: 1000
    }
  },
  POLICY_ANALYSIS: {
    modelType: 'policy_analysis',
    input: {
      country: 'Kenya',
      policyType: 'renewable_incentives',
      context: 'Rural electrification program with focus on mini-grids',
      constraints: ['budget_limitations', 'regulatory_framework']
    },
    parameters: {
      temperature: 0.3,
      maxTokens: 800
    }
  },
  RISK_ASSESSMENT: {
    modelType: 'investment_risk',
    input: {
      project: 'Solar microgrid deployment',
      location: 'Sub-Saharan Africa',
      investment: 50000000,
      timeline: '5years'
    },
    parameters: {
      temperature: 0.5,
      maxTokens: 600
    }
  }
};

// Performance metrics collection
const METRICS = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  timeouts: 0,
  cacheHits: 0,
  cacheMisses: 0,
  responseTimes: [],
  errorTypes: {},
  throughputBySecond: [],
  concurrentUsers: 0,
  startTime: null,
  endTime: null
};

// Global test state
let activeUsers = 0;
let testRunning = false;
let metricsInterval = null;

/**
 * Main load testing orchestrator
 */
async function runLoadTest() {
  console.log('🚀 Starting ESMAP AI Model Serving Load Test');
  console.log(`Configuration:
    - Base URL: ${LOAD_TEST_CONFIG.BASE_URL}
    - Concurrent Users: ${LOAD_TEST_CONFIG.CONCURRENT_USERS}
    - Test Duration: ${LOAD_TEST_CONFIG.TEST_DURATION / 1000}s
    - Ramp-up Duration: ${LOAD_TEST_CONFIG.RAMP_UP_DURATION / 1000}s`);

  METRICS.startTime = Date.now();
  testRunning = true;

  // Start metrics collection
  startMetricsCollection();

  // Start performance monitoring
  const monitoringPromise = startPerformanceMonitoring();

  // Ramp up users gradually
  const rampUpPromise = rampUpUsers();

  // Wait for ramp-up to complete
  await rampUpPromise;

  // Run test for specified duration
  console.log('📊 Load test running at full capacity...');
  await new Promise(resolve => setTimeout(resolve, LOAD_TEST_CONFIG.TEST_DURATION - LOAD_TEST_CONFIG.RAMP_UP_DURATION));

  // Stop test
  testRunning = false;
  METRICS.endTime = Date.now();

  // Wait for all active requests to complete
  console.log('⏳ Waiting for active requests to complete...');
  while (activeUsers > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Stop monitoring
  clearInterval(metricsInterval);

  // Generate report
  await generateLoadTestReport();

  console.log('✅ Load test completed successfully');
}

/**
 * Gradually ramp up concurrent users
 */
async function rampUpUsers() {
  const userIncrement = LOAD_TEST_CONFIG.CONCURRENT_USERS / (LOAD_TEST_CONFIG.RAMP_UP_DURATION / 1000);
  const incrementInterval = 1000; // Add users every second

  for (let second = 0; second < LOAD_TEST_CONFIG.RAMP_UP_DURATION / 1000; second++) {
    const usersToAdd = Math.min(
      Math.floor(userIncrement),
      LOAD_TEST_CONFIG.CONCURRENT_USERS - activeUsers
    );

    for (let i = 0; i < usersToAdd; i++) {
      if (activeUsers < LOAD_TEST_CONFIG.CONCURRENT_USERS) {
        startVirtualUser();
      }
    }

    console.log(`👥 Active users: ${activeUsers}/${LOAD_TEST_CONFIG.CONCURRENT_USERS}`);
    await new Promise(resolve => setTimeout(resolve, incrementInterval));
  }

  // Ensure we have the exact number of users
  while (activeUsers < LOAD_TEST_CONFIG.CONCURRENT_USERS) {
    startVirtualUser();
  }
}

/**
 * Start a virtual user that makes continuous requests
 */
function startVirtualUser() {
  activeUsers++;
  
  const runUser = async () => {
    while (testRunning) {
      try {
        const scenario = selectTestScenario();
        await executeScenario(scenario);
        
        // Random wait between requests (1-5 seconds)
        const waitTime = Math.random() * 4000 + 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (error) {
        console.error('Virtual user error:', error);
      }
    }
    activeUsers--;
  };

  runUser();
}

/**
 * Select test scenario based on weights
 */
function selectTestScenario() {
  const scenarios = Object.keys(LOAD_TEST_CONFIG.SCENARIOS);
  const weights = scenarios.map(s => LOAD_TEST_CONFIG.SCENARIOS[s].weight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < scenarios.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return scenarios[i];
    }
  }
  
  return scenarios[0]; // Fallback
}

/**
 * Execute specific test scenario
 */
async function executeScenario(scenario) {
  switch (scenario) {
    case 'CACHE_TEST':
      await executeCacheTest();
      break;
    case 'LOAD_BALANCE_TEST':
      await executeLoadBalanceTest();
      break;
    case 'SCALING_TEST':
      await executeScalingTest();
      break;
    case 'FAILOVER_TEST':
      await executeFailoverTest();
      break;
    default:
      await executeLoadBalanceTest();
  }
}

/**
 * Test caching effectiveness
 */
async function executeCacheTest() {
  // Make the same request multiple times to test caching
  const requestTemplate = getRandomRequestTemplate();
  
  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();
    
    try {
      const response = await makeRequest('/predict', requestTemplate);
      const responseTime = Date.now() - startTime;
      
      METRICS.totalRequests++;
      METRICS.responseTimes.push(responseTime);
      
      if (response.ok) {
        METRICS.successfulRequests++;
        const result = await response.json();
        
        if (result.cached) {
          METRICS.cacheHits++;
        } else {
          METRICS.cacheMisses++;
        }
      } else {
        METRICS.failedRequests++;
        recordError(`HTTP_${response.status}`);
      }
      
    } catch (error) {
      METRICS.failedRequests++;
      
      if (error.name === 'AbortError') {
        METRICS.timeouts++;
        recordError('TIMEOUT');
      } else {
        recordError(error.name || 'UNKNOWN_ERROR');
      }
    }
  }
}

/**
 * Test load balancing
 */
async function executeLoadBalanceTest() {
  const requestTemplate = getRandomRequestTemplate();
  const startTime = Date.now();
  
  try {
    const response = await makeRequest('/predict', requestTemplate);
    const responseTime = Date.now() - startTime;
    
    METRICS.totalRequests++;
    METRICS.responseTimes.push(responseTime);
    
    if (response.ok) {
      METRICS.successfulRequests++;
    } else {
      METRICS.failedRequests++;
      recordError(`HTTP_${response.status}`);
    }
    
  } catch (error) {
    METRICS.failedRequests++;
    
    if (error.name === 'AbortError') {
      METRICS.timeouts++;
      recordError('TIMEOUT');
    } else {
      recordError(error.name || 'UNKNOWN_ERROR');
    }
  }
}

/**
 * Test auto-scaling
 */
async function executeScalingTest() {
  // Generate high load to trigger scaling
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    const requestTemplate = getRandomRequestTemplate();
    promises.push(makeRequest('/predict', requestTemplate));
  }
  
  try {
    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      METRICS.totalRequests++;
      
      if (response.ok) {
        METRICS.successfulRequests++;
      } else {
        METRICS.failedRequests++;
        recordError(`HTTP_${response.status}`);
      }
    });
    
  } catch (error) {
    METRICS.failedRequests++;
    recordError(error.name || 'SCALING_ERROR');
  }
}

/**
 * Test failover handling
 */
async function executeFailoverTest() {
  // Test with invalid request to trigger error handling
  const invalidRequest = {
    modelType: 'invalid_model',
    input: null,
    parameters: {}
  };
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest('/predict', invalidRequest);
    const responseTime = Date.now() - startTime;
    
    METRICS.totalRequests++;
    METRICS.responseTimes.push(responseTime);
    METRICS.failedRequests++;
    
    recordError(`HTTP_${response.status}`);
    
  } catch (error) {
    METRICS.failedRequests++;
    recordError(error.name || 'FAILOVER_ERROR');
  }
}

/**
 * Make HTTP request with timeout
 */
async function makeRequest(endpoint, data) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOAD_TEST_CONFIG.REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(`${LOAD_TEST_CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ESMAP-LoadTest/1.0'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get random request template
 */
function getRandomRequestTemplate() {
  const templates = Object.values(TEST_REQUESTS);
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Record error type
 */
function recordError(errorType) {
  if (!METRICS.errorTypes[errorType]) {
    METRICS.errorTypes[errorType] = 0;
  }
  METRICS.errorTypes[errorType]++;
}

/**
 * Start metrics collection
 */
function startMetricsCollection() {
  let lastRequestCount = 0;
  
  metricsInterval = setInterval(() => {
    const currentRequests = METRICS.totalRequests;
    const throughput = currentRequests - lastRequestCount;
    
    METRICS.throughputBySecond.push({
      timestamp: Date.now(),
      throughput,
      activeUsers,
      successRate: METRICS.successfulRequests / Math.max(METRICS.totalRequests, 1)
    });
    
    lastRequestCount = currentRequests;
  }, 1000);
}

/**
 * Start performance monitoring
 */
async function startPerformanceMonitoring() {
  setInterval(async () => {
    try {
      // Check system health
      const healthResponse = await fetch(`${LOAD_TEST_CONFIG.BASE_URL}/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log(`🏥 System Health: ${health.status} | Active Users: ${activeUsers}`);
      }
      
      // Check metrics
      const metricsResponse = await fetch(`${LOAD_TEST_CONFIG.BASE_URL}/metrics`);
      if (metricsResponse.ok) {
        const systemMetrics = await metricsResponse.json();
        console.log(`📊 Cache Hit Rate: ${(systemMetrics.cache.hitRate * 100).toFixed(1)}% | Avg Response: ${systemMetrics.performance.averageResponseTime}ms`);
      }
      
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 10000); // Every 10 seconds
}

/**
 * Generate comprehensive load test report
 */
async function generateLoadTestReport() {
  const duration = METRICS.endTime - METRICS.startTime;
  const avgResponseTime = METRICS.responseTimes.reduce((sum, time) => sum + time, 0) / METRICS.responseTimes.length || 0;
  const p95ResponseTime = calculatePercentile(METRICS.responseTimes, 95);
  const p99ResponseTime = calculatePercentile(METRICS.responseTimes, 99);
  const throughput = METRICS.totalRequests / (duration / 1000);
  const successRate = (METRICS.successfulRequests / METRICS.totalRequests) * 100 || 0;
  const cacheHitRate = (METRICS.cacheHits / (METRICS.cacheHits + METRICS.cacheMisses)) * 100 || 0;

  const report = {
    summary: {
      testDuration: `${(duration / 1000).toFixed(1)}s`,
      totalRequests: METRICS.totalRequests,
      successfulRequests: METRICS.successfulRequests,
      failedRequests: METRICS.failedRequests,
      timeouts: METRICS.timeouts,
      throughput: `${throughput.toFixed(2)} req/s`,
      successRate: `${successRate.toFixed(2)}%`,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`
    },
    performance: {
      averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      p95ResponseTime: `${p95ResponseTime.toFixed(2)}ms`,
      p99ResponseTime: `${p99ResponseTime.toFixed(2)}ms`,
      minResponseTime: `${Math.min(...METRICS.responseTimes)}ms`,
      maxResponseTime: `${Math.max(...METRICS.responseTimes)}ms`
    },
    errors: METRICS.errorTypes,
    caching: {
      cacheHits: METRICS.cacheHits,
      cacheMisses: METRICS.cacheMisses,
      hitRate: `${cacheHitRate.toFixed(2)}%`
    },
    throughputOverTime: METRICS.throughputBySecond
  };

  console.log('\n📋 LOAD TEST REPORT');
  console.log('==================');
  console.log('\n📊 Summary:');
  Object.entries(report.summary).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n⚡ Performance:');
  Object.entries(report.performance).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n🎯 Caching:');
  Object.entries(report.caching).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  if (Object.keys(METRICS.errorTypes).length > 0) {
    console.log('\n❌ Errors:');
    Object.entries(METRICS.errorTypes).forEach(([errorType, count]) => {
      console.log(`  ${errorType}: ${count}`);
    });
  }

  // Validate acceptance criteria
  console.log('\n✅ ACCEPTANCE CRITERIA VALIDATION:');
  
  // Caching effectiveness
  const cachingEffective = cacheHitRate > 30; // 30% minimum cache hit rate
  console.log(`  Intelligent Caching: ${cachingEffective ? '✅ PASS' : '❌ FAIL'} (${cacheHitRate.toFixed(1)}% hit rate)`);
  
  // Load balancing performance
  const loadBalancingEffective = successRate > 95; // 95% minimum success rate
  console.log(`  Load Balancing: ${loadBalancingEffective ? '✅ PASS' : '❌ FAIL'} (${successRate.toFixed(1)}% success rate)`);
  
  // Performance monitoring
  const performanceGood = avgResponseTime < 5000; // Under 5 seconds average
  console.log(`  Performance: ${performanceGood ? '✅ PASS' : '❌ FAIL'} (${avgResponseTime.toFixed(0)}ms avg response)`);
  
  // No timeouts
  const noTimeouts = METRICS.timeouts === 0;
  console.log(`  No Timeouts: ${noTimeouts ? '✅ PASS' : '❌ FAIL'} (${METRICS.timeouts} timeouts)`);
  
  // Throughput
  const throughputGood = throughput > 10; // Minimum 10 requests per second
  console.log(`  Throughput: ${throughputGood ? '✅ PASS' : '❌ FAIL'} (${throughput.toFixed(1)} req/s)`);

  const allTestsPassed = cachingEffective && loadBalancingEffective && performanceGood && noTimeouts && throughputGood;
  console.log(`\n🎯 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  // Save report to file
  try {
    const fs = require('fs');
    fs.writeFileSync('load-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Report saved to load-test-report.json');
  } catch (error) {
    console.log('\n⚠️  Could not save report to file:', error.message);
  }
}

/**
 * Calculate percentile from array of numbers
 */
function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runLoadTest,
    LOAD_TEST_CONFIG,
    METRICS
  };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runLoadTest().catch(console.error);
}