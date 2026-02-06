# API Reference - Tournament Data System

> Complete API documentation for the Sport Calendar Tournament Data System
> Updated: February 6, 2026

## 🏆 Tournament Data Endpoints

### GET `/api/fixtures/tournaments/status/all`

**Purpose**: Get all tournaments with current status and winner data

**Response Format**:
```json
{
  "tournaments": {
    "1": {
      "status": "finished",
      "winner": {
        "name": "Argentina",
        "logo": "https://media.api-sports.io/football/teams/26.png"
      }
    },
    "514": {
      "status": "finished", 
      "winner": {
        "name": "Barcelona",
        "logo": "https://media.api-sports.io/football/teams/529.png"
      }
    }
  },
  "month": 2,
  "lastUpdated": "2026-02-06T03:04:47.293Z"
}
```

**Status Values**:
- `finished`: Tournament completed with confirmed winner
- `vacation`: Tournament in off-season/vacation period  
- `active`: Tournament currently ongoing
- `winter_break`: European leagues winter break period

**Implementation Notes**:
- Used by frontend `loadTournamentData()` function
- Cached in `tournamentDataCache` variable
- Falls back to hardcoded data on error
- Updates automatically based on current month and regional patterns

---

### GET `/api/fixtures/tournaments/master`

**Purpose**: Get complete tournament database with enriched metadata

**Response Format**:
```json
{
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2026-02-06T00:00:00Z",
    "totalTournaments": 13,
    "coverage": {
      "international": 3,
      "superCups": 6, 
      "domesticCups": 4
    }
  },
  "tournaments": {
    "1": {
      "name": "FIFA World Cup",
      "country": "Qatar",
      "type": "international",
      "region": "World",
      "status": {
        "current": "finished",
        "season": "2022"
      },
      "winner": {
        "hasWinner": true,
        "team": "Argentina",
        "teamId": 26,
        "teamLogo": "https://media.api-sports.io/football/teams/26.png",
        "confirmedDate": "2022-12-18"
      },
      "schedule": {
        "pattern": "world_cup",
        "frequency": "4_years"
      },
      "api": {
        "leagueId": 1,
        "season": 2022
      },
      "display": {
        "showInCountryHub": true,
        "priority": 1,
        "cardType": "golden"
      },
      "calculatedStatus": {
        "current": "finished",
        "month": 2,
        "lastCalculated": "2026-02-06T03:04:47Z"
      }
    }
  },
  "regions": {
    "Europe": {
      "seasonPattern": "academic",
      "startMonth": 8,
      "endMonth": 5
    }
  },
  "displayConfig": {
    "golden": {
      "borderColor": "#d4af37",
      "backgroundColor": "linear-gradient(135deg, #fffdf7 0%, #f9f6e8 100%)",
      "icon": "🏆"
    }
  }
}
```

---

### GET `/api/fixtures/tournaments/winners/current` 

**Purpose**: Get only tournaments with confirmed winners (legacy endpoint)

**Response Format**:
```json
{
  "count": 9,
  "tournaments": {
    "1": {
      "name": "FIFA World Cup",
      "country": "Qatar", 
      "type": "international",
      "winner": {
        "hasWinner": true,
        "team": "Argentina",
        "teamId": 26,
        "teamLogo": "https://media.api-sports.io/football/teams/26.png",
        "confirmedDate": "2022-12-18"
      },
      "status": {
        "current": "finished",
        "season": "2022"
      },
      "display": {
        "showInCountryHub": true,
        "priority": 1,
        "cardType": "golden"
      }
    }
  },
  "lastUpdated": "2026-02-06T00:00:00Z"
}
```

---

### GET `/api/fixtures/tournaments/country/:countryName`

**Purpose**: Get tournaments for specific country

**Parameters**:
- `countryName`: Country name (e.g., "Spain", "England")

**Response Format**:
```json
{
  "country": "Spain",
  "count": 2,
  "tournaments": {
    "140": {
      "name": "La Liga",
      "type": "league",
      "status": {
        "current": "active"
      }
    },
    "514": {
      "name": "Supercopa de España", 
      "type": "super_cup",
      "status": {
        "current": "finished"
      },
      "winner": {
        "hasWinner": true,
        "team": "Barcelona"
      }
    }
  },
  "displayConfig": {
    "finished": {
      "badge": "🏆 Tournament Completed",
      "style": "golden"
    }
  }
}
```

