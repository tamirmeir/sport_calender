#!/usr/bin/env node

/**
 * Automated Data Quality Monitor
 * Runs validation checks and monitors data health
 */

const TournamentDataValidator = require('./tournament_data_validator');
const syncWinnersToMaster = require('./sync_winners_to_master');
const GlobalWinnerDetector = require('./global_winner_detector');

class DataQualityMonitor {
    constructor() {
        this.validator = new TournamentDataValidator();
        this.qualityThresholds = {
            minSuccessRate: 80,      // 80% of validations must pass
            minConfidence: 70,       // Average confidence must be 70%+
            maxFailures: 2,          // Max 2 tournaments can fail validation
            maxDataAge: 7            // Data older than 7 days triggers refresh
        };
    }

    async runQualityCheck() {
        console.log('🔍 AUTOMATED DATA QUALITY CHECK');
        console.log('=' .repeat(50));
        console.log(`Started: ${new Date().toISOString()}`);
        
        const report = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            checks: {},
            actions: [],
            recommendations: []
        };

        try {
            // 1. Validate existing tournament data
            report.checks.validation = await this.runValidationCheck();
            
            // 2. Check data freshness
            report.checks.freshness = await this.checkDataFreshness();
            
            // 3. Check for missing winners
            report.checks.completeness = await this.checkDataCompleteness();
            
            // 4. Determine overall health
            report.overall = this.calculateOverallHealth(report.checks);
            
            // 5. Generate action plan
            report.actions = this.generateActionPlan(report.checks);
            
            this.printReport(report);
            
            return report;
            
        } catch (error) {
            console.error('❌ Quality check failed:', error.message);
            report.overall = 'error';
            report.error = error.message;
            return report;
        }
    }

    async runValidationCheck() {
        console.log('\n🔍 Running tournament data validation...');
        
        const testTournaments = [
            { id: 385, name: 'Toto Cup Ligat Al', season: 2025 },
            { id: 659, name: 'Israeli Super Cup', season: 2025 },
            { id: 533, name: 'CAF Super Cup', season: 2025 },
            { id: 1, name: 'World Cup', season: 2022 },
            { id: 4, name: 'Euro Championship', season: 2024 }
        ];

        const results = await this.validator.validateMultipleTournaments(testTournaments);
        
        const successRate = (results.passed / results.total) * 100;
        const avgConfidence = results.details.reduce((sum, d) => sum + d.confidence, 0) / 
                             results.details.length * 100;

        return {
            status: successRate >= this.qualityThresholds.minSuccessRate ? 'pass' : 'fail',
            successRate: Math.round(successRate),
            averageConfidence: Math.round(avgConfidence),
            totalTournaments: results.total,
            passed: results.passed,
            failed: results.failed,
            details: results.details
        };
    }

    async checkDataFreshness() {
        console.log('\n📅 Checking data freshness...');
        
        const fs = require('fs');
        const path = require('path');
        
        try {
            const finishedPath = path.join(__dirname, '../data/finished_tournaments.json');
            const finishedData = JSON.parse(fs.readFileSync(finishedPath, 'utf8'));
            
            const lastUpdate = finishedData.metadata?.last_updated;
            const daysSinceUpdate = lastUpdate ? 
                (Date.now() - new Date(lastUpdate)) / (1000 * 60 * 60 * 24) : 999;
                
            return {
                status: daysSinceUpdate <= this.qualityThresholds.maxDataAge ? 'fresh' : 'stale',
                lastUpdate,
                daysSinceUpdate: Math.round(daysSinceUpdate),
                threshold: this.qualityThresholds.maxDataAge
            };
            
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async checkDataCompleteness() {
        console.log('\n📊 Checking data completeness...');
        
        const fs = require('fs');
        const path = require('path');
        
        try {
            const masterPath = path.join(__dirname, '../data/world_tournaments_master.json');
            const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
            
            const tournaments = Object.values(masterData.tournaments || {});
            const finishedTournaments = tournaments.filter(t => t.status?.current === 'finished');
            const tournamentsWithWinners = tournaments.filter(t => t.winner?.hasWinner);
            
            const completeness = finishedTournaments.length > 0 ? 
                (tournamentsWithWinners.length / finishedTournaments.length) * 100 : 100;
                
            return {
                status: completeness >= 80 ? 'complete' : 'incomplete',
                totalTournaments: tournaments.length,
                finishedTournaments: finishedTournaments.length,
                tournamentsWithWinners: tournamentsWithWinners.length,
                completeness: Math.round(completeness),
                missingWinners: finishedTournaments.length - tournamentsWithWinners.length
            };
            
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    calculateOverallHealth(checks) {
        const scores = {
            validation: checks.validation?.status === 'pass' ? 1 : 0,
            freshness: checks.freshness?.status === 'fresh' ? 1 : 0,
            completeness: checks.completeness?.status === 'complete' ? 1 : 0
        };
        
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const maxScore = Object.keys(scores).length;
        
        if (totalScore === maxScore) return 'excellent';
        if (totalScore >= maxScore * 0.8) return 'good';
        if (totalScore >= maxScore * 0.6) return 'fair';
        return 'poor';
    }

    generateActionPlan(checks) {
        const actions = [];
        
        if (checks.validation?.status === 'fail') {
            actions.push({
                priority: 'high',
                action: 'investigate_validation_failures',
                description: 'Some tournaments failed validation - check API responses and data quality'
            });
        }
        
        if (checks.freshness?.status === 'stale') {
            actions.push({
                priority: 'medium',
                action: 'refresh_winner_data',
                description: `Data is ${checks.freshness.daysSinceUpdate} days old - run winner detection`
            });
        }
        
        if (checks.completeness?.missingWinners > 0) {
            actions.push({
                priority: 'medium',
                action: 'detect_missing_winners',
                description: `${checks.completeness.missingWinners} tournaments missing winner data`
            });
        }
        
        if (actions.length === 0) {
            actions.push({
                priority: 'low',
                action: 'maintain_quality',
                description: 'Data quality is good - continue regular monitoring'
            });
        }
        
        return actions;
    }

    printReport(report) {
        console.log('\n📋 QUALITY REPORT SUMMARY');
        console.log('=' .repeat(30));
        
        const healthEmoji = {
            excellent: '🟢',
            good: '🟡', 
            fair: '🟠',
            poor: '🔴',
            error: '💥'
        };
        
        console.log(`Overall Health: ${healthEmoji[report.overall]} ${report.overall.toUpperCase()}`);
        
        if (report.checks.validation) {
            const v = report.checks.validation;
            console.log(`\nValidation: ${v.passed}/${v.totalTournaments} passed (${v.successRate}%)`);
            console.log(`Average Confidence: ${v.averageConfidence}%`);
        }
        
        if (report.checks.freshness) {
            const f = report.checks.freshness;
            console.log(`\nData Age: ${f.daysSinceUpdate} days (${f.status})`);
        }
        
        if (report.checks.completeness) {
            const c = report.checks.completeness;
            console.log(`\nCompleteness: ${c.completeness}% (${c.missingWinners} missing)`);
        }
        
        console.log('\n🎯 RECOMMENDED ACTIONS:');
        report.actions.forEach((action, i) => {
            const priorityEmoji = { high: '🔥', medium: '⚡', low: '📝' };
            console.log(`   ${i + 1}. ${priorityEmoji[action.priority]} ${action.description}`);
        });
    }

    async autoFix(report) {
        console.log('\n🔧 AUTO-FIX ATTEMPTING...');
        
        const autoFixResults = [];
        
        for (const action of report.actions) {
            try {
                switch (action.action) {
                    case 'detect_missing_winners':
                        console.log('   🤖 Running winner detection...');
                        const detector = new GlobalWinnerDetector();
                        const results = await detector.detectAllMissingWinners();
                        autoFixResults.push({
                            action: action.action,
                            success: true,
                            result: `Detected ${results.detected} new winners`
                        });
                        
                        if (results.detected > 0) {
                            console.log('   🔄 Syncing to master data...');
                            await syncWinnersToMaster();
                        }
                        break;
                        
                    case 'refresh_winner_data':
                        console.log('   🔄 Refreshing winner data...');
                        await syncWinnersToMaster();
                        autoFixResults.push({
                            action: action.action,
                            success: true,
                            result: 'Winner data refreshed'
                        });
                        break;
                        
                    default:
                        autoFixResults.push({
                            action: action.action,
                            success: false,
                            result: 'Manual intervention required'
                        });
                }
            } catch (error) {
                autoFixResults.push({
                    action: action.action,
                    success: false,
                    result: `Auto-fix failed: ${error.message}`
                });
            }
        }
        
        console.log('\n✅ AUTO-FIX RESULTS:');
        autoFixResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${status} ${result.action}: ${result.result}`);
        });
        
        return autoFixResults;
    }
}

// CLI interface
if (require.main === module) {
    const monitor = new DataQualityMonitor();
    const shouldAutoFix = process.argv.includes('--auto-fix');
    
    monitor.runQualityCheck()
        .then(async (report) => {
            if (shouldAutoFix && report.overall !== 'excellent') {
                await monitor.autoFix(report);
                
                // Re-run quality check to verify fixes
                console.log('\n🔄 Re-checking quality after auto-fix...');
                const newReport = await monitor.runQualityCheck();
                
                if (newReport.overall === 'excellent') {
                    console.log('🎉 Auto-fix successful! Data quality is now excellent.');
                    process.exit(0);
                } else {
                    console.log('⚠️  Some issues remain after auto-fix. Manual intervention may be needed.');
                    process.exit(1);
                }
            } else {
                process.exit(report.overall === 'excellent' || report.overall === 'good' ? 0 : 1);
            }
        })
        .catch(error => {
            console.error('💥 Quality monitor failed:', error);
            process.exit(1);
        });
}

module.exports = DataQualityMonitor;