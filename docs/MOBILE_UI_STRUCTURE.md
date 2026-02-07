# Mobile UI Structure - Main App Screen

## Overview
This document describes the UI elements, containers, colors, and styling displayed on the main app screen when the app starts on mobile devices.

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
           ↓ 8px gap ↓
┌─────────────────────────────────────────┐
│         EXPLORER SECTION                │
│  ┌─────────────────────────────────┐    │
│  │          TABS NAV               │    │  ← Gray background container
│  │  ┌─────────────────────────┐    │    │
│  │  │ My Teams            ⭐  │    │    │  ← White background, active = blue
│  │  └─────────────────────────┘    │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ Find Match By Country 🏳️│    │    │  ← White background
│  │  └─────────────────────────┘    │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ Find Match By Continent🌍│    │    │  ← White background
│  │  └─────────────────────────┘    │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ Global Competitions  🏆 │    │    │  ← White background
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        COUNTRIES GRID           │    │  ← Transparent background
│  │   (or Welcome Screen if         │    │
│  │    My Teams tab & not logged in)│    │
│  │                                 │    │
│  │   [Card] [Card] [Card]          │    │  ← Glass effect cards
│  │   [Card] [Card] [Card]          │    │
│  │   ...                           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         FIXTURES SECTION                │  ← Transparent on mobile
│  (Empty state initially)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      MOBILE BOTTOM NAV (fixed)          │  ← White background, top border
│  🏠 Home  ⭐ Favorites  ❓ Help  🗓 Cal │
└─────────────────────────────────────────┘
```

---

## Detailed Element Specifications

### 1. HEADER `.header`

| Property | Value |
|----------|-------|
| **Position** | `fixed` (top: 0, left: 0, right: 0) |
| **Z-Index** | `500` |
| **Background** | `linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(29, 78, 216, 0.98) 100%)` |
| **Background Color (simplified)** | Blue gradient (`#2563eb` to `#1d4ed8`) |
| **Text Color** | `white` |
| **Padding** | `6px 16px 4px` |
| **Padding Top (with safe area)** | `calc(6px + env(safe-area-inset-top))` |
| **Border** | None |
| **Border Radius** | `0` (full width) |
| **Box Shadow** | `var(--shadow-lg)` |
| **Backdrop Filter** | `blur(20px) saturate(180%)` |

#### Header Children:

| Element | Class/ID | Styling |
|---------|----------|---------|
| Help Button | `.help-fab` | Hidden on mobile |
| Auth Controls | `#authControls` | `position: relative`, centered |
| Title H1 | `.header h1` | `font-size: 1.1rem`, `color: white`, `margin: 0 0 2px 0` |
| Subtitle P | `.header p` | `font-size: 0.75rem`, `color: rgba(255,255,255,0.95)` |
| Sub-header | `.header .sub-header` | `display: none` on mobile |

---

### 2. EXPLORER SECTION `.explorer-section`

| Property | Value |
|----------|-------|
| **Margin Top** | `calc(76px + env(safe-area-inset-top))` |
| **Padding** | `0` |
| **Width** | `100%` |
| **Background** | Transparent (inherits from body) |
| **Border** | None |

---

### 3. TABS NAVIGATION `.tabs-nav`

| Property | Value |
|----------|-------|
| **Display** | `flex` |
| **Flex Direction** | `column` (vertical on mobile) |
| **Gap** | `6px` |
| **Margin** | `8px 0 0 0` |
| **Padding** | `6px` |
| **Width** | `100%` |
| **Background** | `var(--color-bg-secondary)` → `#f1f5f9` (light gray) |
| **Border Radius** | `var(--radius-lg)` → `12px` |
| **Border** | None |
| **Overflow** | `hidden` |

---

### 4. TAB BUTTON `.tab-btn`

#### Default State:

| Property | Value |
|----------|-------|
| **Width** | `100%` |
| **Min Height** | `48px` (but overridden to `auto` on mobile) |
| **Padding** | `8px 12px` |
| **Background** | `white` (`#ffffff`) |
| **Border** | None |
| **Border Radius** | `0` (on mobile, full width) |
| **Box Shadow** | `var(--shadow-sm)` |
| **Text Color** | `var(--color-text-secondary)` → `#64748b` |
| **Font Size** | `0.875rem` |
| **Font Weight** | `500` |
| **Display** | `flex` |
| **Justify Content** | `space-between` |
| **Align Items** | `center` |
| **Cursor** | `pointer` |
| **Transition** | `all var(--transition-fast)` → `0.15s` |

