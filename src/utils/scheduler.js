/**
 * Task Scheduler
 * 
 * Runs periodic tasks like daily revalidation.
 * Uses simple setInterval for now, can be upgraded to node-cron if needed.
 */

const dailyRevalidation = require('../scripts/daily_revalidation');

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

        console.log('[Scheduler] Task scheduler started');
        console.log('[Scheduler] Daily revalidation scheduled for 3:00 AM');
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
