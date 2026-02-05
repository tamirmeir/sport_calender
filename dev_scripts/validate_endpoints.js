/**
 * API Endpoints Validation - Tests all API routes work correctly
 * 
 * Usage: node dev_scripts/validate_endpoints.js
 */

const API_BASE = 'http://127.0.0.1:3000/api/fixtures';

const ENDPOINTS = [
    // Public endpoints
    { method: 'GET', path: '/countries', name: 'Get Countries', expect: 'array' },
    { method: 'GET', path: '/leagues?country=England', name: 'Get Leagues', expect: 'array' },
    { method: 'GET', path: '/teams?league=39&season=2025', name: 'Get Teams', expect: 'array' },
    { method: 'GET', path: '/standings?league=39&season=2025', name: 'Get Standings', expect: 'array' },
    { method: 'GET', path: '/teams-with-standings?league=39&season=2025', name: 'Teams with Standings', expect: 'array' },
    { method: 'GET', path: '/team/42', name: 'Get Team Info', expect: 'object' },
    { method: 'GET', path: '/team-leagues/42?season=2025', name: 'Team Leagues', expect: 'object' },
    { method: 'GET', path: '/fixtures?league=39&season=2025&next=5', name: 'Upcoming Fixtures', expect: 'array' },
    { method: 'GET', path: '/league-next/39?next=5', name: 'League Next Matches', expect: 'object' },
    { method: 'GET', path: '/history/42?last=5', name: 'Team History', expect: 'array' },
    { method: 'GET', path: '/active-teams?league=39', name: 'Active Teams', expect: 'array' },
    { method: 'GET', path: '/1211098', name: 'Single Fixture', expect: 'object' },
];

async function testEndpoint(endpoint) {
    const url = `${API_BASE}${endpoint.path}`;
    const start = Date.now();
    
    try {
        const response = await fetch(url, { method: endpoint.method });
        const time = Date.now() - start;
        
        if (!response.ok) {
            return { 
                ...endpoint, 
                status: '❌ FAIL', 
                error: `HTTP ${response.status}`,
                time 
            };
        }
        
        const data = await response.json();
        
        // Validate response type
        let valid = true;
        if (endpoint.expect === 'array' && !Array.isArray(data)) {
            // Some endpoints wrap in {response: [...]}
            if (!data.response || !Array.isArray(data.response)) {
                valid = false;
            }
        } else if (endpoint.expect === 'object' && typeof data !== 'object') {
            valid = false;
        } else if (endpoint.expect === 'number' && typeof data !== 'number') {
            valid = false;
        }
        
        const dataLength = Array.isArray(data) ? data.length : 
                          data.response ? data.response.length : 
                          Object.keys(data).length;
        
        return { 
            ...endpoint, 
            status: valid ? '✅ OK' : '⚠️ WARN', 
            time,
            dataLength,
            error: valid ? null : 'Unexpected response format'
        };
    } catch (err) {
        return { 
            ...endpoint, 
            status: '❌ FAIL', 
            error: err.message,
            time: Date.now() - start 
        };
    }
}

async function runAll() {
    console.log('🔍 API Endpoints Validation\n');
    console.log('='.repeat(70));
    console.log(`${'Endpoint'.padEnd(25)} | ${'Status'.padEnd(10)} | ${'Time'.padEnd(8)} | ${'Items'.padEnd(8)} | Error`);
    console.log('-'.repeat(70));
    
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    
    for (const endpoint of ENDPOINTS) {
        const result = await testEndpoint(endpoint);
        
        if (result.status.includes('OK')) passed++;
        else if (result.status.includes('WARN')) warnings++;
        else failed++;
        
        console.log(
            `${result.name.padEnd(25)} | ${result.status.padEnd(10)} | ${(result.time + 'ms').padEnd(8)} | ${String(result.dataLength || '-').padEnd(8)} | ${result.error || ''}`
        );
    }
    
    console.log('-'.repeat(70));
    console.log(`\n📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed`);
    
    if (failed > 0) {
        console.log('\n❌ Some endpoints are broken!');
        process.exit(1);
    } else {
        console.log('\n✅ All API endpoints working!');
    }
}

runAll();
