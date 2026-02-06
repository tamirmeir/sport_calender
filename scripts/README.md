# 📜 Scripts Directory

Collection of utility scripts for development, deployment, and maintenance.

## 📂 Directory Structure

### 🚀 [deployment/](./deployment/)
Scripts for deploying to production servers.

- **deploy_droplet.sh** - Main deployment script for DigitalOcean droplet
- **update_production_jwt.sh** - Update JWT secrets on production

### 🔧 [maintenance/](./maintenance/)
Scripts for system maintenance and administration.

- **admin.sh** - Administrative tasks and utilities
- **setup.sh** - Initial system setup script
- **kill_ports.sh** - Kill processes on specific ports

### 🛠️ [dev-tools/](./dev-tools/)
Development and debugging utilities.

- **check_national_team.js** - Verify national team data
- **debug_national_team.js** - Debug national team issues
- **test_zones.py** - Test qualification zones
- **verify_confederations.py** - Verify confederation data
- **append_auth.py** - Authentication utilities
- **update_js.py** - JavaScript update utilities

### 📊 [src/scripts/](../src/scripts/)
Production automation scripts (in src directory).

- **winner_verification.js** - Automated winner detection
- **detect_missing_winners.js** - Find missing tournament winners
- **bulk_add_tournaments.js** - Bulk add tournaments
- **health_check.js** - System health checks
- **quick_check.js** - Quick validation
- **validate_leagues_batch.js** - League validation
- **auto_commit_winners.sh** - Auto-commit detected winners
- And more...

## 🎯 Usage

### Deployment
```bash
# Deploy to production
./scripts/deployment/deploy_droplet.sh

# Update JWT secrets
./scripts/deployment/update_production_jwt.sh
```

### Maintenance
```bash
# Run admin tasks
./scripts/maintenance/admin.sh

# Kill port 3000
./scripts/maintenance/kill_ports.sh 3000
```

### Development
```bash
# Check national teams
node scripts/dev-tools/check_national_team.js

# Verify confederations
python scripts/dev-tools/verify_confederations.py
```

## ⚠️ Important Notes

- Always test scripts in development before production
- Check script permissions: `chmod +x script.sh`
- Review script contents before execution
- Keep sensitive data in `.env` files

## 📝 Adding New Scripts

When adding new scripts:
1. Place in appropriate subdirectory
2. Add execute permissions if needed
3. Update this README
4. Document usage and requirements
5. Add error handling and logging

---

**Last Updated**: February 7, 2026
