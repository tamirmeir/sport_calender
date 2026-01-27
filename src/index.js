const express = require('express');
const path = require('path');
const { PORT } = require('./utils/config');
const fixtureRoutes = require('./routes/fixtures');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/fixtures', fixtureRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