#### Hover State `.tab-btn:hover`:

| Property | Value |
|----------|-------|
| **Background** | `#f1f5f9` (light gray) |
| **Transform** | `translateX(4px)` |

#### Active State `.tab-btn.active`:

| Property | Value |
|----------|-------|
| **Background** | `var(--color-primary)` → `#3b82f6` (blue) |
| **Text Color** | `white` |
| **Box Shadow** | `var(--shadow-md)` |
| **Transform** | `translateX(4px)` |

#### Tab Content:

| Element | Class | Styling |
|---------|-------|---------|
| Text | `.tab-text` | `flex: 1`, `text-align: left` |
| Icon | `.tab-icon` | `font-size: 1.2rem`, `margin-left: 12px` |

---

### 5. CARDS GRID `.cards-grid`

| Property | Value |
|----------|-------|
| **Display** | `grid` |
| **Grid Columns (default)** | `repeat(2, 1fr)` (2 columns) |
| **Grid Columns (country-mode)** | `repeat(3, 1fr)` (3 columns) |
| **Gap** | `10px` (default) / `4px` (country-mode) |
| **Width** | `100%` |
| **Padding** | `8px` |
| **Margin Top** | `8px` |
| **Background** | Transparent |
| **Max Height** | None (scrollable) |
| **Overflow Y** | `visible` |

---

### 6. GRID CARD `.grid-card`

| Property | Value |
|----------|-------|
| **Display** | `flex` |
| **Flex Direction** | `column` |
| **Align Items** | `center` |
| **Justify Content** | `center` |
| **Gap** | `6px` |
| **Padding** | `10px 8px` (default) / `4px 2px` (country-mode) |
| **Min Height** | `70px` (default) / `50px` (country-mode) |
| **Background** | `var(--glass-bg)` → `rgba(255,255,255,0.7)` |
| **Backdrop Filter** | `blur(16px) saturate(180%)` |
| **Border** | `1px solid var(--glass-border)` → `rgba(255,255,255,0.2)` |
| **Border Radius** | `var(--radius-lg)` → `12px` |
| **Box Shadow** | `var(--shadow-md)` |
| **Cursor** | `pointer` |
| **Transition** | `all var(--transition-base)` → `0.2s` |

#### Hover State `.grid-card:hover`:

| Property | Value |
|----------|-------|
| **Transform** | `translateY(-3px)` |
| **Box Shadow** | `var(--shadow-xl)` |
| **Border Color** | `var(--color-primary-light)` |

#### Card Image:

| Property | Value |
|----------|-------|
| **Width** | `32px` (default) / `20px` (country-mode) |
| **Height** | `32px` (default) / `20px` (country-mode) |

#### Card Text:

| Property | Value |
|----------|-------|
| **Font Size** | `0.75rem` (default) / `0.55rem` (country-mode) |
| **Text Overflow** | `ellipsis` |
| **White Space** | `nowrap` |
| **Text Align** | `center` |

---

### 7. WELCOME SCREEN `.welcome-screen`

| Property | Value |
|----------|-------|
| **Grid Column** | `1 / -1` (spans all columns) |
| **Background** | `linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)` (light blue) |
| **Border Radius** | `16px` (12px on mobile) |
| **Padding** | `30px 20px` (24px 16px on mobile) |
| **Min Height** | `400px` (`calc(100vh - 350px)` on mobile) |
| **Display** | `flex` |
| **Flex Direction** | `column` |
| **Justify Content** | `center` |
| **Align Items** | `center` |
| **Text Align** | `center` |

#### Welcome Screen Children:

| Element | Class | Styling |
|---------|-------|---------|
| Icon | `.welcome-icon` | `font-size: 4rem`, bounce animation |
| Title | `.welcome-title` | `font-size: 1.6rem`, `color: #1e3a8a`, `font-weight: 700` |
| Subtitle | `.welcome-subtitle` | `font-size: 1.1rem`, `color: #3b82f6` |
| Features | `.welcome-features` | `flex column`, `gap: 16px`, `max-width: 320px` |
| Feature Card | `.welcome-feature` | `background: white`, `padding: 14px 16px`, `border-radius: 12px` |
| Button | `.welcome-btn` | `background: linear-gradient(#3b82f6, #1d4ed8)`, `border-radius: 30px` |

---

### 8. FIXTURES SECTION `.fixtures-section`

