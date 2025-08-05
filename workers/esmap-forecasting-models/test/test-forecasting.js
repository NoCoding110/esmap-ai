/**
 * Test Suite for Forecasting Models
 * Validates all forecasting endpoints and model performance
 */

// Test configuration
const BASE_URL = 'https://esmap-forecasting-models.metabilityllc1.workers.dev';
const TEST_TIMEOUT = 30000;

// Sample test data for different countries
const TEST_DATA = {
  USA: [
    { timestamp: '2024-01-01T00:00:00Z', value: 450000, country: 'USA', unit: 'MW' },
    { timestamp: '2024-01-01T01:00:00Z', value: 430000, country: 'USA', unit: 'MW' },
    { timestamp: '2024-01-01T02:00:00Z', value: 410000, country: 'USA', unit: 'MW' },
    { timestamp: '2024-01-01T03:00:00Z', value: 420000, country: 'USA', unit: 'MW' },
    { timestamp: '2024-01-01T04:00:00Z', value: 440000, country: 'USA', unit: 'MW' }
  ],
  GBR: [
    { timestamp: '2024-01-01T00:00:00Z', value: 35000, country: 'GBR', unit: 'MW' },
    { timestamp: '2024-01-01T01:00:00Z', value: 33000, country: 'GBR', unit: 'MW' },
    { timestamp: '2024-01-01T02:00:00Z', value: 31000, country: 'GBR', unit: 'MW' },
    { timestamp: '2024-01-01T03:00:00Z', value: 32000, country: 'GBR', unit: 'MW' },
    { timestamp: '2024-01-01T04:00:00Z', value: 34000, country: 'GBR', unit: 'MW' }
  ]
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ESMAP-Test-Suite/1.0'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: result,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      data: { error: error.message },
      success: false
    };
  }
}

