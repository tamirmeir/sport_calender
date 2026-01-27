const axios = require('axios');
const { FOOTBALL_API_KEY, API_BASE_URL, IS_DEMO_MODE } = require('../utils/config');

class FootballApi {
    constructor() {
        this.headers = {
            'x-apisports-key': FOOTBALL_API_KEY,
            'x-apisports-host': 'v3.football.api-sports.io'
        };
    }

    async getFixturesByTeam(teamId, next = 10) {
        if (IS_DEMO_MODE) return this.getMockFixtures();
        try {
            const response = await axios.get(`${API_BASE_URL}/fixtures`, {
                params: { team: teamId, next },
                headers: this.headers
            });
            return response.data.response;
        } catch (error) {
            return this.getMockFixtures();
        }
    }

    getMockFixtures() {
        return [{ fixture: { id: 1, date: new Date().toISOString() }, teams: { home: { name: 'Demo FC' }, away: { name: 'Mock City' } } }];
    }
}

module.exports = new FootballApi();
