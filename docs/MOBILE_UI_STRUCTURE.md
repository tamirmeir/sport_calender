# Mobile UI Structure - Main App Screen

## Overview
This document describes the UI elements and containers displayed on the main app screen when the app starts on mobile devices.

---

## Visual Layout (Top to Bottom)

```
┌─────────────────────────────────────────┐
│           HEADER (fixed)                │  ← Blue gradient, position: fixed
│  ┌─────────────────────────────────┐    │
│  │  Login Button                   │    │
│  │  ⚽ Match Calendar 🗓️           │    │
│  │  Dive into your football...    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
           ↓ 4px gap ↓
┌─────────────────────────────────────────┐
│         EXPLORER SECTION                │
│  ┌─────────────────────────────────┐    │
│  │          TABS NAV               │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ My Teams            ⭐  │    │    │  ← Default active tab
│  │  └─────────────────────────┘    │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ Find Match By Country 🏳️│    │    │
│  │  └─────────────────────────┘    │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ Find Match By Continent🌍│    │    │
│  │  └─────────────────────────┘    │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ Global Competitions  🏆 │    │    │
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        COUNTRIES GRID           │    │  ← Content area (cards-grid)
│  │   (or Welcome Screen if         │    │
│  │    My Teams tab & not logged in)│    │
│  │                                 │    │
│  │   [Card] [Card] [Card]          │    │  ← 3 columns for countries
│  │   [Card] [Card] [Card]          │    │     2 columns for others
│  │   ...                           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         FIXTURES SECTION                │  ← Shows after team selection
│  (Empty state initially)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      MOBILE BOTTOM NAV (fixed)          │  ← position: fixed, bottom: 0
│  🏠 Home  ⭐ Favorites  ❓ Help  🗓 Cal │
└─────────────────────────────────────────┘
```

---

## HTML Structure

```html
<body>
  <!-- Mobile Back Button (floating, hidden by default) -->
  <button id="mobileBackBtn" class="hidden">←</button>
  
  <div class="container">
    
    <!-- 1. HEADER (fixed on mobile) -->
    <header class="header">
      <button class="help-fab">?</button>
      <div class="auth-controls" id="authControls">
        <!-- Login/Logout button -->
      </div>
      <div class="header-content">
        <h1>⚽ Match Calendar 🗓️</h1>
        <p>Dive into your football schedule 🌊</p>
      </div>
    </header>

    <!-- 2. EXPLORER SECTION -->
    <div class="explorer-section">
      
      <!-- Step 1: Country/Mode Selection -->
      <div class="explorer-step" id="stepCountry">
        
        <!-- Tabs -->
        <div id="modeTabs" class="tabs-nav">
          <button id="tabMyTeams">My Teams ⭐</button>
          <button id="tabCountry">Find Match By Country 🏳️</button>
          <button id="tabContinent">Find Match By Continent 🌍</button>
          <button id="tabGlobal">Global Competitions 🏆</button>
        </div>
        
        <!-- Content Grid -->
        <div id="countriesGrid" class="cards-grid">
          <!-- Cards rendered dynamically -->
        </div>
      </div>
      
      <!-- Step 2: League Selection (hidden initially) -->
      <div class="explorer-step hidden" id="stepLeague">
        <div id="leaguesGrid" class="cards-grid"></div>
      </div>
      
      <!-- Step 3: Team Selection (hidden initially) -->
      <div class="explorer-step hidden" id="stepTeam">
        <div id="teamsGrid" class="cards-grid"></div>
      </div>
    </div>
    
    <!-- Hidden inputs -->
    <input type="hidden" id="teamId">
    <input type="hidden" id="nextFixtures" value="10">

    <!-- 3. FIXTURES SECTION -->
    <section class="fixtures-section">
      <div id="fixturesContainer" class="fixtures-grid">
        <div class="empty-state">
          <p>👆 Select a tab above to get started</p>
        </div>
      </div>
    </section>

    <!-- 4. DESKTOP FOOTER (hidden on mobile) -->
    <footer class="footer desktop-footer">...</footer>
    
    <!-- 5. MOBILE BOTTOM NAV (visible on mobile only) -->
    <nav class="mobile-bottom-nav">
      <button class="nav-item" onclick="scrollToTop()">🏠 Home</button>
      <button class="nav-item" onclick="openAuthModal('favorites')">⭐ Favorites</button>
      <button class="nav-item" onclick="openHelpModal()">❓ Help</button>
      <button class="nav-item" onclick="openManageCalendar()">🗓 Calendar</button>
    </nav>
  </div>
</body>
```

---

## CSS Classes & Their Purpose

### Layout Containers

| Class | Purpose | Mobile Behavior |
|-------|---------|-----------------|
| `.container` | Main app wrapper | `padding: 0 4px`, `padding-bottom: 80px` (for bottom nav) |
| `.header` | Top header | `position: fixed`, blue gradient background |
| `.explorer-section` | Main content area | `margin-top: 76px + safe-area` to clear fixed header |
| `.tabs-nav` | Tabs container | `flex-direction: column`, vertical layout |
| `.cards-grid` | Grid for cards | 2 or 3 columns depending on mode |
| `.fixtures-section` | Match fixtures area | Transparent background on mobile |
| `.mobile-bottom-nav` | Bottom navigation | `position: fixed`, `bottom: 0` |

### Key Elements

| ID | Element | Description |
|----|---------|-------------|
| `#mobileBackBtn` | Floating back button | Shows when navigating deeper |
| `#authControls` | Login/Logout area | Inside header |
| `#modeTabs` | Tab buttons container | 4 vertical tabs |
| `#tabMyTeams` | My Teams tab | Default active tab |
| `#countriesGrid` | Main content grid | Shows cards/welcome screen |
| `#fixturesContainer` | Fixtures display | Shows after team selection |

---

## Spacing Values (Mobile)

```
Header:
  - padding: 6px 16px 4px
  - padding-top: calc(6px + env(safe-area-inset-top))

Explorer Section:
  - margin-top: calc(76px + env(safe-area-inset-top))

Tabs Nav:
  - margin: 4px 12px 0 12px

Cards Grid:
  - margin-top: 4px
  - gap: 4px (country mode) / 10px (other modes)

Bottom Nav:
  - padding-bottom: calc(8px + env(safe-area-inset-bottom))
```

---

## Content States

### My Teams Tab (Not Logged In)
Shows a welcome screen with:
- Welcome message
- Feature highlights (Subscribe, Stay Updated, Auto-Sync)
- "Get Started" login button

### My Teams Tab (Logged In, No Teams)
Shows:
- "No teams subscribed" message
- Invitation to subscribe

### My Teams Tab (Logged In, Has Teams)
Shows:
- Grid of subscribed team cards (2 columns)

### Country/Continent/Global Tabs
Shows:
- Grid of country/continent/competition cards
- Country: 3 columns
- Continent/Global: 2 columns

---

## Z-Index Layers

| Element | z-index |
|---------|---------|
| Header | 500 |
| Mobile Back Button | 9999 |
| Mobile Bottom Nav | 1000 |
| Modals/Popups | 1000+ |

---

## Responsive Breakpoints

| Breakpoint | Description |
|------------|-------------|
| `max-width: 768px` | Mobile styles apply |
| `max-width: 640px` | Smaller mobile (compact styles) |
| `max-width: 380px` | Extra small screens |
| `min-width: 768px` | Tablet/Desktop styles |
| `min-width: 1024px` | Large desktop |

---

*Last Updated: February 2026*
