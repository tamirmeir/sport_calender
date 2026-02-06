const express = require('express');
const path = require('path');
const { PORT, BACKEND_URL } = require('./utils/config');
const fixtureRoutes = require('./routes/fixtures');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy rules for Backend (Python)
// Handles /api/auth, /api/favorites, /api/health, /calendar, /sync
// Must be defined BEFORE body-parser (express.json) to avoid stream issues
const backendProxy = createProxyMiddleware({
    target: BACKEND_URL, 
    changeOrigin: true,
    pathFilter: ['/api/auth', '/api/favorites', '/api/health', '/calendar', '/sync'],
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Backend is unreachable' });
    }
});

app.use(backendProxy);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Node.js specific routes
app.use('/api/fixtures', fixtureRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Optional: Auto-sync metadata on startup (disabled by default)
    // Set SYNC_ON_STARTUP=true in .env to enable
    if (process.env.SYNC_ON_STARTUP === 'true') {
        console.log('🔄 Starting metadata sync...');
        const { smartSync } = require('./scripts/sync_metadata');
        smartSync().catch(err => console.error('Sync error:', err));
    }
    
    // Start Smart Cache scheduler (daily revalidation at 3 AM)
    if (process.env.ENABLE_SCHEDULER !== 'false') {
        console.log('⏰ Starting Smart Cache scheduler...');
        const scheduler = require('./utils/scheduler');
        scheduler.start();
    }
});
