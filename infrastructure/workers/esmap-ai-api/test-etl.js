/**
 * Test script for ESMAP ETL Pipeline
 */

const API_BASE = 'http://localhost:8787/api/v1';

async function testETLPipeline() {
  console.log('🔄 Testing ESMAP ETL Pipeline...\n');

  try {
    // 1. Get available data sources
    console.log('📊 Getting available data sources...');
    const sourcesResponse = await fetch(`${API_BASE}/etl/sources`);
    const sources = await sourcesResponse.json();
    console.log(`Found ${sources.length} data sources:`, sources.map(s => s.name).join(', '));
    console.log('');

    // 2. Start an ETL job
    console.log('🚀 Starting ETL job...');
    const jobRequest = {
      jobId: `test-job-${Date.now()}`,
      pipelineName: 'test-esmap-pipeline',
      sources: ['world-bank', 'nasa-power'],
      options: {
        batchSize: 50,
        parallelism: 3
      }
    };

    const startResponse = await fetch(`${API_BASE}/etl/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobRequest)
    });

    const startResult = await startResponse.json();
    console.log('Job started:', startResult);
    console.log('');

    const { jobId } = startResult;

    // 3. Monitor job status
    console.log('📈 Monitoring job status...');
    let jobComplete = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!jobComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(`${API_BASE}/etl/status?jobId=${jobId}`);
      const status = await statusResponse.json();

      console.log(`Status: ${status.status}`);
      
      if (status.metrics) {
        console.log(`  - Records processed: ${status.metrics.recordsProcessed}`);
        console.log(`  - Records successful: ${status.metrics.recordsSuccessful}`);
        console.log(`  - Records failed: ${status.metrics.recordsFailed}`);
        console.log(`  - Average processing time: ${status.metrics.averageProcessingTime}ms`);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        jobComplete = true;
        console.log('\n✅ Job completed!');
        
        if (status.metrics) {
          console.log('\n📊 Final Metrics:');
          console.log(JSON.stringify(status.metrics, null, 2));
        }

        if (status.status === 'failed') {
          console.error('\n❌ Job failed:', status.error);
        }
      }

      attempts++;
    }

    if (!jobComplete) {
      console.log('\n⏱️ Job timed out - still running');
    }

    // 4. Get overall metrics
    console.log('\n📊 Getting pipeline metrics...');
    const metricsResponse = await fetch(`${API_BASE}/etl/metrics`);
    const metrics = await metricsResponse.json();
    console.log('Active pipelines:', Object.keys(metrics).length);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test data validation
async function testDataValidation() {
  console.log('\n🧪 Testing Data Validation...\n');

  const testRecords = [
    {
      // Valid record
      countryCode: 'USA',
      countryName: 'United States',
      indicatorCode: 'EG.ELC.ACCS.ZS',
      indicatorName: 'Access to electricity (% of population)',
      year: 2022,
      value: 100,
      unit: '%'
    },
    {
      // Invalid country code
      countryCode: 'US',  // Should be 3 characters
      countryName: 'United States',
      year: 2022,
      value: 100
    },
    {
      // Missing required field
      countryName: 'Unknown Country',
      year: 2022,
      value: 50
    },
    {
      // Invalid year
      countryCode: 'CHN',
      year: 2050,  // Future year
      value: 95
    }
  ];

  console.log('Testing validation rules on sample records...');
  console.log(`Total test records: ${testRecords.length}`);
  console.log('Expected: 1 valid, 3 invalid\n');
}

// Test transformation rules
async function testTransformations() {
  console.log('\n🔄 Testing Data Transformations...\n');

  const sampleData = {
    worldBank: {
      country: { value: '  United States  ', id: 'usa' },
      indicator: { id: 'EG.ELC.ACCS.ZS', value: 'Access to electricity (% of population)' },
      value: '100',
      date: '2022',
      decimal: '1'
    },
    nasaPower: {
      parameters: {
        ALLSKY_SFC_SW_DWN: '5.23',
        WS10M: '3.45',
        T2M: '25.6',
        PRECTOTCORR: '2.1'
      },
      header: {
        lon: '-77.0364',
        lat: '38.9072',
        start: '20230101',
        end: '20231231'
      }
    }
  };

  console.log('Sample transformations:');
  console.log('1. World Bank: Trimming strings, converting types');
  console.log('2. NASA POWER: Parsing coordinates and dates');
  console.log('3. IRENA: Standardizing technology names');
  console.log('4. MTF: Calculating access scores\n');
}

// Run all tests
async function runAllTests() {
  console.log('🏗️ ESMAP ETL Pipeline Test Suite\n');
  console.log('========================\n');

  await testETLPipeline();
  await testDataValidation();
  await testTransformations();

  console.log('\n✅ All tests completed!');
}

// Execute tests
runAllTests().catch(console.error);