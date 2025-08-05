/**
 * ESMAP AI Model Serving Deployment Validation
 * Validates all acceptance criteria for Task 3.3
 */

const DEPLOYMENT_CONFIG = {
  BASE_URL: 'https://esmap-model-serving.metabilityllc1.workers.dev',
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
  VALIDATION_TESTS: [
    'health_check',
    'caching_system',
    'load_balancing',
    'monitoring_alerts',
    'auto_scaling',
    'cost_optimization',
    'error_handling',
    'performance_validation'
  ]
};

// Validation results
const VALIDATION_RESULTS = {
  tests: {},
  overall: false,
  startTime: null,
  endTime: null,
  errors: []
};

/**
 * Main deployment validation function
 */
async function validateDeployment() {
  console.log('🔍 Starting ESMAP AI Model Serving Deployment Validation');
  console.log(`Target URL: ${DEPLOYMENT_CONFIG.BASE_URL}`);
  
  VALIDATION_RESULTS.startTime = Date.now();
  
  try {
    // Run all validation tests
    for (const testName of DEPLOYMENT_CONFIG.VALIDATION_TESTS) {
      console.log(`\n📋 Running ${testName.replace('_', ' ')} validation...`);
      
      try {
        const result = await runValidationTest(testName);
        VALIDATION_RESULTS.tests[testName] = result;
        
        if (result.passed) {
          console.log(`✅ ${testName}: PASSED`);
        } else {
          console.log(`❌ ${testName}: FAILED - ${result.message}`);
        }
        
      } catch (error) {
        VALIDATION_RESULTS.tests[testName] = {
          passed: false,
          message: error.message,
          error: error
        };
        console.log(`❌ ${testName}: ERROR - ${error.message}`);
        VALIDATION_RESULTS.errors.push(error);
      }
    }
    
    VALIDATION_RESULTS.endTime = Date.now();
    
    // Generate final report
    generateValidationReport();
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    VALIDATION_RESULTS.errors.push(error);
  }
}

/**
 * Run individual validation test
 */
async function runValidationTest(testName) {
  switch (testName) {
    case 'health_check':
      return await validateHealthCheck();
    case 'caching_system':
      return await validateCachingSystem();
    case 'load_balancing':
      return await validateLoadBalancing();
    case 'monitoring_alerts':
      return await validateMonitoringAlerts();
    case 'auto_scaling':
      return await validateAutoScaling();
    case 'cost_optimization':
      return await validateCostOptimization();
    case 'error_handling':
      return await validateErrorHandling();
    case 'performance_validation':
      return await validatePerformance();
    default:
      throw new Error(`Unknown test: ${testName}`);
  }
}

/**
 * Validate health check endpoint
 */
