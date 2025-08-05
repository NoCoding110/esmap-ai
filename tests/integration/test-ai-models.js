/**
 * Test ESMAP AI Models with Real Energy Data
 */

const API_URL = 'https://esmap-ai-models.metabilityllc1.workers.dev';

async function testWithRealEnergyData() {
  console.log('🧪 Testing AI Models with Real Energy Data...\n');

  // Real energy text examples
  const energyTexts = [
    'Solar photovoltaic installations in India reached 50.38 GW by the end of 2022, making significant progress toward the national target of 175 GW renewable capacity by 2030.',
    'The International Energy Agency reports that global renewable electricity generation grew by 8.3% in 2022, with solar PV accounting for 60% of the increase.',
    'IRENA estimates that achieving the 1.5°C climate goal would require renewable energy investments of $131 trillion globally by 2050.',
    'Wind power capacity in offshore installations reached 8.8 GW of new additions in Europe during 2022, according to WindEurope data.',
    'The World Bank approved $500 million in financing for Bangladesh\'s renewable energy program, focusing on solar mini-grids in rural areas.'
  ];

  // Test 1: Climate Classification for all texts
  console.log('📊 Testing Climate Classification...');
  for (let i = 0; i < energyTexts.length; i++) {
    const response = await fetch(`${API_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'climate-bert',
        input: { text: energyTexts[i] }
      })
    });

    const result = await response.json();
    if (result.success && result.result && result.result.result) {
      const inference = result.result.result;
      console.log(`Text ${i + 1}: ${inference.label} (${(inference.score * 100).toFixed(1)}%)`);
    } else {
      console.log(`Text ${i + 1}: Error or no result`);
    }
  }

  // Test 2: Entity Recognition for complex text
  console.log('\n🏢 Testing Energy Entity Recognition...');
  const complexText = 'IRENA and the World Bank collaborated with the Indian Ministry of New and Renewable Energy to deploy 25 GW of solar capacity across 12 states, with ESMAP providing technical assistance for grid integration studies.';
  
  const nerResponse = await fetch(`${API_URL}/inference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelId: 'energy-ner',
      input: { text: complexText }
    })
  });

  const nerResult = await nerResponse.json();
  if (nerResult.success && nerResult.result && nerResult.result.result && nerResult.result.result.entities) {
    console.log('Entities found:');
    nerResult.result.result.entities.forEach(entity => {
      console.log(`  - ${entity.text} (${entity.type}): ${(entity.score * 100).toFixed(1)}%`);
    });
  } else {
    console.log('No entities found or error occurred');
  }

  // Test 3: Question Answering with real policy context
  console.log('\n❓ Testing Energy Policy Q&A...');
  const policyContext = `The Renewable Energy Policy Framework 2025 establishes ambitious targets for clean energy transition. The policy mandates that 40% of electricity generation must come from renewable sources by 2030, with specific allocations of 25% solar, 10% wind, and 5% other renewables. The framework includes feed-in tariffs, tax incentives, and simplified permitting processes. Investment requirements are estimated at $200 billion over the next decade, with 60% expected from private sector participation. The policy also emphasizes grid modernization, energy storage deployment, and community participation in renewable projects.`;

  const questions = [
    'What is the renewable energy target for 2030?',
    'How much investment is required?',
    'What percentage should come from solar energy?'
  ];

  for (const question of questions) {
    const qaResponse = await fetch(`${API_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'energy-qa',
        input: {
          question,
          context: policyContext
        }
      })
    });

    const qaResult = await qaResponse.json();
    if (qaResult.success && qaResult.result && qaResult.result.result) {
      console.log(`Q: ${question}`);
      const answer = qaResult.result.result.answer || qaResult.result.result.text || 'No answer available';
      console.log(`A: ${answer}\n`);
    } else {
      console.log(`Q: ${question}`);
      console.log('A: Error getting answer\n');
    }
  }

  // Test 4: Renewable Energy Forecasting
  console.log('⚡ Testing Renewable Energy Forecasting...');
  const weatherData = {
    temperature: 28,
    windSpeed: 12,
    cloudCover: 25,
    historicalGeneration: [145, 142, 150, 138, 155, 148, 152]
  };

  const forecastResponse = await fetch(`${API_URL}/inference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelId: 'renewable-forecast',
      input: { features: weatherData }
    })
  });

  const forecastResult = await forecastResponse.json();
  if (forecastResult.success && forecastResult.result && forecastResult.result.result) {
    const forecast = forecastResult.result.result;
    console.log('Renewable generation forecast:');
    console.log(`Next 4 periods: ${forecast.predictions.join(', ')} MW`);
    console.log(`Confidence: ${(forecast.metrics.confidence * 100).toFixed(1)}%`);
  } else {
    console.log('Error getting forecast');
  }

  // Test 5: Policy Impact Analysis
  console.log('\n📋 Testing Policy Impact Analysis...');
  const policyPrompt = 'Analyze the economic and environmental impact of implementing a carbon tax of $75 per ton CO2 equivalent on industrial emissions in developing countries, considering competitiveness concerns and revenue recycling mechanisms.';

  const policyResponse = await fetch(`${API_URL}/inference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelId: 'policy-impact',
      input: { prompt: policyPrompt }
    })
  });

  const policyResult = await policyResponse.json();
  if (policyResult.success && policyResult.result && policyResult.result.result) {
    console.log('Policy Impact Analysis:');
    if (policyResult.result.result.text) {
      console.log(policyResult.result.result.text.substring(0, 300) + '...');
    } else if (policyResult.result.result.message) {
      console.log(`Fallback: ${policyResult.result.result.message}`);
    } else {
      console.log('No text result available');
    }
  } else {
    console.log('Error getting policy analysis');
  }

  // Test 6: Batch Processing Performance
  console.log('\n🚀 Testing Batch Processing Performance...');
  const batchTexts = energyTexts.slice(0, 3).map(text => ({ text }));
  
  const batchStart = Date.now();
  const batchResponse = await fetch(`${API_URL}/inference/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelId: 'climate-bert',
      inputs: batchTexts
    })
  });

  const batchResult = await batchResponse.json();
  const batchTime = Date.now() - batchStart;

  if (batchResult.success) {
    console.log(`Batch processing: ${batchResult.successful}/${batchResult.batch_size} successful`);
    console.log(`Total time: ${batchTime}ms`);
    console.log(`Average per request: ${Math.round(batchTime / batchResult.batch_size)}ms`);
  }

  // Test 7: Performance Benchmark
  console.log('\n⏱️  Running Performance Benchmark...');
  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fetch(`${API_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'climate-bert',
        input: { text: `Benchmark test ${i}: ${energyTexts[i % energyTexts.length]}` }
      })
    });
    times.push(Date.now() - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const sortedTimes = times.sort((a, b) => a - b);
  const p95Time = sortedTimes[Math.floor(times.length * 0.95)];

  console.log(`Average response time: ${avgTime.toFixed(1)}ms`);
  console.log(`P95 response time: ${p95Time}ms`);
  console.log(`Sub-2 second requirement: ${p95Time < 2000 ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\n✨ Real energy data testing completed!');
}

// Run the tests
testWithRealEnergyData().catch(console.error);