| Property | Value (Mobile) |
|----------|----------------|
| **Background** | `transparent` |
| **Border** | None |
| **Box Shadow** | None |
| **Margin** | `0` |
| **Padding** | `0` |

---

### 9. FIXTURES GRID `.fixtures-grid`

| Property | Value (Mobile) |
|----------|----------------|
| **Background** | `transparent` |
| **Margin** | `0` |
| **Padding** | `0` |

---

### 10. EMPTY STATE `.empty-state`

| Property | Value (Mobile) |
|----------|----------------|
| **Background** | `transparent` |
| **Border** | None |
| **Padding** | `8px` |
| **Margin** | `0` |
| **Text** | `👆 Select a tab above to get started` |

---

### 11. MOBILE BOTTOM NAV `.mobile-bottom-nav`

| Property | Value |
|----------|-------|
| **Display** | `flex` (hidden on desktop) |
| **Position** | `fixed` |
| **Bottom** | `0` |
| **Left/Right** | `0` |
| **Background** | `white` (`#ffffff`) |
| **Border Top** | `1px solid #e2e8f0` |
| **Box Shadow** | `0 -2px 10px rgba(0,0,0,0.1)` |
| **Padding** | `8px 0` |
| **Padding Bottom** | `calc(8px + env(safe-area-inset-bottom))` |
| **Z-Index** | `1000` |
| **Justify Content** | `space-around` |

#### Nav Item `.nav-item`:

| Property | Value |
|----------|-------|
| **Display** | `flex` |
| **Flex Direction** | `column` |
| **Align Items** | `center` |
| **Gap** | `4px` |
| **Background** | None |
| **Border** | None |
| **Padding** | `8px 16px` |
| **Color** | `#64748b` |
| **Cursor** | `pointer` |

| Child | Class | Styling |
|-------|-------|---------|
| Icon | `.nav-icon` | `font-size: 1.4rem` |
| Label | `.nav-label` | `font-size: 0.7rem`, `font-weight: 500` |

---

### 12. MOBILE BACK BUTTON `#mobileBackBtn`

| Property | Value |
|----------|-------|
| **Display** | `flex` (when visible) / `none` (when hidden) |
| **Position** | `fixed` |
| **Top** | `calc(16px + env(safe-area-inset-top))` |
| **Left** | `16px` |
| **Z-Index** | `9999` |
| **Background** | `#3b82f6` (blue) |
| **Color** | `white` |
| **Border** | None |
| **Border Radius** | `50%` (circle) |
| **Width** | `48px` |
| **Height** | `48px` |
| **Box Shadow** | `0 4px 12px rgba(59, 130, 246, 0.4)` |
| **Font Size** | `1.4rem` |
| **Content** | `←` |

---

## Color Palette Summary

| Color Name | Hex Value | Usage |
|------------|-----------|-------|
| Primary Blue | `#3b82f6` | Active tabs, buttons, links |
| Primary Blue Dark | `#2563eb` / `#1d4ed8` | Header gradient, hover states |
| White | `#ffffff` | Tab backgrounds, cards, bottom nav |
| Light Gray | `#f1f5f9` | Tabs container background, hover states |
| Text Primary | `#1e293b` | Main text |
| Text Secondary | `#64748b` | Inactive tabs, labels, icons |
| Border | `#e2e8f0` | Borders, dividers |
| Light Blue BG | `#eff6ff` / `#dbeafe` | Welcome screen gradient |
| Success Green | `#22c55e` | Win indicators |
| Warning Yellow | `#f59e0b` | Draw indicators |
| Error Red | `#ef4444` | Loss indicators |

---

## CSS Variables Reference

```css
--color-primary: #3b82f6;
--color-primary-hover: #2563eb;
--color-primary-light: rgba(59, 130, 246, 0.1);

--color-bg-primary: #ffffff;
--color-bg-secondary: #f1f5f9;
--color-surface: #ffffff;

--color-text-primary: #1e293b;
--color-text-secondary: #64748b;

--color-border: #e2e8f0;

--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.2);

--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);

--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;

--transition-fast: 0.15s ease;
--transition-base: 0.2s ease;
```

---

## Z-Index Layers

| Element | z-index |
|---------|---------|
| Mobile Back Button | 9999 |
| Mobile Bottom Nav | 1000 |
| Team Info Popup | 1000 |
| Popup Overlay | 999 |
| Header | 500 |
| Help FAB | 100 |

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
