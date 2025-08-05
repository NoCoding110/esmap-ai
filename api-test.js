// Test ESMAP API Integration
const API_BASE = 'https://esmap-ai-api.metabilityllc1.workers.dev/api/v1';

async function testESMAPAPI() {
    console.log('🌍 Testing ESMAP AI Platform API Integration...\n');
    
    const tests = [
        { name: 'API Overview', endpoint: '/esmap' },
        { name: 'Dashboard Data', endpoint: '/esmap/dashboard' },
        { name: 'Country Data (USA)', endpoint: '/esmap/countries?countries=USA' },
        { name: 'Search Functionality', endpoint: '/esmap/search?q=renewable' },
        { name: 'SDG7 Global Data', endpoint: '/esmap/sdg7/global' }
    ];
    
    let successCount = 0;
    
    for (const test of tests) {
        try {
            const response = await fetch(`${API_BASE}${test.endpoint}`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log(`✅ ${test.name}: SUCCESS`);
                console.log(`   Status: ${response.status}, Data size: ${JSON.stringify(data).length} chars`);
                successCount++;
            } else {
                console.log(`❌ ${test.name}: FAILED`);
                console.log(`   Status: ${response.status}, Error: ${data.error || 'Unknown'}`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: NETWORK ERROR`);
            console.log(`   Error: ${error.message}`);
        }
        console.log('');
    }
    
    console.log(`📊 Test Results: ${successCount}/${tests.length} tests passed`);
    console.log(successCount === tests.length ? '🎉 All systems operational!' : '⚠️ Some issues detected');
    
    console.log('\n🚀 Deployment URLs:');
    console.log(`   Frontend: https://esmap-ai-platform.pages.dev`);
    console.log(`   API: ${API_BASE}`);
    console.log(`   Latest: https://cde24852.esmap-ai-platform.pages.dev`);
}

testESMAPAPI();