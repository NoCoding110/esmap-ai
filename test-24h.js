// Generate exactly 24 hours of test data
const testData = [];
const startDate = new Date('2024-01-01T00:00:00Z');

for (let i = 0; i < 24; i++) {
  const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
  const hour = timestamp.getHours();
  
  // Base load with daily patterns
  let baseLoad = 400000;
  const dailyFactor = 0.8 + 0.3 * Math.sin((hour * Math.PI) / 12);
  const value = Math.round(baseLoad * dailyFactor);
  
  testData.push({
    timestamp: timestamp.toISOString(),
    value: value,
    country: 'USA',
    unit: 'MW'
  });
}

console.log(`Generated ${testData.length} hours of test data`);
console.log('First 3 data points:');
testData.slice(0, 3).forEach(point => {
  console.log(`  ${point.timestamp}: ${point.value} MW`);
});

const forecastRequest = {
  model_id: 'energy-demand-arima',
  data: testData,
  horizon: 6,
  country: 'USA'
};

async function test24HourForecast() {
  try {
    console.log('\\n🚀 Testing forecast with exactly 24 hours of data...');
    
    const response = await fetch('https://esmap-forecasting-models.metabilityllc1.workers.dev/forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forecastRequest)
    });
    
    const result = await response.json();
    console.log('Raw response:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.log('❌ Request Failed:', error.message);
    return false;
  }
}

test24HourForecast();