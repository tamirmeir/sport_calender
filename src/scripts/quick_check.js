const fs = require('fs');
const path = require('path');

console.log(`[${new Date().toISOString()}] Quick Check Started`);
console.log('='.repeat(50));

// Check if required files exist
const requiredFiles = [
    'src/data/finished_tournaments.json',
    'src/data/world_tournaments_master.json',
    'src/data/country_mappings.json',
    'src/data/cup_winners.js'
];

let allOk = true;
let totalSize = 0;

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '../..', file);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Missing file: ${file}`);
        allOk = false;
    } else {
        const stats = fs.statSync(filePath);
        const size = stats.size;
        const modified = stats.mtime.toISOString();
        totalSize += size;
        console.log(`✅ ${file}`);
        console.log(`   Size: ${size} bytes | Modified: ${modified}`);
    }
});

console.log('-'.repeat(50));
console.log(`Total data size: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);

// Check JSON validity
console.log('\nValidating JSON files...');
const jsonFiles = requiredFiles.filter(f => f.endsWith('.json'));
jsonFiles.forEach(file => {
    const filePath = path.join(__dirname, '../..', file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${file}: Valid JSON`);
    } catch (error) {
        console.error(`❌ ${file}: Invalid JSON - ${error.message}`);
        allOk = false;
    }
});

// Check finished tournaments count
console.log('\nFinished tournaments summary:');
try {
    const finishedPath = path.join(__dirname, '../..', 'src/data/finished_tournaments.json');
    const finished = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
    const count = Object.keys(finished.finished_tournaments || {}).length;
    console.log(`✅ Total finished tournaments: ${count}`);
    
    // List them
    Object.entries(finished.finished_tournaments || {}).forEach(([id, tournament]) => {
        const winnerName = tournament.winner?.name || 'Unknown';
        console.log(`   - ${id}: ${tournament.name} (Winner: ${winnerName})`);
    });
} catch (error) {
    console.error(`❌ Could not read finished tournaments: ${error.message}`);
    allOk = false;
}

// Check if Node.js server is running (production only)
if (process.env.NODE_ENV === 'production') {
    console.log('\nChecking production services...');
    const { execSync } = require('child_process');
    try {
        const pm2Status = execSync('pm2 jlist').toString();
        const processes = JSON.parse(pm2Status);
        const frontend = processes.find(p => p.name === 'matchday-frontend');
        
        if (frontend && frontend.pm2_env.status === 'online') {
            console.log(`✅ Node.js server: online (uptime: ${frontend.pm2_env.pm_uptime})`);
        } else {
            console.error('❌ Node.js server: offline or not found');
            allOk = false;
        }
    } catch (error) {
        console.error('❌ PM2 check failed:', error.message);
        allOk = false;
    }
}

console.log('='.repeat(50));
console.log(`[${new Date().toISOString()}] Quick Check ${allOk ? 'PASSED ✅' : 'FAILED ❌'}`);

process.exit(allOk ? 0 : 1);
