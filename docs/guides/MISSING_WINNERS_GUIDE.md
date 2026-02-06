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

**Comprehensive global coverage - 150+ countries:**

### **Europe (50+ countries)**
- **Western**: England, Spain, Italy, Germany, France, Portugal, Netherlands, Belgium, Switzerland, Austria, Scotland, Wales, Ireland, Luxembourg
- **Eastern**: Russia, Ukraine, Poland, Czech Republic, Slovakia, Hungary, Romania, Bulgaria, Serbia, Croatia, Slovenia, Bosnia, Montenegro, Albania, Macedonia, Kosovo, Moldova, Belarus
- **Northern**: Denmark, Sweden, Norway, Finland, Iceland, Estonia, Latvia, Lithuania
- **Southern**: Greece, Turkey, Cyprus, Georgia, Armenia, Azerbaijan, Malta

### **Africa (50+ countries)**
- **North**: Morocco, Algeria, Tunisia, Libya, Egypt
- **West**: Nigeria, Ghana, Ivory Coast, Senegal, Mali, Burkina Faso, Guinea, Benin, Togo, Niger, Gambia, Sierra Leone, Liberia, Cape Verde
- **Central**: Cameroon, DR Congo, Congo, Gabon, Equatorial Guinea, Chad, CAR, Sao Tome
- **East**: Kenya, Uganda, Tanzania, Ethiopia, Sudan, South Sudan, Rwanda, Burundi, Djibouti, Somalia, Eritrea, Comoros
- **Southern**: South Africa, Zimbabwe, Zambia, Angola, Mozambique, Namibia, Botswana, Malawi, Lesotho, Swaziland, Madagascar, Mauritius, Seychelles

### **Middle East (13 countries)**
Israel, Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman, Jordan, Lebanon, Syria, Iraq, Palestine, Yemen

### **Asia (30+ countries)**
- **East**: China, Japan, South Korea, North Korea, Hong Kong, Taiwan, Mongolia
- **South**: India, Pakistan, Bangladesh, Sri Lanka, Nepal, Bhutan, Maldives, Afghanistan
- **Southeast**: Thailand, Vietnam, Malaysia, Singapore, Indonesia, Philippines, Myanmar, Cambodia, Laos, Brunei, Timor Leste
- **Central**: Kazakhstan, Uzbekistan, Turkmenistan, Kyrgyzstan, Tajikistan, Iran

### **South America (13 countries)**
Brazil, Argentina, Uruguay, Chile, Paraguay, Peru, Colombia, Ecuador, Venezuela, Bolivia, Guyana, Suriname, French Guyana

### **North America & Caribbean (40+ countries)**
- **North America**: USA, Mexico, Canada
- **Central America**: Costa Rica, Panama, Honduras, Nicaragua, El Salvador, Guatemala, Belize
- **Caribbean**: Jamaica, Trinidad & Tobago, Haiti, Cuba, Dominican Republic, Puerto Rico, Guadeloupe, Martinique, Curacao, Aruba, Barbados, Grenada, Saint Lucia, and more island nations

### **Oceania (12+ countries)**
Australia, New Zealand, Fiji, Papua New Guinea, New Caledonia, Tahiti, Solomon Islands, Vanuatu, Samoa, American Samoa, Tonga, Cook Islands

### **Global**
World tournaments (FIFA competitions)

**Total: 150+ countries - nearly complete FIFA membership coverage!**

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

**Typical run (150+ countries):**
- Duration: 10-20 minutes (with rate limiting)
- API calls: ~500-800
- Rate limit: 200ms between requests
- Memory: < 100MB

**API considerations:**
- Uses existing FOOTBALL_API_KEY
- Respects rate limits (200ms delay)
- Only checks last 10 fixtures per tournament
- Focuses on Cups to reduce load
- Can be run less frequently (weekly is fine)

**Optimization tips:**
- Most countries have < 10 leagues
- Filter reduces API load (only checks Cups)
- Runs during low-traffic hours (Monday 2 AM)
- Results cached in JSON report

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
