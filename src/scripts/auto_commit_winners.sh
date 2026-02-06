#!/bin/bash

# Auto Commit Winners Script
# Checks if there are changes in data files and commits them

REPO_DIR="/var/www/sport_calendar"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

echo "$LOG_PREFIX Auto-commit script started"

# Change to repo directory
cd "$REPO_DIR" || exit 1

# Check if git repo
if [ ! -d ".git" ]; then
    echo "$LOG_PREFIX ERROR: Not a git repository"
    exit 1
fi

# Check for changes in data files
if git diff --quiet src/data/finished_tournaments.json src/data/world_tournaments_master.json; then
    echo "$LOG_PREFIX No changes detected in data files"
    exit 0
fi

echo "$LOG_PREFIX Changes detected in data files"

# Show what changed
echo "$LOG_PREFIX Changed files:"
git status --short src/data/

# Get list of changed tournaments
CHANGED_TOURNAMENTS=$(git diff src/data/finished_tournaments.json | grep -E '^\+.*"name"' | sed 's/.*"name": "\(.*\)".*/\1/' | tr '\n' ', ' | sed 's/,$//')

if [ -z "$CHANGED_TOURNAMENTS" ]; then
    CHANGED_TOURNAMENTS="Unknown tournaments"
fi

echo "$LOG_PREFIX Changed tournaments: $CHANGED_TOURNAMENTS"

# Stage changes
git add src/data/finished_tournaments.json
git add src/data/world_tournaments_master.json

# Create commit message
COMMIT_MSG="Auto-update: Tournament winners detected on $(date +%Y-%m-%d)

Updated tournaments: $CHANGED_TOURNAMENTS

- Auto-detected by verify_global_winners.js cron job
- Committed by auto_commit_winners.sh
- Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"

# Commit
if git commit -m "$COMMIT_MSG"; then
    echo "$LOG_PREFIX Changes committed successfully"
    
    # Optional: Auto-push (uncomment if you want auto-push to GitHub)
    # echo "$LOG_PREFIX Pushing to remote..."
    # if git push origin main; then
    #     echo "$LOG_PREFIX Pushed to remote successfully"
    # else
    #     echo "$LOG_PREFIX WARNING: Push to remote failed"
    # fi
else
    echo "$LOG_PREFIX ERROR: Commit failed"
    exit 1
fi

echo "$LOG_PREFIX Auto-commit script completed successfully"
exit 0
