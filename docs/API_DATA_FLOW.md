# Backend API & Data Structure Documentation

## 1. Data Flow Architecture

The application uses a hybrid data fetching strategy involving:
1.  **External API (API-Sports)**: The raw data source.
2.  **Node.js Backend**: Proxies requests or fetches data from API-Sports.
3.  **Frontend (Vanilla JS)**: Consumes data from the local Node.js server.

## 2. API Response Handling (The Wrap/Unwrap Issue)

### The Problem
The external **API-Sports** returns data wrapped in a specific structure:
```json
{
  "get": "countries",
  "parameters": [],
  "errors": [],
  "results": 10,
  "response": [ ...actual data array... ]
}
```

However, internal helper functions in our **Node.js backend** (specifically `footballApi.js`) sometimes return the raw array directly when processing data or using mock mode:
```json
[ ...actual data array... ]
```

### The Solution
To ensure the frontend works consistently regardless of whether the data comes raw from the internal helper or wrapped from the external API, we implemented a **Safe Unwrapping Pattern** in `public/js/app_v2.js`.

**Code Implementation:**
```javascript
// Generic handler for both formats
const list = Array.isArray(data) ? data : (data.response || []);
```

This logic is applied in:
*   `loadCountries()`
*   `loadLeagues()`
*   `loadTeams()`

## 3. Directory Structure
*   **`src/api/footballApi.js`**: Centralized logic for fetching data. Handles API authentication and Mock Mode fallback.
*   **`src/routes/fixtures.js`**: Express routes that expose this data to the frontend.
*   **`public/js/app_v2.js`**: Frontend logic that consumes these routes.
