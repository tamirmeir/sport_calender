# Proposed Improved Data Structure

## Problem
Currently we check for upcoming matches on EVERY request because we can't trust API's `endDate`.
This wastes API quota and slows down responses.

## Solution: Smart Caching with Validation Windows

### New Structure for finished_tournaments.json

```json
{
  "101": {
    "name": "J-League Cup",
    "country": "Japan",
    "year": 2024,
    "status": "finished",
    "winner": {
      "name": "Nagoya Grampus",
      "logo": "https://...",
      "id": 305
    },
    "season": {
      "apiEndDate": "2024-11-30",      // From API (not reliable!)
      "actualEndDate": "2024-11-02",   // Actual final match date
      "verifiedDate": "2026-02-06",    // When we last verified
      "confidence": "high"              // high/medium/low
    },
    "validation": {
      "lastChecked": "2026-02-06T23:00:00Z",
      "nextCheck": "2026-03-06",       // Only recheck after this date
      "method": "upcoming_matches_check",
      "checksPerformed": 3
    }
  }
}
```

### Logic Flow

```
Request: /api/fixtures/leagues?country=Japan
    ↓
1. Is tournament in finished_tournaments.json?
    NO → Call API, return active
    YES → Continue ↓
    
2. Check validation.nextCheck
    nextCheck > today → Return cached "finished" ✅ (No API call!)
    nextCheck < today → Continue ↓
    
3. Check for upcoming matches (API call)
    Has upcoming → Remove from finished, mark active
    No upcoming → Update nextCheck = today + 30 days, return "finished"
```

### Benefits

1. **Reduces API calls by ~90%**
   - Only check once per month instead of every request
   
2. **Handles edge cases**
   - Tournament rescheduled? Will be caught on next check
   - Extra playoff rounds added? Will be detected
   
3. **Self-healing**
   - Wrong data automatically corrected on next validation window
   
4. **Audit trail**
   - Can see when/how each tournament was validated

### Implementation Priority

#### Phase 1: Add validation metadata (Low risk)
- Add `validation` object to finished tournaments
- Set `nextCheck = actualEndDate + 30 days`
- No behavior change yet

#### Phase 2: Implement smart caching (High impact)
- Check `nextCheck` before API calls
- Skip API if within validation window
- Reduces API calls by 90%

#### Phase 3: Confidence scoring (Future enhancement)
- Track historical accuracy per tournament
- Adjust validation frequency based on confidence
- High confidence → check every 60 days
- Low confidence → check every 15 days

## Example API Call Reduction

### Before (Current):
```
User views Japan page:
  → Check 3 finished tournaments for upcoming matches (3 API calls)
  → 1000 page views/day = 3000 API calls/day
```

### After (Proposed):
```
User views Japan page:
  → Check validation.nextCheck (0 API calls if within window)
  → 1000 page views/day = ~100 API calls/day (only for expired windows)
  
Reduction: 97% fewer API calls!
```

## Migration Path

1. Run `validate_all_finished.js` to get current state
2. Add validation metadata to all tournaments
3. Deploy with smart caching enabled
4. Monitor for 1 week
5. If stable, increase validation window to 60 days

## Code Changes Required

### 1. fixtures.js - Check validation window
```javascript
function shouldRevalidateTournament(tournament) {
  const nextCheck = new Date(tournament.validation?.nextCheck || 0);
  return new Date() > nextCheck;
}
```

### 2. validate_all_finished.js - Update validation metadata
```javascript
tournament.validation = {
  lastChecked: new Date().toISOString(),
  nextCheck: addDays(new Date(), 30),
  method: 'upcoming_matches_check',
  checksPerformed: (tournament.validation?.checksPerformed || 0) + 1
};
```

### 3. New cron job: Weekly validation of expired windows
```javascript
// Only check tournaments where nextCheck has passed
const needsRevalidation = tournaments.filter(t => shouldRevalidateTournament(t));
```

## Expected Results

- **API Quota Usage**: -90%
- **Response Time**: -50ms (no API wait)
- **Data Accuracy**: Same (still validates regularly)
- **Maintenance**: Automated with cron job
