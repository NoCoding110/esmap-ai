// Generate test data for forecasting validation
const testData = [];
const startDate = new Date('2024-01-01T00:00:00Z');

// Generate 48 hours of realistic energy demand data
for (let i = 0; i < 48; i++) {
  const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
  const hour = timestamp.getHours();
  
  // Base load with daily patterns
  let baseLoad = 400000; // 400 GW base
  
  // Daily pattern (higher during day, lower at night)
  const dailyFactor = 0.8 + 0.3 * Math.sin((hour * Math.PI) / 12);
  
  // Add some randomness
  const randomFactor = 0.95 + Math.random() * 0.1;
  
  const value = Math.round(baseLoad * dailyFactor * randomFactor);
  
  testData.push({
    timestamp: timestamp.toISOString(),
    value: value,
    country: 'USA',
    unit: 'MW'
  });
}

const forecastRequest = {
  model_id: 'energy-demand-arima',
  input_data: testData,
  forecast_horizon: 24,
  country: 'USA',
  confidence_level: 95
};

async function testForecast() {
  try {
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
      console.log(`Forecast points: ${result.forecast.length}`);
      
      console.log('\\nSample forecast:');
      result.forecast.slice(0, 6).forEach((point, i) => {
        console.log(`  ${i+1}h: ${point.predicted_value.toLocaleString()} MW (±${point.confidence_interval.toLocaleString()})`);
      });
      
      // Check if MAPE < 15%
      if (result.performance_metrics.mape < 15) {
        console.log('\\n🎯 MAPE Target Achieved: < 15%');
        return true;
      } else {
        console.log('\\n⚠️ MAPE above target (>15%)');
        return false;
      }
    } else {
      console.log('❌ Forecast Failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Request Failed:', error.message);
    return false;
  }
}

testForecast().then(success => {
  process.exit(success ? 0 : 1);
});