# 🛠️ Maintenance Guide - When to Update Local JSON Files

## 📂 **קבצים מקומיים שצריכים תחזוקה:**

---

## 1️⃣ `country_mappings.json` 🌍

### 🎯 **מטרה:**
תיקון שגיאות ב-API-Sports שמחזיר מידע שגוי או לא מסודר.

### 📋 **מה יש בקובץ:**

#### A. **Country Overrides (תיקוני מדינות)**
```json
"556": {
  "correct_country": "Italy",
  "api_returns": "Spain",
  "tournament": "Supercoppa Italiana",
  "reason": "API incorrectly places Italian Super Cup in Spain"
}
```

**בעיה:** API-Sports מחזיר את ה-Supercoppa Italiana (גביע העל של איטליה) תחת **ספרד** ❌

**פתרון:** הקובץ מתקן ושם אותו תחת **איטליה** ✅

#### B. **Manual League Injection (הזרקת ליגות ידנית)**
```json
"529": {
  "name": "DFL Supercup",
  "country": "Germany",
  "reason": "Sometimes missing from /leagues endpoint",
  "inject_manually": true
}
```

**בעיה:** לפעמים API-Sports **לא מחזיר** את ה-DFL Supercup בכלל!

**פתרון:** אנחנו מוסיפים אותו ידנית אם הוא חסר.

#### C. **Region Mapping (מיפוי אזורים)**
```json
"country_to_region": {
  "England": "europe",
  "Brazil": "south_america",
  "Israel": "middle_east",
  "Japan": "asia"
}
```

**מטרה:** לקבץ מדינות לפי יבשת (לתצוגה ה-Continental).

#### D. **Country Display Names (שמות תצוגה)**
```json
"England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England",
"Israel": "🇮🇱 Israel"
```

**מטרה:** הוספת דגלים וסטנדרטיזציה של שמות.

---

### 🔄 **מתי ליצור/עדכן את `country_mappings.json`:**

| מצב | מתי | איך לזהות |
|-----|-----|-----------|
| **🆕 יצירה ראשונית** | פעם אחת בהתחלה | אם הקובץ לא קיים |
| **🐛 תיקון באג** | כשמגלים ליגה במדינה הלא נכונה | משתמש מתלונן: "למה Super Cup ספרד בישראל?" |
| **➕ ליגה חדשה חסרה** | כשליגה חשובה לא מוצגת | בודקים `/leagues?country=X` ורואים שחסר משהו |
| **🌍 מדינה חדשה** | כשמוסיפים תמיכה במדינה חדשה | הוספת מדינה ל-app |
| **🚫 ליגה לא רלוונטית** | כשרוצים לסנן ליגה מסוימת | יותר מדי ליגות מוצגות |

### ✏️ **דוגמה - איך לעדכן:**

#### תרחיש: גילינו שליגה חדשה (ID: 999) מופיעה תחת מדינה שגויה

```json
// הוסף ל-countryOverrides → api_corrections:
"999": {
  "correct_country": "Portugal",
  "api_returns": "Spain",
  "tournament": "Taça da Liga",
  "reason": "API places Portuguese cup in Spain"
}

// הוסף ל-leagueCountryMapping:
"999": "Portugal"
```

#### תרחיש: מדינה חדשה - קנדה

```json
// הוסף ל-regionMapping → country_to_region:
"Canada": "north_america",

// הוסף ל-countryDisplayNames → standard:
"Canada": "🇨🇦 Canada"
```

---

## 2️⃣ `cup_winners.js` 🏆

### 🎯 **מטרה:**
שמירת רשימה של זוכי גביעים לפי עונה, כי **API-Sports לא נותן מידע היסטורי על זוכים**.

### 📋 **מה יש בקובץ:**

```javascript
{
  israel: {
    2024: 563,  // Hapoel Beer Sheva - State Cup 2024-25
    2023: 4495, // Maccabi Petah Tikva - State Cup 2023-24
    2022: 657,  // Beitar Jerusalem - State Cup 2022-23
  },
  
  england: {
    2024: 33,   // Manchester United - FA Cup 2024-25
    2023: 50,   // Manchester City - FA Cup 2023-24
  }
}
```

**פורמט:**
- `country` = שם המדינה (lowercase)
- `season` = שנת העונה (2024 = עונת 2024-25)
- `teamId` = ה-ID של הקבוצה הזוכה מ-API-Sports

---

### 🔄 **מתי ליצור/עדכן את `cup_winners.js`:**

| מצב | מתי | איך לזהות |
|-----|-----|-----------|
| **🆕 יצירה ראשונית** | פעם אחת בהתחלה | אם הקובץ לא קיים |
| **🏆 גמר גביע** | אחרי כל גמר גביע חשוב | גביע המדינה הסתיים → הוסף זוכה |
| **📅 תחילת עונה חדשה** | בתחילת כל עונה | העונה 2025-26 מתחילה → הכן entry חדש |
| **🔍 גילוי זוכה חסר** | כשרואים "winner: null" | Frontend מציג "WINNER: Unknown" |
| **✅ אימות שנתי** | פעם בשנה (סוף עונה) | רצים `verify_global_winners.js` |

