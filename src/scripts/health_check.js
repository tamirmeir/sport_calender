const axios = require('axios');

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:3000' 
    : 'http://localhost:3000';

console.log(`[${new Date().toISOString()}] Health Check Started`);
console.log('='.repeat(50));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Base URL: ${BASE_URL}`);
console.log('='.repeat(50));

async function checkEndpoint(url, name, timeout = 5000) {
    const startTime = Date.now();
    try {
        const response = await axios.get(url, { timeout });
        const duration = Date.now() - startTime;
        const dataSize = JSON.stringify(response.data).length;
        console.log(`✅ ${name}`);
        console.log(`   Status: ${response.status} | Duration: ${duration}ms | Size: ${dataSize} bytes`);
        return true;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ ${name}`);
        console.error(`   Error: ${error.message} | Duration: ${duration}ms`);
        return false;
    }
}

async function runHealthCheck() {
    const endpoints = [
        { url: `${BASE_URL}/api/fixtures/countries`, name: 'Countries API', timeout: 10000 },
        { url: `${BASE_URL}/api/fixtures/tournaments/status/all`, name: 'Tournaments API', timeout: 5000 },
        { url: `${BASE_URL}/api/fixtures/leagues?country=Israel`, name: 'Leagues API (Israel)', timeout: 10000 },
        { url: `${BASE_URL}/`, name: 'Frontend (HTML)', timeout: 5000 }
    ];

    console.log('\nTesting endpoints...\n');
    
    const results = [];
    for (const ep of endpoints) {
        const result = await checkEndpoint(ep.url, ep.name, ep.timeout);
        results.push(result);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const allHealthy = results.every(r => r === true);
    const healthyCount = results.filter(r => r).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`Health Summary: ${healthyCount}/${results.length} endpoints healthy`);
    console.log('='.repeat(50));
    
    // If unhealthy, try to restart (production only)
    if (!allHealthy && process.env.NODE_ENV === 'production') {
        console.log('\n⚠️  Some endpoints failed. Attempting to restart services...');
        const { execSync } = require('child_process');
        try {
            execSync('pm2 restart matchday-frontend', { stdio: 'inherit' });
            console.log('✅ Services restarted successfully');
            
            // Wait a bit for server to start
            console.log('Waiting 5 seconds for server to initialize...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Re-test
            console.log('\nRe-testing endpoints after restart...');
            const retestResults = [];
            for (const ep of endpoints) {
                const result = await checkEndpoint(ep.url, ep.name, ep.timeout);
                retestResults.push(result);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const allHealthyNow = retestResults.every(r => r === true);
            console.log(`\nAfter restart: ${retestResults.filter(r => r).length}/${retestResults.length} endpoints healthy`);
            
            process.exit(allHealthyNow ? 0 : 1);
        } catch (error) {
            console.error('❌ Restart failed:', error.message);
            process.exit(1);
        }
    }

    console.log(`[${new Date().toISOString()}] Health Check ${allHealthy ? 'PASSED ✅' : 'FAILED ❌'}`);
    process.exit(allHealthy ? 0 : 1);
}

runHealthCheck();
