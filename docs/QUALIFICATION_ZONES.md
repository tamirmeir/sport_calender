# 🏆 Qualification Zones Documentation

## Overview

The Qualification Zones system displays where teams in league standings qualify for continental competitions, playoffs, or face relegation. Each league is mapped to its **continental federation** with the appropriate competitions.

---

## 🌍 Continental Federations

### UEFA (Europe) - 25 Leagues

**Competitions:**
| Competition | Description | Teams | Format |
|-------------|-------------|-------|--------|
| **Champions League** | Elite European club competition | 36 teams | League phase + Knockout |
| **CL Qualifiers** | Qualification rounds for CL | varies | 4 qualifying rounds |
| **Europa League** | Second-tier European competition | 36 teams | League phase + Knockout |
| **Conference League** | Third-tier European competition | 36 teams | League phase + Knockout |

**Qualification Rules by UEFA Coefficient:**
| Coefficient Rank | CL Spots | EL Spots | ECL Spots |
|------------------|----------|----------|-----------|
| 1-4 (Top 5 leagues) | 4 direct | 1-2 | 1 |
| 5-15 | 1-2 (+ qualifiers) | 1-2 | 1-2 |
| 16-50 | Qualifiers only | Qualifiers | 1-2 |
| 51+ | Qualifiers only | Qualifiers | 1 |

**Covered Leagues:**
```
Top 5:        England (39), Spain (140), Germany (78), Italy (135), France (61)
Tier 2:       Netherlands (88), Portugal (94), Belgium (144), Turkey (203)
Tier 3:       Scotland (179), Austria (218), Greece (197), Ukraine (332), Serbia (333)
Tier 4:       Poland (106), Czech (345), Croatia (286), Denmark (119), Switzerland (207)
Tier 5:       Norway (103), Sweden (113), Hungary (271), Cyprus (210), Bosnia (283)
Special:      Israel (383) - UEFA member despite Asian geography
```

---

### CONMEBOL (South America) - 2 Leagues

**Competitions:**
| Competition | Description | Teams | Format |
|-------------|-------------|-------|--------|
| **Copa Libertadores** | Premier South American competition | 47 teams | Group stage + Knockout |
| **Copa Sudamericana** | Second-tier competition | 44 teams | Group stage + Knockout |

**Qualification from League Standings:**
| Position | Qualification |
|----------|---------------|
| 1-4 (varies) | Libertadores Group Stage |
| 5-6 (varies) | Libertadores Qualifiers |
| 7-12 (varies) | Copa Sudamericana |

**Covered Leagues:**
```
Brazil Serie A (71):     Top 4 → Libertadores, 5-6 → Qualifiers, 7-12 → Sudamericana
Argentina Liga (128):    Top 4 → Libertadores, 5-6 → Qualifiers, 7-12 → Sudamericana
```

---

### AFC (Asia) - 4 Leagues

**Competitions (2024+ Format):**
| Competition | Description | Teams | Format |
|-------------|-------------|-------|--------|
| **AFC Champions League Elite** | Top-tier Asian competition | 24 teams | League phase + Knockout |
| **AFC Champions League 2** | Second-tier competition | 24 teams | League phase + Knockout |

**Qualification Rules:**
| Country Ranking | ACL Elite Spots | ACL 2 Spots |
|-----------------|-----------------|-------------|
| 1-3 (Japan, Korea, Saudi) | 3-4 | 1-2 |
| 4-6 | 2 | 1-2 |
| 7+ | 1 | 1 |

**Covered Leagues:**
```
Japan J1 League (98):        1-3 → ACL Elite, Playoff for 4th spot
South Korea K League 1 (292): 1-3 → ACL Elite, Finals system for title
Saudi Pro League (307):       1-2 → ACL Elite, 3-4 → ACL 2
Australia A-League (188):     1-2 → ACL Elite, Playoff finals system
```

---

### CONCACAF (North/Central America) - 2 Leagues

**Competitions:**
| Competition | Description | Teams | Format |
|-------------|-------------|-------|--------|
| **CONCACAF Champions Cup** | Premier regional competition | 27 teams | Knockout format |
| **Leagues Cup** | MLS vs Liga MX summer tournament | 47 teams | Group + Knockout |

**Covered Leagues:**
```
MLS (253):      Conference playoffs → Champion qualifies for CCL
Liga MX (262):  Liguilla playoffs → Top teams qualify for CCL
```

---