### ✏️ **דוגמה - איך לעדכן:**

#### תרחיש 1: גביע המדינה של ישראל 2025-26 הסתיים

```javascript
// 1. מצא את ה-team ID של הזוכה (נניח מכבי תל אביב)
// בדוק ב-API-Sports: https://v3.football.api-sports.io/teams?name=Maccabi%20Tel%20Aviv
// Result: team_id = 604

// 2. הוסף ל-cup_winners.js:
israel: {
    2025: 604,  // Maccabi Tel Aviv - State Cup 2025-26 ✅ חדש!
    2024: 563,  // Hapoel Beer Sheva - State Cup 2024-25
    2023: 4495, // Maccabi Petah Tikva - State Cup 2023-24
}
```

#### תרחיש 2: מדינה חדשה - הוספת סקוטלנד (כבר קיים, אבל לדוגמה)

```javascript
// הוסף entry חדש:
scotland: {
    2024: 247,  // Celtic - Scottish Cup 2024-25
    2023: 247,  // Celtic - Scottish Cup 2023-24
    2022: 257,  // Rangers - Scottish Cup 2022-23
},

// הוסף ל-LEAGUE_TO_COUNTRY mapping:
const LEAGUE_TO_COUNTRY = {
    // ... existing ...
    181: 'scotland',  // Scottish Cup
};
```

---

## 3️⃣ `finished_tournaments.json` 🏅

### 🎯 **מטרה:**
רשימת טורנירים שהסתיימו **בעונה הנוכחית** עם פרטי הזוכה (לתצוגת Golden Cards).

### 📋 **מה יש בקובץ:**

```json
{
  "finished_tournaments": {
    "385": {
      "name": "Toto Cup Ligat Al",
      "country": "Israel",
      "year": 2025,
      "status": "finished",  ← חשוב!
      "winner": {
        "name": "Beitar Jerusalem",
        "logo": "https://media.api-sports.io/football/teams/657.png",
        "id": 657
      }
    }
  }
}
```

---

### 🔄 **מתי ליצור/עדכן את `finished_tournaments.json`:**

| מצב | מתי | תדירות |
|-----|-----|--------|
| **🆕 יצירה ראשונית** | פעם אחת בהתחלה | Once |
| **🏆 טורניר הסתיים** | אחרי כל גמר טורניר | כל חודש (ממוצע) |
| **🔄 עונה חדשה** | ספטמבר (תחילת עונה) | שנתי |
| **🤖 זיהוי אוטומטי** | בכל deploy / שבועי | אוטומטי |
| **🧹 ניקוי ישן** | תחילת עונה חדשה | שנתי |

### ✏️ **דוגמה - איך לעדכן:**

#### אופציה 1: ידני (Manual)

```json
// הוסף entry חדש:
"999": {
  "name": "Canadian Championship",
  "country": "Canada",
  "year": 2025,
  "status": "finished",  ← חובה!
  "winner": {
    "name": "Toronto FC",
    "logo": "https://media.api-sports.io/football/teams/1234.png",
    "id": 1234
  }
}
```

#### אופציה 2: אוטומטי (Automatic)

```bash
# הרץ סקריפט זיהוי:
node src/scripts/verify_global_winners.js

# הסקריפט:
# 1. סורק את כל הטורנירים שיש להם גמר
# 2. בודק אם יש זוכה באמצעות API-Sports
# 3. מעדכן את finished_tournaments.json אוטומטית
# 4. מוסיף "status": "finished" ✅
```

---

## 🔄 **Workflow - איך הקבצים עובדים ביחד:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. API-Sports returns data (sometimes wrong)               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. country_mappings.json fixes country assignments         │
│     - Super Cup 556: Italy (not Spain)                      │
│     - Inject missing leagues                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. finished_tournaments.json marks which are finished      │
│     - 385: status="finished", winner="Beitar Jerusalem"     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. cup_winners.js provides historical fallback             │
│     - If finished_tournaments missing winner                │
│     - Lookup: israel[2024] = 563 (Hapoel Beer Sheva)       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Frontend displays correct data! 🎉                      │
│     - Leagues in right countries                            │
│     - Golden Cards for finished tournaments                 │
│     - Historical winners available                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 **Maintenance Calendar:**

### 🔴 **High Priority (תדיר):**

| Task | When | File | How |
|------|------|------|-----|
| Add new winner | After every cup final | `finished_tournaments.json` | Manual or auto-detect |
| Mark tournament finished | After tournament ends | `finished_tournaments.json` | Add `"status": "finished"` |
| Fix country bug | When user reports | `country_mappings.json` | Add override |

### 🟡 **Medium Priority (חודשי):**

| Task | When | File | How |
|------|------|------|-----|
| Verify winners | Monthly | All 3 files | Run `verify_global_winners.js` |
| Add missing league | When discovered | `country_mappings.json` | Add to `manualLeagueInjection` |
| Update display names | New country added | `country_mappings.json` | Add flag + name |