async function testHealthEndpoint() {
  console.log('\\n🔍 Testing Health Endpoint...');
  
  const result = await makeRequest('/health');
  
  if (result.success) {
    console.log('✅ Health endpoint working');
    console.log(`   Status: ${result.data.status}`);
    console.log(`   API Version: ${result.data.api_version}`);
    console.log(`   Models: ${result.data.models_available}`);
    return true;
  } else {
    console.log('❌ Health endpoint failed');
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testModelsEndpoint() {
  console.log('\\n🔍 Testing Models List Endpoint...');
  
  const result = await makeRequest('/api/v1/models');
  
  if (result.success && result.data.models) {
    console.log('✅ Models endpoint working');
    console.log(`   Available models: ${result.data.models.length}`);
    
    result.data.models.forEach(model => {
      console.log(`   - ${model.name} (${model.algorithm}, MAPE: ${model.mape}%)`);
    });
    
    return result.data.models.length > 0;
  } else {
    console.log('❌ Models endpoint failed');
    console.log(`   Error: ${result.data.error || 'No models available'}`);
    return false;
  }
}

async function testTrainingEndpoint() {
  console.log('\\n🔍 Testing Model Training Endpoint...');
  
  const trainingRequest = {
    model_type: 'demand',
    algorithm: 'ARIMA',
    training_data: TEST_DATA.USA,
    validation_data: TEST_DATA.GBR,
    countries: ['USA', 'GBR'],
    target_accuracy: 85,
    max_training_time: 60000
  };
  
  const result = await makeRequest('/api/v1/train', 'POST', trainingRequest);
  
  if (result.success) {
    console.log('✅ Training endpoint working');
    console.log(`   Training ID: ${result.data.training_id}`);
    console.log(`   Model Type: ${result.data.model_type}`);
    console.log(`   Algorithm: ${result.data.algorithm}`);
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Achieved MAPE: ${result.data.training_results?.achieved_mape || 'N/A'}%`);
    
    return result.data.training_results?.achieved_mape < 15;
  } else {
    console.log('❌ Training endpoint failed');
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testForecastEndpoint() {
  console.log('\\n🔍 Testing Forecast Endpoint...');
  
  const forecastRequest = {
    model_id: 'energy-demand-arima',
    input_data: TEST_DATA.USA.slice(0, 3),
    forecast_horizon: 24,
    country: 'USA',
    confidence_level: 95
  };
  
  const result = await makeRequest('/api/v1/forecast', 'POST', forecastRequest);
  
  if (result.success && result.data.forecast) {
    console.log('✅ Forecast endpoint working');
    console.log(`   Model: ${result.data.model_info.name}`);
    console.log(`   Forecast points: ${result.data.forecast.length}`);
    console.log(`   Confidence level: ${result.data.confidence_level}%`);
    console.log(`   Performance - MAPE: ${result.data.performance_metrics.mape}%`);
    
    // Show sample forecast
    console.log('   Sample forecast:');
    result.data.forecast.slice(0, 3).forEach(point => {
      console.log(`     ${point.timestamp}: ${point.predicted_value.toFixed(0)} MW (±${point.confidence_interval.toFixed(0)})`);
    });
    
    return result.data.performance_metrics.mape < 15;
  } else {
    console.log('❌ Forecast endpoint failed');
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testCrossValidationEndpoint() {
  console.log('\\n🔍 Testing Cross-Validation Endpoint...');
  
  const cvRequest = {
    model_id: 'energy-demand-arima',
    validation_method: 'time_series_split',
    k_folds: 5,
    countries: ['USA', 'GBR'],
    data: [...TEST_DATA.USA, ...TEST_DATA.GBR],
    target_accuracy: 85
  };
  
  const result = await makeRequest('/api/v1/cross-validate', 'POST', cvRequest);
  
  if (result.success) {
    console.log('✅ Cross-validation endpoint working');
    console.log(`   Validation ID: ${result.data.validation_session.id}`);
    console.log(`   Method: ${result.data.validation_session.validation_method}`);
    console.log(`   Folds: ${result.data.validation_session.k_folds}`);
    console.log(`   Mean Accuracy: ${result.data.validation_results.mean_accuracy.toFixed(2)}%`);
    console.log(`   Mean MAPE: ${result.data.validation_results.mean_mape.toFixed(2)}%`);
    console.log(`   Stability Score: ${result.data.validation_results.stability_score.toFixed(2)}`);
    
    return result.data.validation_results.mean_mape < 15;
  } else {
    console.log('❌ Cross-validation endpoint failed');
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testABTestingEndpoint() {
  console.log('\\n🔍 Testing A/B Testing Endpoint...');
  
  const abTestRequest = {
    test_name: 'ARIMA vs LSTM Accuracy Test',
    model_a_id: 'arima_demand_usa',
    model_b_id: 'lstm_demand_usa', 
    test_type: 'accuracy_comparison',
    test_data: [...TEST_DATA.USA, ...TEST_DATA.GBR],
    traffic_split: 0.5,
    duration_hours: 1,
    significance_level: 0.05
  };
  
  const result = await makeRequest('/api/v1/ab-test', 'POST', abTestRequest);
  
  if (result.success) {
    console.log('✅ A/B Testing endpoint working');
    console.log(`   Test: ${result.data.ab_test_session.test_name}`);
    console.log(`   Models: ${result.data.ab_test_session.model_a_id} vs ${result.data.ab_test_session.model_b_id}`);
    console.log(`   Winner: ${result.data.winner.winner}`);
    console.log(`   Statistical Significance: ${result.data.statistical_significance ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${result.data.confidence_level}%`);
    
    if (result.data.winner.reason) {
      console.log(`   Reason: ${result.data.winner.reason}`);
    }
    
    return true;
  } else {
    console.log('❌ A/B Testing endpoint failed');
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testDataProcessingEndpoint() {
  console.log('\\n🔍 Testing Data Processing Endpoint...');
  
  const dataRequest = {
    data: TEST_DATA.USA,
    format: 'json',
    data_type: 'energy_demand',
    country: 'USA',
    validate_quality: true
  };
  
  const result = await makeRequest('/api/v1/data/process', 'POST', dataRequest);
  
  if (result.success) {
    console.log('✅ Data processing endpoint working');
    console.log(`   Processed points: ${result.data.data_summary.total_points}`);
    console.log(`   Quality score: ${result.data.quality_metrics.overall_score.toFixed(1)}/100`);
    console.log(`   Completeness: ${result.data.quality_metrics.completeness.toFixed(1)}%`);
    console.log(`   Accuracy: ${result.data.quality_metrics.accuracy.toFixed(1)}%`);
    
    if (result.data.quality_metrics.issues.length > 0) {
      console.log(`   Issues found: ${result.data.quality_metrics.issues.length}`);
    }
    
    return result.data.quality_metrics.overall_score > 70;
  } else {
    console.log('❌ Data processing endpoint failed');
    console.log(`   Error: ${result.data.error}`);
    return false;
  }
}

async function testPerformanceMetrics() {
  console.log('\\n🔍 Testing Performance Requirements...');
  
  const tests = [
    { name: 'Health Check', endpoint: '/health' },
    { name: 'Models List', endpoint: '/api/v1/models' },
    { name: 'Simple Forecast', endpoint: '/api/v1/forecast', method: 'POST', data: {
      model_id: 'energy-demand-arima',
      input_data: TEST_DATA.USA.slice(0, 2),
      forecast_horizon: 1,
      country: 'USA'
    }}
  ];
  
  const results = [];
  
  for (const test of tests) {
    const start = Date.now();
    const result = await makeRequest(
      test.endpoint, 
      test.method || 'GET', 
      test.data || null
    );
    const duration = Date.now() - start;
    
    results.push({
      name: test.name,
      duration,
      success: result.success
    });
    
    console.log(`   ${test.name}: ${duration}ms ${result.success ? '✅' : '❌'}`);
  }
  
  const avgLatency = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const allSuccess = results.every(r => r.success);
  
  console.log(`   Average Latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`   Target: < 2000ms ${avgLatency < 2000 ? '✅' : '❌'}`);
  
  return allSuccess && avgLatency < 2000;
}

async function runAllTests() {
  console.log('🚀 Starting ESMAP Forecasting Models Test Suite');
  console.log(`📍 Testing endpoint: ${BASE_URL}`);
  console.log('=' .repeat(60));
  
  const testResults = [];
  
  // Run all tests
  testResults.push({ name: 'Health Check', passed: await testHealthEndpoint() });
  testResults.push({ name: 'Models List', passed: await testModelsEndpoint() });
  testResults.push({ name: 'Model Training', passed: await testTrainingEndpoint() });
  testResults.push({ name: 'Forecasting', passed: await testForecastEndpoint() });
  testResults.push({ name: 'Cross-Validation', passed: await testCrossValidationEndpoint() });
  testResults.push({ name: 'A/B Testing', passed: await testABTestingEndpoint() });
  testResults.push({ name: 'Data Processing', passed: await testDataProcessingEndpoint() });
  testResults.push({ name: 'Performance', passed: await testPerformanceMetrics() });
  
  // Summary
  console.log('\\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const passed = testResults.filter(t => t.passed).length;
  const total = testResults.length;
  
  testResults.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log('\\n' + '-' .repeat(60));
  console.log(`📈 Results: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Forecasting models are ready for production.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  // Task 3.2 Acceptance Criteria Check
  console.log('\\n' + '=' .repeat(60));
  console.log('✅ TASK 3.2 ACCEPTANCE CRITERIA CHECK');
  console.log('=' .repeat(60));
  
  const criteria = [
    { name: 'Time series forecasting for energy demand/supply', passed: testResults.find(t => t.name === 'Forecasting')?.passed },
    { name: 'MAPE < 15% accuracy requirement', passed: testResults.find(t => t.name === 'Forecasting')?.passed },
    { name: 'Cross-validation across countries/regions', passed: testResults.find(t => t.name === 'Cross-Validation')?.passed },
    { name: 'Model deployment pipeline', passed: testResults.find(t => t.name === 'Models List')?.passed },
    { name: 'A/B testing framework', passed: testResults.find(t => t.name === 'A/B Testing')?.passed },
    { name: 'Training and prediction accuracy', passed: testResults.find(t => t.name === 'Model Training')?.passed }
  ];
  
  criteria.forEach(criterion => {
    console.log(`${criterion.passed ? '✅' : '❌'} ${criterion.name}`);
  });
  
  const criteriaMet = criteria.filter(c => c.passed).length;
  console.log(`\\n📊 Acceptance Criteria: ${criteriaMet}/${criteria.length} met`);
  
  return passed === total && criteriaMet === criteria.length;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

// Export for module usage
module.exports = { runAllTests };