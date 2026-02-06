# Missing Winners Detection System

## 🎯 Purpose
Automatically scan ALL tournaments from API-Sports and detect:
- ✅ Finished tournaments (Cups/Super Cups) not in our database
- ⚠️ Status mismatches (finished in API but not marked in our DB)
- 📊 Comprehensive coverage across all countries

## 📁 Scripts

### 1. `detect_missing_winners.js`
**Main detection script** - Scans all tournaments and generates report

**Usage:**
```bash
cd /var/www/sport_calendar  # or local path
node src/scripts/detect_missing_winners.js
```

**What it does:**
1. Scans 50+ countries for Cup tournaments
2. Checks latest fixtures for each tournament
3. Identifies finished matches with clear winners
4. Compares against our `finished_tournaments.json`
5. Generates detailed report: `missing_winners_report.json`

**Output:**
- Console: List of missing/mismatched tournaments
- File: `missing_winners_report.json` with full details
- Log: Saved to `~/logs/sport_calendar/missing.log` (if cron)

---

### 2. `add_missing_tournament.js`
**Quick add helper** - Adds a specific tournament from the report

**Usage:**
```bash
node src/scripts/add_missing_tournament.js <tournament_id>
```

**Example:**
```bash
# After detection finds Tunisia Super Cup (ID: 1194)
node src/scripts/add_missing_tournament.js 1194
```

**What it does:**
1. Reads tournament details from `missing_winners_report.json`
2. Adds entry to `finished_tournaments.json`
3. Adds full metadata to `world_tournaments_master.json`
4. Shows git diff and next steps

---

## 🤖 Automated Schedule (Crontab)

**Production crontab** runs detection weekly:

```cron
# Weekly missing tournaments detection (Monday 02:00 UTC)
0 2 * * 1 cd /var/www/sport_calendar && node src/scripts/detect_missing_winners.js >> ~/logs/sport_calendar/missing.log 2>&1
```

**Why Monday 2 AM?**
- After weekend matches finish
- Before most people check the site
- Gives time to review and add missing data

---

## 🔄 Workflow

### Automated (Cron):
```
Monday 02:00 → detect_missing_winners.js runs
               ↓
          Generates report
               ↓
     Email/log notification (if issues found)
               ↓
     Manual review required
```

### Manual (When needed):
```bash
# 1. Run detection
node src/scripts/detect_missing_winners.js

# 2. Review report
cat missing_winners_report.json

# 3. Add missing tournaments
node src/scripts/add_missing_tournament.js 1194
node src/scripts/add_missing_tournament.js 567

# 4. Test
node src/scripts/comprehensive_test.js

# 5. Commit
git add src/data/
git commit -m "feat: add missing tournaments X, Y, Z"
git push origin main
```

---

## 📊 Report Format

### `missing_winners_report.json`
```json
{
  "timestamp": "2026-02-06T18:00:00Z",
  "scanDuration": "123.5",
  "statistics": {
    "totalScanned": 500,
    "cupsScanned": 85,
    "missingCount": 3,
    "mismatchCount": 1
  },
  "missingTournaments": [
    {
      "leagueId": 1194,
      "leagueName": "Super Cup",
      "country": "Tunisia",
      "winner": {
        "name": "ES Tunis",
        "id": 980,
        "logo": "https://..."
      },
      "matchDate": "2025-01-15T...",
      "score": "1-0",
      "teams": "ES Tunis vs Stade Tunisien",
      "reason": "NOT_IN_DATABASE"
    }
  ],
  "statusMismatches": [...]
}
```

---

## 🌍 Countries Scanned

**Current coverage:**
- **Europe**: England, Spain, Italy, Germany, France, Portugal, Netherlands, Belgium, Turkey, Greece, Ukraine, Russia, Poland, Austria, Switzerland, Croatia
- **Africa**: Tunisia, Algeria, Morocco, Egypt, South Africa, Nigeria, Ghana, Kenya, Senegal, Cameroon, Ivory Coast
- **Middle East**: Israel, Saudi Arabia, UAE, Qatar, Jordan, Iraq
- **Asia**: Japan, South Korea, China, Australia, India, Thailand, Malaysia
- **South America**: Brazil, Argentina, Uruguay, Chile, Colombia, Peru, Ecuador
- **North America**: USA, Mexico, Canada, Costa Rica
- **Global**: World tournaments

