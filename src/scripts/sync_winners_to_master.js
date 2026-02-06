#!/usr/bin/env node

/**
 * Sync detected winners from finished_tournaments.json to world_tournaments_master.json
 */

const fs = require('fs');
const path = require('path');

function syncWinnersToMaster() {
    const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
    const masterPath = path.join(__dirname, '../data/world_tournaments_master.json');
    
    console.log('🔄 Syncing detected winners to master tournament data...');
    
    try {
        // Load both data files
        const finishedData = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
        const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
        
        let updatedCount = 0;
        
        // Sync winners from finished tournaments to master data
        Object.entries(finishedData.finished_tournaments).forEach(([tournamentId, finished]) => {
            const master = masterData.tournaments[tournamentId];
            
            if (master && finished.winner && finished.winner.name) {
                // Update the master data with the detected winner
                const wasEmpty = !master.winner.hasWinner;
                
                master.winner = {
                    hasWinner: true,
                    season: finished.year.toString(),
                    team: finished.winner.name,
                    teamId: finished.winner.id || null,
                    teamLogo: finished.winner.logo || null,
                    confirmedDate: finished.winner.detected_at || new Date().toISOString(),
                    detectedBy: finished.winner.detected_by || 'automated',
                    confidence: finished.winner.confidence || 'medium'
                };
                
                // Update status to finished
                master.status.current = 'finished';
                
                if (wasEmpty) {
                    updatedCount++;
                    console.log(`✅ Updated ${finished.name}: ${finished.winner.name}`);
                }
            }
        });
        
        // Update metadata
        masterData.metadata.lastUpdated = new Date().toISOString();
        masterData.metadata.lastSync = new Date().toISOString();
        
        // Save updated master data
        fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2));
        
        console.log(`\n🎉 Sync complete! Updated ${updatedCount} tournament winners.`);
        
        return {
            success: true,
            updatedCount,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Sync failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// CLI interface
if (require.main === module) {
    syncWinnersToMaster();
}

module.exports = syncWinnersToMaster;