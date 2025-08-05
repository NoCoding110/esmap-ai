// Generate larger test dataset for forecasting validation
const testData = [];
const startDate = new Date('2024-01-01T00:00:00Z');

// Generate 7 days (168 hours) of realistic energy demand data
for (let i = 0; i < 168; i++) {
  const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
  const hour = timestamp.getHours();
  const dayOfWeek = timestamp.getDay();
  
  // Base load with daily and weekly patterns
  let baseLoad = 400000; // 400 GW base
  
  // Daily pattern (higher during day, lower at night)
  const dailyFactor = 0.8 + 0.3 * Math.sin((hour * Math.PI) / 12);
  
  // Weekly pattern (lower on weekends)
  const weeklyFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1.0;
  
  // Add some realistic randomness
  const randomFactor = 0.95 + Math.random() * 0.1;
  
  const value = Math.round(baseLoad * dailyFactor * weeklyFactor * randomFactor);
  
  testData.push({
    timestamp: timestamp.toISOString(),
    value: value,
    country: 'USA',
    unit: 'MW'
  });
}

console.log(`Generated ${testData.length} hours of test data`);

const forecastRequest = {
  model_id: 'energy-demand-arima',
  input_data: testData,
  forecast_horizon: 24,
  country: 'USA',
  confidence_level: 95
};

async function testLargeForecast() {
  try {
    console.log('🚀 Testing forecast with 168 hours of data...');
    
    const response = await fetch('https://esmap-forecasting-models.metabilityllc1.workers.dev/forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forecastRequest)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Forecast Success!');
      console.log(`Model: ${result.model_info.name}`);
      console.log(`Algorithm: ${result.model_info.algorithm}`);
      console.log(`MAPE: ${result.performance_metrics.mape}%`);
      console.log(`Accuracy: ${result.performance_metrics.accuracy}%`);
      console.log(`RMSE: ${result.performance_metrics.rmse}`);
      console.log(`MAE: ${result.performance_metrics.mae}`);
      console.log(`Forecast points: ${result.forecast.length}`);
      
      console.log('\\nFirst 12 hours forecast:');
      result.forecast.slice(0, 12).forEach((point, i) => {
        const date = new Date(point.timestamp);
        const hour = date.getHours().toString().padStart(2, '0');
        console.log(`  ${hour}:00 - ${point.predicted_value.toLocaleString()} MW (±${point.confidence_interval.toLocaleString()})`);
      });
      
      // Check acceptance criteria
      const mapeOk = result.performance_metrics.mape < 15;
      const accuracyOk = result.performance_metrics.accuracy > 85;
      
      console.log('\\n📊 Acceptance Criteria Check:');
      console.log(`✅ MAPE < 15%: ${result.performance_metrics.mape}% ${mapeOk ? '✅' : '❌'}`);
      console.log(`✅ Accuracy > 85%: ${result.performance_metrics.accuracy}% ${accuracyOk ? '✅' : '❌'}`);
      console.log(`✅ 24h Forecast: ${result.forecast.length} points ${result.forecast.length === 24 ? '✅' : '❌'}`);
      
      return mapeOk && accuracyOk && result.forecast.length === 24;
    } else {
      console.log('❌ Forecast Failed:', result.error);
      console.log('Details:', result.details);
      return false;
    }
  } catch (error) {
    console.log('❌ Request Failed:', error.message);
    return false;
  }
}

// Also test training endpoint
async function testTraining() {
  console.log('\\n🎯 Testing Model Training...');
  
  const trainingRequest = {
    model_type: 'demand',
    algorithm: 'ARIMA',
    training_data: testData.slice(0, 120), // 5 days for training
    validation_data: testData.slice(120), // 2 days for validation
    countries: ['USA'],
    target_accuracy: 85,
    max_training_time: 30000
  };
  
  try {
    const response = await fetch('https://esmap-forecasting-models.metabilityllc1.workers.dev/models/train', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trainingRequest)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Training Success!');
      console.log(`Training ID: ${result.training_id}`);
      console.log(`Status: ${result.status}`);
      console.log(`Achieved MAPE: ${result.training_results.achieved_mape}%`);
      console.log(`Achieved Accuracy: ${result.training_results.achieved_accuracy}%`);
      console.log(`Training Time: ${result.training_results.training_time_ms}ms`);
      
      return result.training_results.achieved_mape < 15;
    } else {
      console.log('❌ Training Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Training Request Failed:', error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🧪 ESMAP Forecasting Models - Full Test Suite');
  console.log('=' .repeat(50));
  
  const forecastOk = await testLargeForecast();
  const trainingOk = await testTraining();
  
  console.log('\\n' + '=' .repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('=' .repeat(50));
  console.log(`Forecasting: ${forecastOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Training: ${trainingOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const allOk = forecastOk && trainingOk;
  console.log(`\\nOverall: ${allOk ? '🎉 SUCCESS' : '⚠️ NEEDS WORK'}`);
  
  return allOk;
}

runFullTest().then(success => {
  process.exit(success ? 0 : 1);
});