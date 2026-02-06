# 🌐 HTTP Requests Flow - Sport Calendar

## ארכיטקטורת המידע (Data Architecture)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                            │
│                      public/js/app_v2.js                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                    HTTP Requests ↓
                              │
┌──────────────────────────────────────────────────────────────────────┐
│                  Node.js Backend (Port 3000)                          │
│                  src/routes/fixtures.js                               │
└──────────────────────────────────────────────────────────────────────┘
         │                                          │
         ↓ (Live data)                             ↓ (Static data)
┌─────────────────────────┐           ┌────────────────────────────┐
│    API-Sports.io        │           │   Local JSON Files         │
│    External API         │           │   src/data/*.json          │
│    (API Keys required)  │           │   (Manual/Verified Data)   │
└─────────────────────────┘           └────────────────────────────┘
```

---

## 📋 **כל ה-Requests לפי סדר השימוש:**

### 1️⃣ **טעינת מדינות (Countries List)**

**Frontend Request:**
```javascript
GET http://localhost:3000/api/fixtures/countries
```

**Backend (Node.js):**
```javascript
// src/routes/fixtures.js
router.get('/countries', async (req, res) => {
    const countries = await footballApi.getCountries();
    // ↓ קורא ל-API-Sports
});
```

**Data Source:** 
- ✅ **API-Sports.io** - Live API call
- ⚠️ **+** Filtered list מ-`src/data/country_mappings.json` (מסננת מדינות לא רלוונטיות)

**API-Sports URL:**
```
https://v3.football.api-sports.io/countries
```

---

### 2️⃣ **טעינת ליגות למדינה (Leagues by Country)**

**Frontend Request:**
```javascript
GET http://localhost:3000/api/fixtures/leagues?country=Israel
```

**Backend (Node.js):**
```javascript
// src/routes/fixtures.js
router.get('/leagues', async (req, res) => {
    // 1. קריאה ל-API-Sports
    const allLeagues = await footballApi.getLeagues(country);
    
    // 2. טעינת finished tournaments (LOCAL FILE)
    const finishedData = JSON.parse(fs.readFileSync('finished_tournaments.json'));
    
    // 3. שילוב: API data + Local status
    const leaguesWithStatus = allLeagues.map(league => {
        const tournamentInfo = finishedData[league.id];
        if (tournamentInfo?.status === 'finished') {
            return { ...league, status: 'finished' }; // ← LOCAL
        }
        return league; // ← API
    });
    
    res.json(leaguesWithStatus);
});
```

**Data Sources:**
1. ✅ **API-Sports.io** - League list, logos, types
2. ✅ **Local File** `src/data/finished_tournaments.json` - Winner & status
3. ✅ **Local File** `src/data/country_mappings.json` - Country corrections

**API-Sports URL:**
```
https://v3.football.api-sports.io/leagues?country=Israel&season=2024
```

---

### 3️⃣ **טעינת סטטוס טורנירים (Tournament Status - Golden Cards)**

**Frontend Request:**
```javascript
GET http://localhost:3000/api/fixtures/tournaments/status/all
```

**Backend (Node.js):**
```javascript
// src/routes/fixtures.js
router.get('/tournaments/status/all', async (req, res) => {
    // 100% LOCAL FILE - NO API CALL!
    const finishedData = require('../data/finished_tournaments.json');
    res.json({ tournaments: finishedData.finished_tournaments });
});
```

**Data Source:**
- ✅ **ONLY Local File** `src/data/finished_tournaments.json`
- ❌ **NO API-Sports** call here!

**Why?** כי API-Sports **לא נותן** מידע על זוכים בטורנירים (trophy data).

---

### 4️⃣ **טעינת קבוצות בליגה (Teams in League)**

**Frontend Request:**
```javascript
GET http://localhost:3000/api/fixtures/teams?league=383&season=2024
```

**Backend (Node.js):**
```javascript
// src/routes/fixtures.js
router.get('/teams', async (req, res) => {
    const teams = await footballApi.getTeamsByLeague(league, season);
    // ↓ קורא ל-API-Sports
});
```

**Data Source:**
- ✅ **API-Sports.io** - Live teams data

**API-Sports URL:**
```
https://v3.football.api-sports.io/teams?league=383&season=2024
```

---

### 5️⃣ **טעינת פרטי טורניר (Tournament Details with Standings)**

**Frontend Request:**
```javascript
GET http://localhost:3000/api/fixtures/tournament/383
```

**Backend (Node.js):**
```javascript
// src/routes/fixtures.js
router.get('/tournament/:leagueId', async (req, res) => {
    // 1. קריאות API מרובות:
    const standings = await footballApi.getStandings(leagueId, season);
    const fixtures = await footballApi.getFixtures(leagueId, season);
    
    // 2. עיבוד מקומי:
    // - זיהוי שלב נוכחי (group/knockout/finished)
    // - מציאת המשחק הבא
    // - מיון קבוצות לפי טבלה
    
    res.json({
        leagueId,
        season,
        currentStage,
        currentRound,
        groups: [...],
        nextFixture: {...}
    });
});
```

**Data Sources:**
1. ✅ **API-Sports.io** - Standings, fixtures, rounds
2. ✅ **Local Logic** - Stage detection, round parsing

**API-Sports URLs:**
```
https://v3.football.api-sports.io/standings?league=383&season=2024
https://v3.football.api-sports.io/fixtures?league=383&season=2024&next=1
```

---

### 6️⃣ **טעינת המשחק הבא (Next Fixture for League)**

**Frontend Request:**
```javascript
GET http://localhost:3000/api/fixtures/league-next/383
```

**Backend (Node.js):**
```javascript
// src/routes/fixtures.js
router.get('/league-next/:leagueId', async (req, res) => {
    const nextFixture = await footballApi.getNextFixture(leagueId);
    // ↓ קורא ל-API-Sports
});
```

**Data Source:**
- ✅ **API-Sports.io** - Next fixture

**API-Sports URL:**
```
https://v3.football.api-sports.io/fixtures?league=383&next=1
```

---

## 🎯 **סיכום מקורות המידע:**

| Endpoint | API-Sports | Local JSON | Logic |
|----------|-----------|-----------|-------|
| `/countries` | ✅ List | ✅ Filter | ❌ |
| `/leagues` | ✅ List | ✅ Status | ✅ Merge |
| `/tournaments/status/all` | ❌ | ✅ Winners | ❌ |
| `/teams` | ✅ All data | ❌ | ❌ |
| `/tournament/:id` | ✅ Standings | ❌ | ✅ Processing |
| `/league-next/:id` | ✅ Fixture | ❌ | ❌ |
| `/standings` | ✅ Table | ❌ | ❌ |
| `/fixtures` | ✅ Matches | ❌ | ❌ |

---

## 📂 **Local JSON Files (מקורות מידע מקומיים):**

### 1️⃣ `src/data/finished_tournaments.json` 🏆
**תפקיד:** זוכי טורנירים שהסתיימו (Golden Cards)

**מדוע LOCAL?** 
- API-Sports **לא נותן** מידע על זוכים היסטוריים
- אנחנו **מזהים אוטומטית** (cup winner detector) או מעדכנים ידנית

**דוגמה:**
```json
{
  "385": {
    "name": "Toto Cup Ligat Al",
    "status": "finished",
    "winner": {
      "name": "Beitar Jerusalem",
      "logo": "..."
    }
  }
}
```

### 2️⃣ `src/data/country_mappings.json` 🌍
**תפקיד:** תיקוני מיפוי מדינות

**מדוע LOCAL?**
- API-Sports לפעמים מחזיר ליגות תחת מדינה שגויה
- דוגמה: Super Cup של ספרד מופיע תחת איטליה

**דוגמה:**
```json
{
  "leagueCountryOverride": {
    "556": "Italy",
    "514": "Spain"
  }
}
```

### 3️⃣ `src/data/cup_winners.js` 🏅
**תפקיד:** זוכי גביעים לפי עונה

**מדוע LOCAL?**
- API-Sports לא נותן היסטוריה מלאה של זוכים
- משמש כ-fallback אם הזיהוי האוטומטי נכשל

**דוגמה:**
```javascript
{
  israel: {
    2024: 563,  // Hapoel Beer Sheva - State Cup
    2023: 4495  // Maccabi Petah Tikva
  }
}
```

---

## 🔄 **תהליך עדכון מידע (Update Flow):**

### עדכון אוטומטי (API-Sports):
```
1. User opens app → Frontend calls API
2. Node.js calls API-Sports → Gets live data
3. Cache in memory (10 minutes)
4. Return to Frontend
```

### עדכון ידני (Local JSON):
```
1. Tournament finishes (e.g. Toto Cup final)
2. Run: node src/scripts/verify_global_winners.js
   ↓ (Detects winner automatically via API-Sports cup winner endpoint)
3. Updates: finished_tournaments.json
4. Restart Node.js
5. Golden Card appears ✅
```

---

## ⚡ **Cache Strategy:**

### API-Sports Calls (מטמון):
```javascript
// src/api/footballApi.js
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

if (cache[key] && Date.now() - cache[key].timestamp < CACHE_DURATION) {
    return cache[key].data; // מחזיר מהמטמון
}

// אחרת - קריאה חדשה ל-API
const data = await axios.get('https://v3.football.api-sports.io/...');
cache[key] = { data, timestamp: Date.now() };
```

### Local JSON Files (אין מטמון):
```javascript
// נטען מחדש בכל פעם (אבל זה מהיר - קובץ מקומי)
const finishedData = JSON.parse(fs.readFileSync('finished_tournaments.json'));
```

---

## 💰 **API-Sports Quota Management:**

### מכסה יומית:
- **Free Plan:** 100 requests/day
- **Pro Plan:** 3,000+ requests/day

### אופטימיזציה:
1. ✅ **Cache** - כל קריאה נשמרת 10 דקות
2. ✅ **Batch requests** - טורנירים מרובים בקריאה אחת
3. ✅ **Local fallback** - Winners stored locally
4. ✅ **Smart filtering** - מסננים ליגות לא רלוונטיות לפני הצגה

---

## 🔍 **דוגמה מלאה - נניח בוחרים Israel:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Israel" → Frontend                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. GET /api/fixtures/leagues?country=Israel                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Node.js:                                                      │
│    a. Call API-Sports → Get [383, 382, 385, 384, 659]          │
│    b. Load finished_tournaments.json                             │
│    c. Merge:                                                     │
│       - 383 (Ligat Ha'al): active ← API                         │
│       - 385 (Toto Cup): finished ← LOCAL (our fix!)             │
│       - 659 (Super Cup): finished ← LOCAL (our fix!)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. GET /api/fixtures/tournaments/status/all (for winner info)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Node.js:                                                      │
│    100% from finished_tournaments.json:                          │
│    {                                                             │
│      "385": {                                                    │
│        "status": "finished",                                     │
│        "winner": { "name": "Beitar Jerusalem" }                 │
│      }                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Frontend receives both:                                       │
│    - League list with status="finished" ✅                       │
│    - Winner data ✅                                              │
│    → Renders Golden Card! 🏆                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎓 **מתי משתמשים ב-API-Sports vs Local?**

### ✅ **משתמשים ב-API-Sports כש:**
- צריך **נתונים LIVE** (משחקים, טבלאות, קבוצות)
- צריך **עדכונים בזמן אמת** (תוצאות משחקים)
- צריך **כיסוי גלובלי** (מאות ליגות)

### ✅ **משתמשים ב-Local JSON כש:**
- API-Sports **לא נותן** את המידע (winners, trophies)
- צריך **תיקוני מיפוי** (wrong country assignments)
- צריך **לוגיקה מותאמת אישית** (tournament phases)
- רוצים **לחסוך API calls** (finished tournaments don't change)

---

## 📊 **Statistics - API Calls per User Session:**

```
Average user session:
1. Select Country:     1 API call  (/countries - cached)
2. Load Leagues:       1 API call  (/leagues?country=X - cached)
3. Load Tournament:    2 API calls (/standings + /fixtures - cached)
4. Select Team:        0 API calls (data already loaded)

Total: ~4 API calls per session (thanks to caching!)
```

---

**התשובה לשאלה שלך:**

> האם המידע הזה נלקח מ sport api תמיד או במידה ולא קיים מעזרים במקורות אחרים?

**תשובה:** 
- 🔵 **רוב המידע** = API-Sports.io (teams, standings, fixtures)
- 🟢 **מידע שחסר ב-API** = Local JSON (winners, status, corrections)
- 🟡 **לוגיקה עסקית** = Node.js processing (stage detection, sorting)

**זה היברידי בכוונה!** API-Sports טוב מאוד, אבל לא מושלם. אנחנו משלימים את החסר.
