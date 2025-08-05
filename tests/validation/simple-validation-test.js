#!/usr/bin/env node

/**
 * Simple Validation Test for ESMAP Model Serving
 */

const BASE_URL = 'https://esmap-model-serving.metabilityllc1.workers.dev';

async function runValidationTests() {
  console.log('🔍 Running ESMAP Model Serving Validation Tests');
  console.log(`Base URL: ${BASE_URL}`);
  
  const tests = [
    { name: 'Health Check', test: testHealthCheck },
    { name: 'Metrics Endpoint', test: testMetrics },
    { name: 'Cache Administration', test: testCacheAdmin },
    { name: 'Scaling Administration', test: testScalingAdmin },
    { name: 'Error Handling', test: testErrorHandling }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      console.log(`\n📋 Testing: ${name}`);
      const result = await test();
      if (result.success) {
        console.log(`✅ ${name}: PASSED - ${result.message}`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED - ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ERROR - ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Model serving infrastructure is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  return failed === 0;
}

async function testHealthCheck() {
  const response = await fetch(`${BASE_URL}/health`);
  
  if (!response.ok) {
    return { success: false, message: `HTTP ${response.status}` };
  }
  
  const health = await response.json();
  
  if (health.status !== 'healthy') {
    return { success: false, message: `Status: ${health.status}` };
  }
  
  return { 
    success: true, 
    message: `System healthy, uptime: ${Math.floor(health.uptime / 1000)}s`
  };
}

async function testMetrics() {
  const response = await fetch(`${BASE_URL}/metrics`);
  
  if (!response.ok) {
    return { success: false, message: `HTTP ${response.status}` };
  }
  
  const metrics = await response.json();
  
  if (!metrics.performance || !metrics.cache || !metrics.loadBalancer) {
    return { success: false, message: 'Missing metrics components' };
  }
  
  return {
    success: true,
    message: `Metrics available, requests: ${metrics.performance.totalRequests}`
  };
}

async function testCacheAdmin() {
  const response = await fetch(`${BASE_URL}/admin/cache`);
  
  if (!response.ok) {
    return { success: false, message: `HTTP ${response.status}` };
  }
  
  const cacheStats = await response.json();
  
  if (typeof cacheStats.size !== 'number') {
    return { success: false, message: 'Invalid cache statistics' };
  }
  
  return {
    success: true,
    message: `Cache admin working, size: ${cacheStats.size}`
  };
}

async function testScalingAdmin() {
  const response = await fetch(`${BASE_URL}/admin/scaling`);
  
  if (!response.ok) {
    return { success: false, message: `HTTP ${response.status}` };
  }
  
  const scalingStats = await response.json();
  
  if (typeof scalingStats.currentInstances !== 'number') {
    return { success: false, message: 'Invalid scaling statistics' };
  }
  
  return {
    success: true,
    message: `Scaling admin working, instances: ${scalingStats.currentInstances}`
  };
}

async function testErrorHandling() {
  // Test invalid endpoint
  const response = await fetch(`${BASE_URL}/invalid-endpoint`);
  
  // Should not crash the worker
  if (response.status === 500) {
    return { success: false, message: 'Worker crashed on invalid endpoint' };
  }
  
  return {
    success: true,
    message: `Error handling working, status: ${response.status}`
  };
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidationTests().catch(console.error);
}

export { runValidationTests };