# Sport Calendar - V2 Navigation & Logic Update (Feb 02, 2026)

## 1. Architectural Overhaul: Global vs. Local Browsing
The application entry point has been restructured to support two distinct browsing paradigms, addressing the need for both broad exploration and specific team lookups.

### A. The Fork (Step 1.5)
Users are now presented with a clear choice immediately after clicking "Explorer":
1.  **Browse by Continent (Global)**: Designed for finding teams via their major international or continental competitions (e.g., "I want to see Real Madrid in the Champions League").
2.  **Browse by Country (Local)**: The classic flow, designed for finding domestic league teams (e.g., "I want to find a team in the English Premier League").

### B. Regional Hubs (Step 2)
We introduced "Hub" views to organize competitions hierarchically:
-   **Structure**: Split into "Club Competitions" (e.g., UCL, Europa) and "National Tournaments" (e.g., Euro, World Cup).
-   **Data Source**: Uses a strict `HIERARCHY` constant mapping specific API-Sports League IDs (e.g., ID 2 for UCL) to regions.

## 2. Advanced Filtering Logic (Strict Mode)

### Problem
Previously, selecting a competition (like Champions League) and then a team often resulted in seeing *all* matches for that team, or seeing teams that had already been eliminated.

### Solution: `isCompetitionContext`
We introduced a Strict Context flag (`isCompetitionContext`) that persists through the navigation flow.

1.  **Smart Team Fetching (The "Join" Strategy)**:
    *   **Normal**: Fetches the list of all teams in a league.
    *   **Strict**: Fetches the **Standings** (League Table) first. This ensures only teams active in the main stage (Qualified teams) are shown.
    *   **Enrichment**: Since the Standings endpoint provides limited data, we cross-reference (Join) with the Teams endpoint to populate static details like Stadium Capacity and City.
    
2.  **Fixture Search**:
    *   If a user navigates via a Competition (e.g., World Cup), the search automatically applies a filter: `&league={ID}`.
    *   **Edge Case Handling**: If no upcoming games are found in that specific competition, the UI strictly reports "No matches in [Competition Name]" instead of silently showing domestic games or history.

## 3. UI/UX Enhancements

### A. Data-Rich Tables
The Team Selection table has been expanded to provide more context before clicking:
-   **Old**: Logo, Name, Founded.
-   **New**: Logo, Name, **Code** (e.g., MUN), **Type** (Senior/Youth), **Founded**, **Venue Name**, **City**, **Capacity**.

### B. Smart Navigation ("Smart Back")
The "Back" button is now context-aware:
-   If you arrived via **Continent Mode**, clicking Back takes you to the Continent Map.
-   If you arrived via **Country Mode**, clicking Back takes you to the Country List.

### C. Season Calculation Logic
We implemented dynamic season resolution based on the competition type:
-   **Academic Year** (e.g., Premier League): `Year = CurrentYear - 1` (if month < June).
-   **Calendar Year** (e.g., MLS, World Cup, Copa Libertadores): `Year = CurrentYear`.
-   **Fix**: Explicitly mapped 'World Cup', 'Euro', and 'International' to Calendar Year logic to ensure the 2026 World Cup is fetchable in early 2026.

## 4. Technical Implementation Summary
-   **Frontend (`app_v2.js`)**:
    -   State object extended: `currentState.mode`, `currentState.isCompetitionContext`.
    -   New dual-fetch logic in `selectLeague`.
    -   Enhanced error handling for empty states (No auto-fallback to history).
-   **Backend (`routes/fixtures.js`)**:
    -   New `/standings` endpoint to support the strict filtering mechanism.
    -   Updated `/teams` endpoint to handle passing `national=true` flags correctly.

## 5. Subscription/Usage Options
Users now have two primary ways to subscribe/view fixtures:
1.  **General Subscription**: Search via "Browse Countries" -> Select Team. This shows **ALL** fixtures for that team across all competitions.
2.  **Tournament Subscription**: Search via "Browse Continent" -> Select Tournament -> Select Team. This creates a view strictly limited to that tournament.
