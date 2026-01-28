const express = require('express');
const path = require('path');
const { PORT } = require('./utils/config');
const fixtureRoutes = require('./routes/fixtures');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Proxy rules for Backend (Python)
// Note: Frontend routes usually take precedence, but here we explicitly proxy
// Auth, Favorites, and Sync Logic to the Python backend on Port 8000
const backendProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Backend is unreachable' });
    }
});

app.use('/api/auth', backendProxy);
app.use('/api/favorites', backendProxy);
app.use('/calendar', backendProxy);
app.use('/sync', backendProxy);

// Node.js specific routes
app.use('/api/fixtures', fixtureRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
