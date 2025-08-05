/**
 * Test script for ESMAP AI Models
 * Tests model deployment, inference, and performance
 */

const API_URL = 'http://localhost:8787'; // Change to production URL when deployed

async function testEndpoint(name, endpoint, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: Success`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ ${name}: Failed (${response.status})`);
      console.log('Error:', data);
    }

    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting ESMAP AI Models Tests...\n');

  // Test 1: Health Check
  await testEndpoint('Health Check', '/health');

  // Test 2: List Models
  const modelsResult = await testEndpoint('List Models', '/models');

  // Test 3: Get Model Details
  if (modelsResult.success && modelsResult.data.models.length > 0) {
    const firstModel = modelsResult.data.models[0];
    await testEndpoint('Get Model Details', `/models/${firstModel.id}`);
  }

  // Test 4: Text Classification (ClimateBERT)
  await testEndpoint('Text Classification - Climate', '/inference', {
    method: 'POST',
    body: {
      modelId: 'climate-bert',
      input: {
        text: 'The new solar farm will reduce CO2 emissions by 50,000 tons annually'
      }
    }
  });

  // Test 5: Energy NER
  await testEndpoint('Named Entity Recognition - Energy', '/inference', {
    method: 'POST',
    body: {
      modelId: 'energy-ner',
      input: {
        text: 'IRENA reports that solar capacity in India reached 50GW in 2023'
      }
    }
  });

  // Test 6: Question Answering
  await testEndpoint('Question Answering - Energy', '/inference', {
    method: 'POST',
    body: {
      modelId: 'energy-qa',
      input: {
        question: 'What is the renewable energy target?',
        context: 'The government has set an ambitious renewable energy target of 175GW by 2030, focusing on solar, wind, and hydroelectric power generation.'
      }
    }
  });

  // Test 7: Policy Impact Analysis
  await testEndpoint('Policy Impact Analysis', '/inference', {
    method: 'POST',
    body: {
      modelId: 'policy-impact',
      input: {
        prompt: 'Analyze the impact of implementing a carbon tax of $50 per ton on industrial emissions'
      }
    }
  });

  // Test 8: Energy Summarization
  await testEndpoint('Energy Report Summarization', '/inference', {
    method: 'POST',
    body: {
      modelId: 'energy-summarizer',
      input: {
        text: 'The International Energy Agency (IEA) released its annual World Energy Outlook report, highlighting significant shifts in global energy markets. The report indicates that renewable energy sources are rapidly becoming cost-competitive with fossil fuels across most markets. Solar photovoltaic and wind power are leading this transformation, with costs declining by over 80% in the past decade. The report projects that by 2030, renewable sources could account for 40% of global electricity generation, up from 28% in 2021. However, challenges remain in grid integration, energy storage, and ensuring reliable supply during periods of low renewable generation. The report emphasizes the need for significant investments in grid infrastructure and energy storage technologies to support this transition.',
        maxLength: 100
      }
    }
  });

  // Test 9: Renewable Energy Forecasting
  await testEndpoint('Renewable Energy Forecast', '/inference', {
    method: 'POST',
    body: {
      modelId: 'renewable-forecast',
      input: {
        features: {
          temperature: 25,
          windSpeed: 15,
          cloudCover: 30,
          historicalGeneration: [100, 95, 98, 102, 97]
        }
      }
    }
  });

  // Test 10: Batch Inference
  await testEndpoint('Batch Inference', '/inference/batch', {
    method: 'POST',
    body: {
      modelId: 'climate-bert',
      inputs: [
        { text: 'Renewable energy is the future' },
        { text: 'Coal plants are being decommissioned' },
        { text: 'Energy efficiency improvements reduce costs' }
      ]
    }
  });

  // Test 11: Performance Metrics
  await testEndpoint('Performance Metrics', '/metrics');

  // Test 12: Cache Hit Test (repeat a previous request)
  console.log('\n📊 Testing Cache Performance...');
  const start = Date.now();
  await testEndpoint('First Request (No Cache)', '/inference', {
    method: 'POST',
    body: {
      modelId: 'climate-bert',
      input: {
        text: 'Testing cache performance with identical request'
      }
    }
  });
  const firstRequestTime = Date.now() - start;

  const cacheStart = Date.now();
  await testEndpoint('Second Request (Should Hit Cache)', '/inference', {
    method: 'POST',
    body: {
      modelId: 'climate-bert',
      input: {
        text: 'Testing cache performance with identical request'
      }
    }
  });
  const cachedRequestTime = Date.now() - cacheStart;

  console.log(`\n⏱️  Performance Comparison:`);
  console.log(`First request: ${firstRequestTime}ms`);
  console.log(`Cached request: ${cachedRequestTime}ms`);
  console.log(`Speed improvement: ${Math.round((1 - cachedRequestTime/firstRequestTime) * 100)}%`);

  // Test 13: Error Handling
  console.log('\n🔧 Testing Error Handling...');
  
  await testEndpoint('Invalid Model ID', '/inference', {
    method: 'POST',
    body: {
      modelId: 'non-existent-model',
      input: { text: 'test' }
    }
  });

  await testEndpoint('Missing Input', '/inference', {
    method: 'POST',
    body: {
      modelId: 'climate-bert'
      // Missing input
    }
  });

  await testEndpoint('Invalid Input Format', '/inference', {
    method: 'POST',
    body: {
      modelId: 'climate-bert',
      input: {
        // Missing required 'text' field
        wrongField: 'test'
      }
    }
  });

  console.log('\n✨ All tests completed!');
}

// Performance benchmark
async function runPerformanceBenchmark() {
  console.log('\n🏃 Running Performance Benchmark...\n');

  const requests = 50;
  const results = [];

  for (let i = 0; i < requests; i++) {
    const start = Date.now();
    
    await fetch(`${API_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'climate-bert',
        input: {
          text: `Benchmark request ${i}: The renewable energy sector continues to grow rapidly.`
        }
      })
    });

    const duration = Date.now() - start;
    results.push(duration);
    
    if ((i + 1) % 10 === 0) {
      console.log(`Completed ${i + 1}/${requests} requests`);
    }
  }

  // Calculate statistics
  const sorted = results.sort((a, b) => a - b);
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const p50 = sorted[Math.floor(results.length * 0.5)];
  const p95 = sorted[Math.floor(results.length * 0.95)];
  const p99 = sorted[Math.floor(results.length * 0.99)];

  console.log('\n📊 Benchmark Results:');
  console.log(`Total requests: ${requests}`);
  console.log(`Average latency: ${avg.toFixed(2)}ms`);
  console.log(`P50 latency: ${p50}ms`);
  console.log(`P95 latency: ${p95}ms`);
  console.log(`P99 latency: ${p99}ms`);
  console.log(`Min latency: ${sorted[0]}ms`);
  console.log(`Max latency: ${sorted[sorted.length - 1]}ms`);

  // Check if we meet sub-2 second requirement
  if (p95 < 2000) {
    console.log('\n✅ Performance requirement met: P95 < 2 seconds');
  } else {
    console.log('\n❌ Performance requirement not met: P95 >= 2 seconds');
  }
}

// Run tests
(async () => {
  await runTests();
  
  console.log('\n' + '='.repeat(50));
  
  // Uncomment to run performance benchmark
  // await runPerformanceBenchmark();
})();