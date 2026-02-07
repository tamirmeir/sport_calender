/**
 * Task Scheduler
 * 
 * Runs periodic tasks like daily revalidation and weekly format validation.
 * Uses simple setInterval for now, can be upgraded to node-cron if needed.
 */

const dailyRevalidation = require('../scripts/daily_revalidation');
const { execFile } = require('child_process');
const path = require('path');

class Scheduler {
    constructor() {
        this.tasks = [];
    }

    /**
     * Start the scheduler
     */
    start() {
        console.log('[Scheduler] Starting task scheduler...');

        // Daily revalidation - runs every 24 hours at 3 AM
        this.scheduleDailyTask(3, 0, async () => {
            console.log('[Scheduler] Running daily revalidation task');
            await dailyRevalidation();
        });

        // Weekly format validation - runs every Sunday at 4 AM
        this.scheduleWeeklyTask(0, 4, 0, async () => {  // 0 = Sunday
            console.log('[Scheduler] Running weekly tournament format validation');
            await this.runFormatValidation();
        });

        console.log('[Scheduler] Task scheduler started');
        console.log('[Scheduler] Daily revalidation scheduled for 3:00 AM');
        console.log('[Scheduler] Weekly format validation scheduled for Sunday 4:00 AM');
    }

    /**
     * Run tournament format validation
     */
    async runFormatValidation() {
        const scriptPath = path.resolve(__dirname, '../scripts/validate_tournament_formats.js');
        const season = new Date().getFullYear();
        
        return new Promise((resolve, reject) => {
            execFile('node', [scriptPath, season], (error, stdout, stderr) => {
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);
                
                if (error) {
                    console.error('[Scheduler] Format validation failed:', error);
                    reject(error);
                } else {
                    console.log('[Scheduler] Format validation completed');
                    resolve();
                }
            });
        });
    }

    /**
     * Schedule a task to run daily at specific time
     */
    scheduleDailyTask(hour, minute, callback) {
        const runTask = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (currentHour === hour && currentMinute === minute) {
                callback().catch(err => {
                    console.error('[Scheduler] Task failed:', err);
                });
            }
        };

        // Check every minute
        const interval = setInterval(runTask, 60 * 1000);
        this.tasks.push(interval);

        // Also calculate next run time
        const now = new Date();
        const nextRun = new Date(now);
        nextRun.setHours(hour, minute, 0, 0);
        
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        const hoursUntil = Math.floor((nextRun - now) / (1000 * 60 * 60));
        const minutesUntil = Math.floor(((nextRun - now) % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`[Scheduler] Next run in ${hoursUntil}h ${minutesUntil}m`);
    }

    /**
     * Schedule a task to run weekly on specific day and time
     * @param {number} dayOfWeek - 0 = Sunday, 1 = Monday, ..., 6 = Saturday
     * @param {number} hour - Hour (0-23)
     * @param {number} minute - Minute (0-59)
     * @param {Function} callback - Task to run
     */
    scheduleWeeklyTask(dayOfWeek, hour, minute, callback) {
        const runTask = () => {
            const now = new Date();
            const currentDay = now.getDay();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (currentDay === dayOfWeek && currentHour === hour && currentMinute === minute) {
                callback().catch(err => {
                    console.error('[Scheduler] Weekly task failed:', err);
                });
            }
        };

        // Check every minute
        const interval = setInterval(runTask, 60 * 1000);
        this.tasks.push(interval);

        // Calculate next run time
        const now = new Date();
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;  // Next occurrence of that day
        const nextRun = new Date(now);
        nextRun.setDate(now.getDate() + daysUntil);
        nextRun.setHours(hour, minute, 0, 0);
        
        // If it's today but already passed, add 7 days
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 7);
        }

        const daysUntilRun = Math.floor((nextRun - now) / (1000 * 60 * 60 * 24));
        console.log(`[Scheduler] Weekly task scheduled, next run in ${daysUntilRun} days`);
    }

    /**
     * Stop all scheduled tasks
     */
    stop() {
        console.log('[Scheduler] Stopping scheduler...');
        this.tasks.forEach(interval => clearInterval(interval));
        this.tasks = [];
        console.log('[Scheduler] Scheduler stopped');
    }
}

module.exports = new Scheduler();