**Total: 50+ countries**

---

## 🔧 Customization

### Add more countries:
Edit `src/scripts/detect_missing_winners.js`:
```javascript
const COUNTRIES = [
    // ... existing countries ...
    'Your-Country',  // Add here
];
```

### Change detection criteria:
```javascript
// Current: Cups and Super Cups
const isCup = league.type === 'Cup' || 
             league.name.toLowerCase().includes('cup');

// Modify to include other types:
const isCup = league.type === 'Cup' || 
             league.type === 'League' ||  // Add leagues
             league.name.toLowerCase().includes('playoff');  // Add playoffs
```

---

## 📈 Performance

**Typical run:**
- Duration: 2-5 minutes (with rate limiting)
- API calls: ~200-300
- Rate limit: 200ms between requests
- Memory: < 50MB

**API considerations:**
- Uses existing FOOTBALL_API_KEY
- Respects rate limits (200ms delay)
- Only checks last 10 fixtures per tournament
- Focuses on Cups to reduce load

---

## 🚨 Notifications

**When issues found:**
1. Exit code 1 (allows monitoring tools to alert)
2. Report saved to `missing_winners_report.json`
3. Log written to `~/logs/sport_calendar/missing.log`

**Integration options:**
```bash
# Email on issues
0 2 * * 1 cd /var/www/sport_calendar && node src/scripts/detect_missing_winners.js >> ~/logs/sport_calendar/missing.log 2>&1 || mail -s "Missing Tournaments Detected" you@email.com < missing_winners_report.json

# Slack webhook
0 2 * * 1 cd /var/www/sport_calendar && node src/scripts/detect_missing_winners.js && [ -s missing_winners_report.json ] && curl -X POST -H 'Content-type: application/json' --data @missing_winners_report.json YOUR_SLACK_WEBHOOK
```

---

## ✅ Benefits

1. **Proactive Detection**: Find missing data before users report it
2. **Comprehensive Coverage**: Scans 50+ countries automatically
3. **Easy Addition**: One command to add missing tournament
4. **Quality Assurance**: Catches Tunisia Super Cup type issues
5. **Weekly Updates**: Stays current with minimal manual work
6. **Audit Trail**: Full reports for every scan

---

## 🎓 Real Example: Tunisia Super Cup

**Before this system:**
- User reports: "Tunisia Super Cup shows teams but no winner"
- Manual investigation required
- Had to search API manually
- Took ~30 minutes to fix

**With this system:**
1. Monday 2 AM: Script detects Tunisia Super Cup (1194)
2. Report shows: ES Tunis beat Stade Tunisien 1-0
3. Run: `node add_missing_tournament.js 1194`
4. Commit, push, done!
5. **Total time: 2 minutes**

---

## 📞 Troubleshooting

**Script fails with "API KEY not set":**
```bash
# Check environment
echo $FOOTBALL_API_KEY

# Set if missing (production)
export FOOTBALL_API_KEY=your_key_here

# Or use .env file (development)
source .env
```

**Too many API calls:**
- Reduce countries in COUNTRIES array
- Increase delay between requests
- Run less frequently (bi-weekly instead of weekly)

**False positives:**
- Review `missing_winners_report.json` manually
- Some tournaments may have different finals format
- Check API-Sports match details to confirm

---

## 🔄 Maintenance

**Weekly:**
- Review detection log: `tail -100 ~/logs/sport_calendar/missing.log`
- Add any missing tournaments found
- Check for API errors or rate limit issues

**Monthly:**
- Review coverage: Are we missing important countries?
- Update COUNTRIES list if needed
- Validate existing tournament data

**Quarterly:**
- Full manual scan and verification
- Update detection criteria if tournament formats change
- Review and optimize API usage

---

## 📚 Related Scripts

- `comprehensive_test.js` - Validates all tournament data
- `test_all_tournaments.js` - Checks consistency between files
- `winner_verification.js` - Legacy winner detection (simpler)
- `auto_commit_winners.sh` - Auto-commits detected changes

---

**Created**: 2026-02-06  
**Last Updated**: 2026-02-06  
**Version**: 1.0.0
