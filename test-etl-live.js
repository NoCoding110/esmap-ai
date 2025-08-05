/**
 * Test ETL Pipeline with Live Cloudflare Worker
 */

const API_BASE = 'https://esmap-ai-api.metabilityllc1.workers.dev';

async function testETLPipeline() {
  console.log('🌍 Testing ESMAP ETL Pipeline with Live Cloudflare Worker...\n');

  try {
    // 1. Get available data sources
    console.log('📊 Getting available data sources...');
    const sourcesResponse = await fetch(`${API_BASE}/etl/sources`);
    const sources = await sourcesResponse.json();
    console.log(`Found ${sources.length} data sources:`);
    sources.forEach(source => {
      console.log(`  - ${source.name} (${source.type}): ${source.description}`);
    });
    console.log('');

    // 2. Start an ETL job
    console.log('🚀 Starting ETL job...');
    const jobRequest = {
      jobId: `test-job-${Date.now()}`,
      pipelineName: 'test-esmap-pipeline',
      sources: ['world-bank'],
      options: {
        batchSize: 10,
        parallelism: 2
      }
    };

    console.log(`Job request: ${JSON.stringify(jobRequest, null, 2)}`);

    const startResponse = await fetch(`${API_BASE}/etl/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobRequest)
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error(`❌ Failed to start job: ${startResponse.status} ${startResponse.statusText}`);
      console.error(`Error response: ${errorText}`);
      return;
    }

    const startResult = await startResponse.json();
    console.log('✅ Job started successfully:', startResult);
    console.log('');

    const { jobId } = startResult;

    // 3. Monitor job status
    console.log('📈 Monitoring job status...');
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      const statusResponse = await fetch(`${API_BASE}/etl/status?jobId=${jobId}`);
      
      if (!statusResponse.ok) {
        console.log(`⚠️ Status check failed: ${statusResponse.status}`);
        break;
      }

      const status = await statusResponse.json();
      console.log(`📊 Status: ${status.status}`);
      
      if (status.metrics) {
        console.log(`  - Records processed: ${status.metrics.recordsProcessed || 0}`);
        console.log(`  - Records successful: ${status.metrics.recordsSuccessful || 0}`);
        console.log(`  - Records failed: ${status.metrics.recordsFailed || 0}`);
        if (status.metrics.averageProcessingTime) {
          console.log(`  - Avg processing time: ${status.metrics.averageProcessingTime}ms`);
        }
      }

      if (status.status === 'completed') {
        console.log('\n🎉 Job completed successfully!');
        
        if (status.metrics) {
          console.log('\n📈 Final Metrics:');
          console.log(JSON.stringify(status.metrics, null, 2));
        }
        break;
      } else if (status.status === 'failed') {
        console.log('\n❌ Job failed:', status.error);
        break;
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏱️ Monitoring timed out - job may still be running');
    }

    // 4. Get overall metrics
    console.log('\n📊 Getting pipeline metrics...');
    const metricsResponse = await fetch(`${API_BASE}/etl/metrics`);
    
    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json();
      console.log('Active pipelines:', Object.keys(metrics).length);
      console.log('Pipeline details:', JSON.stringify(metrics, null, 2));
    } else {
      console.log('Could not retrieve metrics');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testBasicEndpoints() {
  console.log('\n🔍 Testing Basic ETL Endpoints...\n');

  const endpoints = [
    '/etl/sources',
    '/etl/metrics'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(`${API_BASE}${endpoint}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}: OK`);
        console.log(`   Response size: ${JSON.stringify(data).length} chars`);
      } else {
        console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🏗️ ESMAP ETL Pipeline Live Test Suite\n');
  console.log('=====================================\n');

  await testBasicEndpoints();
  await testETLPipeline();

  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);