---

### GET `/api/fixtures/tournaments/:tournamentId/status`

**Purpose**: Get detailed status for specific tournament

**Parameters**:
- `tournamentId`: Tournament ID (e.g., "514" for Supercopa España)

**Response Format**:
```json
{
  "tournamentId": "514",
  "name": "Supercopa de España",
  "country": "Spain", 
  "currentStatus": "finished",
  "statusMessage": "Tournament completed",
  "winner": {
    "hasWinner": true,
    "team": "Barcelona",
    "teamId": 529,
    "teamLogo": "https://media.api-sports.io/football/teams/529.png",
    "confirmedDate": "2025-01-12"
  },
  "lastUpdated": "2026-02-06T03:04:47Z",
  "schedule": {
    "pattern": "super_cup",
    "frequency": "annual"
  },
  "api": {
    "leagueId": 514,
    "season": 2025
  }
}
```

---

## 📊 Data Source Files

### Tournament Master Data
- **File**: `src/data/world_tournaments_master.json`
- **Size**: 15,761 bytes
- **Tournaments**: 13 major competitions
- **Coverage**: International (3), Super Cups (6), Domestic Cups (4)

### Status Calculation Rules  
- **File**: `src/data/status_rules.json`
- **Size**: 10,281 bytes
- **Rules**: Month-by-month status by regional pattern
- **Patterns**: European (academic), South American (calendar), World (special)

### Regional Configuration
- **File**: `src/data/regions_config.json` 
- **Size**: 7,022 bytes
- **Regions**: Europe, South America, North America, Asia, Africa, World
- **Season Types**: Academic year (Aug-May), Calendar year (Jan-Dec), Northern Hemisphere (Apr-Nov)

### Display Configuration
- **File**: `src/data/display_config.json`
- **Size**: 8,359 bytes
- **Card Types**: Golden, vacation, active
- **Badge Styles**: Trophy, vacation, winter break
- **Status Messages**: Localized text for different states

### Country Mappings
- **File**: `src/data/country_mappings.json`
- **Size**: 5,341 bytes
- **Overrides**: Tournament-to-country associations
- **Fix Cases**: Italian Super Cup in Spain, UEFA competitions in multiple countries

---

## 🔄 Frontend Integration

### JavaScript Usage

```javascript
// 1. Load tournament data (with caching)
const tournamentData = await loadTournamentData();

// 2. Check tournament status
const tournamentInfo = tournamentData[leagueId];
const isFinished = tournamentInfo && tournamentInfo.status === 'finished' && tournamentInfo.winner;

// 3. Render golden card for finished tournaments
if (isFinished) {
    card.classList.add('finished-card');
    // Add golden styling and winner display
}

// 4. Refresh cache when needed
function refreshTournamentData() {
    tournamentDataCache = null; // Clear cache for fresh fetch
}
```

### Error Handling

```javascript
// Automatic fallback to hardcoded data
catch (error) {
    console.error('[TOURNAMENT] Backend failed:', error);
    return {
        1: { status: 'finished', winner: { name: 'Argentina', logo: '...' } },
        4: { status: 'finished', winner: { name: 'Spain', logo: '...' } },
        // ... fallback tournament data
    };
}
```

---

## 🎯 Current Tournament Coverage

### Finished Tournaments (9 with winners):
1. **FIFA World Cup 2022** - Argentina
2. **Euro Championship 2024** - Spain  
3. **Copa America 2024** - Argentina
4. **Community Shield 2025** - Manchester City
5. **UEFA Super Cup 2025** - Real Madrid
6. **Supercopa España 2025** - Barcelona
7. **DFL Supercup 2025** - Bayer Leverkusen  
8. **Supercoppa Italiana 2025** - Inter
9. **Trophée des Champions 2025** - PSG

### Finished Tournaments (4 without winners):
1. **Toto Cup Ligat Al** (Israel)
2. **CAF Super Cup** (Africa)
3. **Recopa Sudamericana** (South America)
4. **Israeli Super Cup**

**Total**: 13 tournaments across 5 JSON data files (51KB total)