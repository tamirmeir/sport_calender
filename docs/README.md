# 📚 Sport Calendar Documentation

Complete documentation for the Match Calendar system.

## 📂 Documentation Structure

### 📖 [Guides](./guides/)
User and developer guides for working with the system.

- **[Maintenance Guide](./guides/MAINTENANCE_GUIDE.md)** - Daily maintenance, monitoring, and troubleshooting
- **[Manual Data Sources](./guides/MANUAL_DATA_SOURCES.md)** - Where to find manual tournament data when API fails
- **[Missing Winners Guide](./guides/MISSING_WINNERS_GUIDE.md)** - Automated detection system for missing tournament winners
- **[Qualification Zones](./guides/QUALIFICATION_ZONES.md)** - League qualification zones (promotion/relegation)
- **[World Tournament Patterns](./guides/WORLD_TOURNAMENT_PATTERNS.md)** - Tournament scheduling patterns
- **[Tournament Implementation Summary](./guides/TOURNAMENT_IMPLEMENTATION_SUMMARY.md)** - Tournament system implementation
- **[Documentation Update Summary](./guides/DOCUMENTATION_UPDATE_SUMMARY.md)** - Recent documentation changes
- **[Simple Explanation (Hebrew)](./guides/SIMPLE_EXPLANATION_HEBREW.md)** - הסבר פשוט במיוחד בעברית

### ⚙️ [Setup](./setup/)
Installation and configuration guides.

- **[Cron Jobs Setup](./setup/CRON_JOBS_SETUP.md)** - Automated tasks configuration for production
- **[Setup Cron](./setup/SETUP_CRON.md)** - Cron setup instructions
- **[Production SSH Setup](./setup/PRODUCTION_SSH_SETUP.md)** - SSH access configuration for production server
- **[SSH Production Guide](./setup/SSH_PRODUCTION_GUIDE.md)** - SSH production guide
- **[Where to Get SSH Key](./setup/WHERE_TO_GET_SSH_KEY.md)** - SSH key location guide
- **[GitHub Secrets Guide](./setup/GITHUB_SECRET_UPDATE_GUIDE.md)** - Managing GitHub Actions secrets
- **[Secrets Checklist](./setup/GITHUB_SECRETS_CHECKLIST.md)** - Complete secrets checklist
- **[How Secrets Work](./setup/HOW_SECRETS_WORK.md)** - Understanding the secrets system

### 🏗️ [Architecture](./architecture/)
System architecture and design documentation.

- **[Architecture](./architecture/ARCHITECTURE.md)** - Complete system architecture
- **[Architecture Quick Reference](./architecture/ARCHITECTURE_QUICK_REF.md)** - High-level system overview
- **[Smart Tournament Architecture](./architecture/SMART_TOURNAMENT_ARCHITECTURE.md)** - Tournament system design
- **[API Reference](./architecture/API_REFERENCE.md)** - Complete API endpoint reference
- **[API Data Flow](./architecture/API_DATA_FLOW.md)** - Data flow through the API
- **[HTTP Requests Flow](./architecture/HTTP_REQUESTS_FLOW.md)** - Request routing and API endpoints
- **[File Reference](./architecture/FILE_REFERENCE.md)** - Project file structure reference
- **[Data Sources Visual](./architecture/DATA_SOURCES_VISUAL.md)** - Data flow and sources visualization

### 🚀 [Deployment](./deployment/)
Deployment processes and production management.

- **[Deployment](./deployment/DEPLOYMENT.md)** - Deployment process overview
- **[Deployment Status](./deployment/DEPLOYMENT_STATUS.md)** - Current deployment status and history
- **[Production Guide](./deployment/PRODUCTION_GUIDE.md)** - Production server management guide
- **[Production Fix Summary](./deployment/PRODUCTION_FIX_SUMMARY.md)** - Summary of production fixes applied
- **[Pre-Push Checklist](./deployment/README_BEFORE_PUSHING.md)** - Checklist before pushing to production
- **[Server Commands](./deployment/RUN_THIS_ON_SERVER.md)** - Common server management commands

### 🔧 [Troubleshooting](./troubleshooting/)
Common issues and their solutions.

- **[Before/After Fix](./troubleshooting/BEFORE_AFTER_FIX.md)** - Comparison of fixes applied
- **[Quick Fixes](./troubleshooting/FIX_NOW.md)** - Quick fix commands for common issues
- **[Manual Fixes](./troubleshooting/MANUAL_FIX.md)** - Step-by-step manual fix procedures
- **[Fix GitHub Actions](./troubleshooting/FIX_GITHUB_ACTIONS.md)** - GitHub Actions troubleshooting
- **[Current State Analysis](./troubleshooting/CURRENT_STATE_ANALYSIS.md)** - System state analysis
- **[Validation Report](./troubleshooting/VALIDATION_REPORT_2026-02-05.md)** - Latest validation report
- **[סיכום התיקון](./troubleshooting/סיכום_התיקון.md)** - סיכום התיקונים בעברית

---

## 🎯 Quick Start

### For Developers
1. Start with [Architecture Quick Reference](./architecture/ARCHITECTURE_QUICK_REF.md)
2. Read [Maintenance Guide](./guides/MAINTENANCE_GUIDE.md)
3. Set up [Cron Jobs](./setup/CRON_JOBS_SETUP.md)

### For Operations
1. Read [Production SSH Setup](./setup/PRODUCTION_SSH_SETUP.md)
2. Review [Deployment Status](./deployment/DEPLOYMENT_STATUS.md)
3. Keep [Server Commands](./deployment/RUN_THIS_ON_SERVER.md) handy

### For Data Management
1. Check [Manual Data Sources](./guides/MANUAL_DATA_SOURCES.md)
2. Use [Missing Winners Guide](./guides/MISSING_WINNERS_GUIDE.md)
3. Follow [Maintenance Guide](./guides/MAINTENANCE_GUIDE.md)

---

## 📊 System Overview

### Architecture
- **Frontend**: Node.js/Express (Port 3000)
- **Backend**: Python/Flask (Port 8000)
- **Proxy**: Nginx (Ports 80/443)
- **Data Source**: API-Sports.io
- **Process Manager**: PM2

### Key Features
- 208 tournaments from 50+ countries
- Automated winner detection
- Real-time match data
- Golden cards for tournament winners
- Multi-season support (European, Calendar, Asian)

### Data Coverage
- 🇪🇺 Europe: 83 tournaments
- 🌍 Global/Continental: 32 tournaments
- 🇧🇷 South America: 28 tournaments
- 🇯🇵 Asia: 21 tournaments
- 🇸🇦 Middle East: 18 tournaments
- 🇿🇦 Africa: 14 tournaments
- 🇺🇸 North America: 8 tournaments

---

## 🔗 External Resources

- **Production Site**: https://matchdaybytm.com
- **API Documentation**: https://www.api-football.com/documentation-v3
- **GitHub Repository**: [Sport Calendar](https://github.com/tamirmeir/sport_calender)

---

## 📝 Contributing

When adding new documentation:
1. Place in the appropriate directory
2. Update this README with a link
3. Follow markdown best practices
4. Include code examples where relevant

---

## 🆘 Support

For issues or questions:
1. Check [Troubleshooting](./troubleshooting/) first
2. Review [Maintenance Guide](./guides/MAINTENANCE_GUIDE.md)
3. Contact: 4tamirmeir@gmail.com

---

**Last Updated**: February 6, 2026  
**Version**: 2.0  
**Status**: ✅ Production Ready