### 🟢 **Low Priority (שנתי):**

| Task | When | File | How |
|------|------|------|-----|
| Clean old seasons | Start of new season (Sept) | `cup_winners.js` | Keep last 3-5 seasons |
| Archive finished | Start of new season | `finished_tournaments.json` | Move to `cup_winners.js` |
| Review mappings | Once a year | `country_mappings.json` | Check for outdated rules |

---

## 🤖 **Automation Scripts:**

### 1️⃣ **`verify_global_winners.js`** (זיהוי זוכים אוטומטי)

```bash
# מה זה עושה:
node src/scripts/verify_global_winners.js

# Process:
# 1. Scans all cup competitions (ID < 1000)
# 2. Checks for final matches in current season
# 3. Detects winner from final result
# 4. Updates finished_tournaments.json
# 5. Adds "status": "finished" automatically ✅
```

**מתי להריץ:**
- לאחר גמר גביע חשוב
- שבועית (בדיקה אוטומטית)
- לפני כל deploy לפרודקשן

### 2️⃣ **`validate_leagues_batch.js`** (בדיקת תקינות ליגות)

```bash
# מה זה עושה:
node src/scripts/validate_leagues_batch.js

# Process:
# 1. Checks all leagues from API
# 2. Validates country assignments
# 3. Reports mismatches vs country_mappings.json
# 4. Suggests new mappings needed
```

**מתי להריץ:**
- לאחר API-Sports update
- כשמוסיפים מדינה חדשה
- חודשי (maintenance)

---

## 🎯 **Quick Reference - מי מעדכן מה:**

```
┌──────────────────────────────────────────────────────────┐
│  File                      │  Update Method             │
├──────────────────────────────────────────────────────────┤
│  country_mappings.json     │  ✋ Manual (when bug found)│
│  cup_winners.js            │  ✋ Manual (after final)   │
│  finished_tournaments.json │  🤖 Auto (verify script)   │
│                            │  ✋ Manual (if auto fails) │
└──────────────────────────────────────────────────────────┘
```

---

## ⚠️ **Common Mistakes (שגיאות נפוצות):**

### ❌ **שגיאה 1: שכחנו להוסיף `"status": "finished"`**

```json
// ❌ Wrong:
"385": {
  "winner": { "name": "Beitar" }
  // Missing: "status": "finished"
}

// ✅ Correct:
"385": {
  "status": "finished",  ← Must have!
  "winner": { "name": "Beitar" }
}
```

**תוצאה:** Frontend לא מציג Golden Card!

### ❌ **שגיאה 2: Team ID שגוי**

```javascript
// ❌ Wrong:
israel: {
    2024: 999,  // Wrong team ID!
}

// ✅ Correct (verify via API):
israel: {
    2024: 563,  // Hapoel Beer Sheva (verified)
}
```

**תוצאה:** Logo לא נטען / שם שגוי.

### ❌ **שגיאה 3: Season year שגוי**

```javascript
// ❌ Wrong:
israel: {
    2025: 563,  // State Cup final is in May 2025
}

// ✅ Correct:
israel: {
    2024: 563,  // Season 2024-25 → use start year (2024)
}
```

**תוצאה:** Winner לא מוצג.

---

## 📝 **Checklist לעדכון:**

### ✅ **אחרי גמר גביע (Post-Final):**

- [ ] 1. Identify winner team name
- [ ] 2. Find team ID via API-Sports
- [ ] 3. Update `finished_tournaments.json`:
  - [ ] Add `"status": "finished"`
  - [ ] Add winner object with name, logo, id
- [ ] 4. Update `cup_winners.js`:
  - [ ] Add season: teamId entry
- [ ] 5. Test locally:
  - [ ] `npm start`
  - [ ] Check Golden Card appears
- [ ] 6. Commit & push:
  - [ ] `git add src/data/`
  - [ ] `git commit -m "Update: Add [Tournament] winner"`
  - [ ] `git push`

### ✅ **אחרי זיהוי באג (Bug Fix):**

- [ ] 1. Reproduce issue (wrong country, missing league)
- [ ] 2. Update `country_mappings.json`:
  - [ ] Add override or injection
  - [ ] Document reason
- [ ] 3. Test fix locally
- [ ] 4. Commit with clear message
- [ ] 5. Deploy to production

---

## 🎓 **Summary:**

| File | Purpose | Update Frequency | Method |
|------|---------|------------------|--------|
| `country_mappings.json` | Fix API bugs | As needed (bugs) | Manual |
| `cup_winners.js` | Historical winners | After finals | Manual |
| `finished_tournaments.json` | Current season winners | After tournaments | Auto + Manual |

**Key Point:** 
- ✅ **Auto-detect** = run scripts weekly
- ✋ **Manual** = only when scripts fail or new bugs found
- 📅 **Regular** = monthly check + yearly cleanup