### CAF (Africa) - 3 Leagues

**Competitions:**
| Competition | Description | Teams | Format |
|-------------|-------------|-------|--------|
| **CAF Champions League** | Premier African competition | 16 teams | Group stage + Knockout |
| **CAF Confederation Cup** | Second-tier competition | 16 teams | Group stage + Knockout |

**Covered Leagues:**
```
South Africa PSL (288): Champion → CAF CL, 2nd → Confed Cup
Egypt Premier (233):    Champion → CAF CL, 2nd → Confed Cup  
Morocco Botola (200):   Champion → CAF CL, 2nd → Confed Cup
```

---

## 🎨 Zone Color Coding

Standard colors used across all leagues:

| Zone Type | Color | Hex Code | Usage |
|-----------|-------|----------|-------|
| Champions League / Top Continental | Blue | `#3b82f6` | Direct qualification to elite competition |
| CL Qualifiers | Light Blue | `#60a5fa` | Qualification rounds needed |
| Europa League / Secondary | Orange | `#f97316` | Second-tier continental |
| Conference League / Third | Green | `#22c55e` | Third-tier or playoff spots |
| Relegation Playoff | Amber | `#f59e0b` | Playoff to avoid relegation |
| Relegation | Red | `#ef4444` | Direct relegation |

---

## 📊 Data Structure

Each league's `qualificationZones` array contains:

```javascript
{
  start: 1,           // First position in zone (1-indexed)
  end: 4,             // Last position in zone
  label: "Champions League",  // Display name
  color: "#3b82f6",   // Text/border color
  bgColor: "rgba(59, 130, 246, 0.1)"  // Background color
}
```

### Example: Premier League (39)
```javascript
qualificationZones: [
  { start: 1, end: 4, label: 'Champions League', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  { start: 5, end: 5, label: 'Europa League', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
  { start: 6, end: 7, label: 'Conference League', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
  { start: 18, end: 20, label: 'Relegation', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
]
```

---

## 🔧 API Endpoint

**Get Competition Structure:**
```
GET /api/fixtures/competition-structure/:leagueId
```

**Response:**
```json
{
  "name": "Premier League",
  "country": "England",
  "format": "league",
  "stages": [
    { "name": "League", "description": "38 rounds", "teams": 20 }
  ],
  "qualificationZones": [
    { "start": 1, "end": 4, "label": "Champions League", "color": "#3b82f6", "bgColor": "rgba(59, 130, 246, 0.1)" },
    ...
  ],
  "promotion": "Top 4 to Champions League",
  "relegation": "3 relegated"
}
```

---

## 📋 Complete League Coverage

### By Continent

| Continent | Leagues | IDs |
|-----------|---------|-----|
| Europe | 25 | 39, 140, 78, 135, 61, 88, 94, 144, 203, 179, 218, 197, 106, 332, 333, 286, 345, 271, 283, 210, 103, 113, 119, 207, 383 |
| South America | 2 | 71, 128 |
| Asia | 4 | 98, 292, 307, 188 |
| North America | 2 | 253, 262 |
| Africa | 3 | 288, 233, 200 |

### Total: 36 Leagues with Qualification Zones

---

## 🧪 Testing

Run the automated test:
```bash
python3 test_zones.py
```

Verify confederation mapping:
```bash
python3 verify_confederations.py
```

---

## 📝 Adding New Leagues

1. Find the league ID from API-Sports or `active_leagues.json`
2. Determine the continental federation
3. Research qualification spots for that country
4. Add to `competitionFormats` in `src/routes/fixtures.js`:

```javascript
NEW_ID: { 
  name: 'League Name', 
  country: 'Country',
  format: 'league',
  stages: [{ name: 'League', description: 'X rounds', teams: Y }],
  qualificationZones: [
    { start: 1, end: 1, label: 'Continental Competition', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
    // ... more zones
  ],
  promotion: 'Description',
  relegation: 'Description'
}
```

4. Update test files: `test_zones.py`, `verify_confederations.py`, `backend/admin.py`
5. Restart server and test: `curl http://127.0.0.1:3000/api/fixtures/competition-structure/NEW_ID`

---

## 🔄 Season Variations

Some leagues change qualification spots based on:
- **UEFA coefficient changes** - Recalculated annually
- **Cup winners** - May take a European spot
- **Financial Fair Play** - Can affect qualification
- **League expansion/contraction** - Changes number of spots

Always verify current season rules when updating.
