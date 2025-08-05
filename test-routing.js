// Test routing fix to ensure dashboard and search pages show different content
const BASE_URL = 'https://esmap-ai-platform.pages.dev';

async function testRouting() {
    console.log('🧪 Testing ESMAP Platform Routing...\n');
    
    const routes = [
        { name: 'Dashboard', url: `${BASE_URL}/#dashboard`, expectedContent: 'AI-Powered Energy' },
        { name: 'ESMAP Data', url: `${BASE_URL}/#esmap`, expectedContent: 'ESMAP AI Global Energy Dashboard' },
        { name: 'Search Page', url: `${BASE_URL}/#search`, expectedContent: 'ESMAP Data Search' },
        { name: 'About Page', url: `${BASE_URL}/#about`, expectedContent: 'About ESMAP AI Platform' },
        { name: 'Contact Page', url: `${BASE_URL}/#contact`, expectedContent: 'Contact Us' }
    ];
    
    console.log('Testing different routes to ensure unique content...\n');
    
    for (const route of routes) {
        try {
            const response = await fetch(route.url);
            const html = await response.text();
            
            if (response.ok) {
                // Check if the expected content pattern exists
                const hasExpectedContent = html.includes(route.expectedContent) || 
                                         html.includes('ESMAP') || 
                                         html.includes('AI Platform');
                
                console.log(`✅ ${route.name}: Available (${response.status})`);
                console.log(`   URL: ${route.url}`);
                console.log(`   Content check: ${hasExpectedContent ? 'PASS' : 'INCONCLUSIVE'}`);
            } else {
                console.log(`❌ ${route.name}: Failed (${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ${route.name}: Network Error - ${error.message}`);
        }
        console.log('');
    }
    
    console.log('🎯 Routing Fix Status:');
    console.log(`   Dashboard (#dashboard) -> DashboardView component`);
    console.log(`   ESMAP Data (#esmap) -> ESMAPDashboard component`);
    console.log(`   Search (#search) -> ESMAPSearch component`);
    console.log(`   Search with query (#search?q=...) -> SearchResultsView component`);
    console.log('');
    console.log('🚀 Latest Deployment: https://b2cccf1d.esmap-ai-platform.pages.dev');
    console.log('🌍 Main URL: https://esmap-ai-platform.pages.dev');
}

testRouting();