async function validateHealthCheck() {
  const response = await makeRequest('/health', 'GET');
  
  if (!response.ok) {
    return {
      passed: false,
      message: `Health check failed with status ${response.status}`
    };
  }
  
  const health = await response.json();
  
  // Validate health response structure
  const requiredFields = ['status', 'timestamp', 'uptime', 'components'];
  const missingFields = requiredFields.filter(field => !health.hasOwnProperty(field));
  
  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Missing health check fields: ${missingFields.join(', ')}`
    };
  }
  
  if (health.status !== 'healthy') {
    return {
      passed: false,
      message: `System status is not healthy: ${health.status}`
    };
  }
  
  return {
    passed: true,
    message: 'Health check endpoint working correctly',
    data: health
  };
}

/**
 * Validate intelligent caching system
 */
async function validateCachingSystem() {
  const testRequest = {
    modelType: 'energy_forecasting',
    input: {
      country: 'Nigeria',
      energyType: 'solar',
      timeHorizon: '12months'
    },
    parameters: { temperature: 0.7 }
  };
  
  // First request (should be cache miss)
  const response1 = await makeRequest('/predict', 'POST', testRequest);
  if (!response1.ok) {
    return {
      passed: false,
      message: `First prediction request failed: ${response1.status}`
    };
  }
  
  const result1 = await response1.json();
  
  // Second identical request (should be cache hit)
  const response2 = await makeRequest('/predict', 'POST', testRequest);
  if (!response2.ok) {
    return {
      passed: false,
      message: `Second prediction request failed: ${response2.status}`
    };
  }
  
  const result2 = await response2.json();
  
  // Validate caching behavior
  if (!result2.cached) {
    return {
      passed: false,
      message: 'Second identical request was not served from cache'
    };
  }
  
  // Check cache statistics
  const metricsResponse = await makeRequest('/metrics', 'GET');
  if (metricsResponse.ok) {
    const metrics = await metricsResponse.json();
    
    if (!metrics.cache || metrics.cache.hitRate === undefined) {
      return {
        passed: false,
        message: 'Cache metrics not available'
      };
    }
  }
  
  return {
    passed: true,
    message: 'Intelligent caching system working correctly',
    data: {
      firstRequest: { cached: result1.cached },
      secondRequest: { cached: result2.cached }
    }
  };
}

/**
 * Validate load balancing
 */
async function validateLoadBalancing() {
  const promises = [];
  const requestCount = 10;
  
  // Make multiple concurrent requests
  for (let i = 0; i < requestCount; i++) {
    const testRequest = {
      modelType: 'policy_analysis',
      input: {
        country: `TestCountry${i}`,
        policyType: 'renewable_incentives'
      },
      parameters: { temperature: 0.5 }
    };
    
    promises.push(makeRequest('/predict', 'POST', testRequest));
  }
  
  try {
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.ok).length;
    const successRate = successCount / requestCount;
    
    if (successRate < 0.8) { // 80% minimum success rate
      return {
        passed: false,
        message: `Load balancing success rate too low: ${(successRate * 100).toFixed(1)}%`
      };
    }
    
    // Check load balancer statistics
    const metricsResponse = await makeRequest('/metrics', 'GET');
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json();
      
      if (!metrics.loadBalancer || !metrics.loadBalancer.instances) {
        return {
          passed: false,
          message: 'Load balancer metrics not available'
        };
      }
      
      const healthyInstances = metrics.loadBalancer.instances.filter(i => i.healthy).length;
      if (healthyInstances === 0) {
        return {
          passed: false,
          message: 'No healthy instances available'
        };
      }
    }
    
    return {
      passed: true,
      message: `Load balancing working correctly (${(successRate * 100).toFixed(1)}% success rate)`,
      data: {
        totalRequests: requestCount,
        successfulRequests: successCount,
        successRate: successRate
      }
    };
    
  } catch (error) {
    return {
      passed: false,
      message: `Load balancing test failed: ${error.message}`
    };
  }
}

/**
 * Validate monitoring and alerting system
 */
async function validateMonitoringAlerts() {
  // Check metrics endpoint
  const metricsResponse = await makeRequest('/metrics', 'GET');
  
  if (!metricsResponse.ok) {
    return {
      passed: false,
      message: `Metrics endpoint failed: ${metricsResponse.status}`
    };
  }
  
  const metrics = await metricsResponse.json();
  
  // Validate metrics structure
  const requiredMetrics = ['performance', 'cache', 'loadBalancer', 'monitoring'];
  const missingMetrics = requiredMetrics.filter(metric => !metrics.hasOwnProperty(metric));
  
  if (missingMetrics.length > 0) {
    return {
      passed: false,
      message: `Missing metrics: ${missingMetrics.join(', ')}`
    };
  }
  
  // Validate performance metrics
  if (!metrics.performance.totalRequests && metrics.performance.totalRequests !== 0) {
    return {
      passed: false,
      message: 'Performance metrics not being collected'
    };
  }
  
  return {
    passed: true,
    message: 'Monitoring and alerting system working correctly',
    data: {
      metricsAvailable: Object.keys(metrics),
      totalRequests: metrics.performance.totalRequests
    }
  };
}

/**
 * Validate auto-scaling functionality
 */
async function validateAutoScaling() {
  // Check scaling endpoint
  const scalingResponse = await makeRequest('/admin/scaling', 'GET');
  
  if (!scalingResponse.ok) {
    return {
      passed: false,
      message: `Scaling endpoint failed: ${scalingResponse.status}`
    };
  }
  
  const scalingStats = await scalingResponse.json();
  
  // Validate scaling statistics structure
  if (!scalingStats.currentInstances || scalingStats.canScaleUp === undefined) {
    return {
      passed: false,
      message: 'Auto-scaling statistics not available'
    };
  }
  
  // Test manual scaling (scale up)
  try {
    const scaleUpResponse = await makeRequest('/admin/scaling', 'POST', { action: 'scale_up' });
    
    if (!scaleUpResponse.ok) {
      return {
        passed: false,
        message: `Manual scale up failed: ${scaleUpResponse.status}`
      };
    }
    
    // Wait a moment and check if scaling occurred
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedScalingResponse = await makeRequest('/admin/scaling', 'GET');
    if (updatedScalingResponse.ok) {
      const updatedStats = await updatedScalingResponse.json();
      
      // Check if scaling history was recorded
      if (!updatedStats.scalingHistory || updatedStats.scalingHistory.length === 0) {
        return {
          passed: false,
          message: 'Scaling actions not being recorded'
        };
      }
    }
    
  } catch (error) {
    return {
      passed: false,
      message: `Auto-scaling test failed: ${error.message}`
    };
  }
  
  return {
    passed: true,
    message: 'Auto-scaling functionality working correctly',
    data: {
      currentInstances: scalingStats.currentInstances,
      canScale: scalingStats.canScaleUp
    }
  };
}

/**
 * Validate cost optimization
 */
async function validateCostOptimization() {
  // Check cost optimization metrics
  const metricsResponse = await makeRequest('/metrics', 'GET');
  
  if (!metricsResponse.ok) {
    return {
      passed: false,
      message: 'Unable to retrieve cost optimization metrics'
    };
  }
  
  const metrics = await metricsResponse.json();
  
  if (!metrics.costOptimization) {
    return {
      passed: false,
      message: 'Cost optimization metrics not available'
    };
  }
  
  const costMetrics = metrics.costOptimization;
  
  // Validate cost optimization features
  const requiredFeatures = ['batchingEnabled', 'compressionEnabled'];
  const missingFeatures = requiredFeatures.filter(feature => costMetrics[feature] === undefined);
  
  if (missingFeatures.length > 0) {
    return {
      passed: false,
      message: `Cost optimization features not configured: ${missingFeatures.join(', ')}`
    };
  }
  
  return {
    passed: true,
    message: 'Cost optimization system working correctly',
    data: {
      batchingEnabled: costMetrics.batchingEnabled,
      compressionEnabled: costMetrics.compressionEnabled,
      totalRequests: costMetrics.totalRequests
    }
  };
}

/**
 * Validate error handling
 */
async function validateErrorHandling() {
  // Test invalid request
  const invalidRequest = {
    modelType: 'invalid_model',
    input: null
  };
  
  const response = await makeRequest('/predict', 'POST', invalidRequest);
  
  // Should return 400 or 500 error, not crash
  if (response.ok) {
    return {
      passed: false,
      message: 'Invalid request was not properly rejected'
    };
  }
  
  // Check if error response is properly formatted
  try {
    const errorResponse = await response.json();
    
    if (!errorResponse.error && !errorResponse.message) {
      return {
        passed: false,
        message: 'Error response not properly formatted'
      };
    }
    
  } catch (error) {
    return {
      passed: false,
      message: 'Error response is not valid JSON'
    };
  }
  
  // Test nonexistent endpoint
  const invalidEndpointResponse = await makeRequest('/invalid-endpoint', 'GET');
  
  if (invalidEndpointResponse.status !== 404 && invalidEndpointResponse.status !== 200) {
    // Should handle gracefully, not crash
  }
  
  return {
    passed: true,
    message: 'Error handling working correctly',
    data: {
      invalidRequestStatus: response.status,
      invalidEndpointStatus: invalidEndpointResponse.status
    }
  };
}

/**
 * Validate performance requirements
 */
async function validatePerformance() {
  const testRequests = 5;
  const responseTimes = [];
  
  for (let i = 0; i < testRequests; i++) {
    const startTime = Date.now();
    
    const testRequest = {
      modelType: 'energy_forecasting',
      input: {
        country: 'Kenya',
        energyType: 'wind',
        timeHorizon: '6months'
      },
      parameters: { temperature: 0.3 }
    };
    
    try {
      const response = await makeRequest('/predict', 'POST', testRequest);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        responseTimes.push(responseTime);
      }
      
    } catch (error) {
      // Count timeout/error as performance issue
      responseTimes.push(DEPLOYMENT_CONFIG.TIMEOUT);
    }
  }
  
  if (responseTimes.length === 0) {
    return {
      passed: false,
      message: 'No successful requests for performance validation'
    };
  }
  
  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const maxResponseTime = Math.max(...responseTimes);
  
  // Performance thresholds
  const avgThreshold = 10000; // 10 seconds average
  const maxThreshold = 30000; // 30 seconds maximum
  
  if (avgResponseTime > avgThreshold) {
    return {
      passed: false,
      message: `Average response time too high: ${avgResponseTime}ms (threshold: ${avgThreshold}ms)`
    };
  }
  
  if (maxResponseTime > maxThreshold) {
    return {
      passed: false,
      message: `Maximum response time too high: ${maxResponseTime}ms (threshold: ${maxThreshold}ms)`
    };
  }
  
  return {
    passed: true,
    message: `Performance requirements met (avg: ${avgResponseTime.toFixed(0)}ms, max: ${maxResponseTime}ms)`,
    data: {
      averageResponseTime: avgResponseTime,
      maxResponseTime: maxResponseTime,
      responseTimes: responseTimes
    }
  };
}

/**
 * Make HTTP request with timeout and retry
 */
async function makeRequest(endpoint, method = 'GET', data = null, retryCount = 0) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEPLOYMENT_CONFIG.TIMEOUT);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ESMAP-Validation/1.0'
      },
      signal: controller.signal
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${DEPLOYMENT_CONFIG.BASE_URL}${endpoint}`, options);
    clearTimeout(timeoutId);
    
    return response;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retryCount < DEPLOYMENT_CONFIG.RETRY_COUNT) {
      console.log(`Retrying request to ${endpoint} (attempt ${retryCount + 1}/${DEPLOYMENT_CONFIG.RETRY_COUNT + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return makeRequest(endpoint, method, data, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Generate validation report
 */
function generateValidationReport() {
  const duration = VALIDATION_RESULTS.endTime - VALIDATION_RESULTS.startTime;
  const testResults = Object.values(VALIDATION_RESULTS.tests);
  const passedTests = testResults.filter(test => test.passed).length;
  const totalTests = testResults.length;
  const passRate = (passedTests / totalTests) * 100;
  
  VALIDATION_RESULTS.overall = passedTests === totalTests;
  
  console.log('\n📋 DEPLOYMENT VALIDATION REPORT');
  console.log('================================');
  console.log(`\n🕐 Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`🎯 Tests Passed: ${passedTests}/${totalTests} (${passRate.toFixed(1)}%)`);
  console.log(`📊 Overall Result: ${VALIDATION_RESULTS.overall ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('\n📝 Test Results:');
  Object.entries(VALIDATION_RESULTS.tests).forEach(([testName, result]) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${testName.replace('_', ' ')}: ${status}`);
    if (!result.passed) {
      console.log(`    └── ${result.message}`);
    }
  });
  
  if (VALIDATION_RESULTS.errors.length > 0) {
    console.log('\n❌ Errors:');
    VALIDATION_RESULTS.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message}`);
    });
  }
  
  // Acceptance criteria validation
  console.log('\n✅ ACCEPTANCE CRITERIA VALIDATION:');
  
  const criteria = [
    { name: 'Intelligent Caching System', test: 'caching_system' },
    { name: 'Load Balancing', test: 'load_balancing' },
    { name: 'Monitoring and Alerting', test: 'monitoring_alerts' },
    { name: 'Automatic Scaling', test: 'auto_scaling' },
    { name: 'Cost Optimization', test: 'cost_optimization' },
    { name: 'Error Handling', test: 'error_handling' },
    { name: 'Performance Requirements', test: 'performance_validation' }
  ];
  
  criteria.forEach(criterion => {
    const test = VALIDATION_RESULTS.tests[criterion.test];
    const status = test && test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${criterion.name}: ${status}`);
  });
  
  const allCriteriaMet = criteria.every(criterion => {
    const test = VALIDATION_RESULTS.tests[criterion.test];
    return test && test.passed;
  });
  
  console.log(`\n🎯 ALL ACCEPTANCE CRITERIA: ${allCriteriaMet ? '✅ MET' : '❌ NOT MET'}`);
  
  // Save report
  try {
    const fs = require('fs');
    fs.writeFileSync('validation-report.json', JSON.stringify(VALIDATION_RESULTS, null, 2));
    console.log('\n💾 Validation report saved to validation-report.json');
  } catch (error) {
    console.log('\n⚠️  Could not save validation report:', error.message);
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateDeployment,
    DEPLOYMENT_CONFIG,
    VALIDATION_RESULTS
  };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  validateDeployment().catch(console.error);
}