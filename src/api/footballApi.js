const axios = require('axios');
const { FOOTBALL_API_KEY, API_BASE_URL, IS_DEMO_MODE } = require('../utils/config');

// Simple In-Memory Cache
const apiCache = {};
const CACHE_TTL = {
    fixtures: 6 * 60 * 60 * 1000,  // 6 Hours: Schedules don't change often
    static: 24 * 60 * 60 * 1000    // 24 Hours for countries/leagues
};

function getCache(key) {
    const entry = apiCache[key];
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        delete apiCache[key];
        return null;
    }
    return entry.data;
}

function setCache(key, data, type = 'fixtures') {
    apiCache[key] = {
        data,
        expiry: Date.now() + CACHE_TTL[type]
    };
}

class FootballApi {
    constructor() {
        this.headers = {
            'x-apisports-key': FOOTBALL_API_KEY,
            'x-apisports-host': 'v3.football.api-sports.io'
        };
    }

    async getFixturesByTeam(teamId, next = 10) {
        if (IS_DEMO_MODE) return this.getMockFixtures();
        
        const cacheKey = `fixtures_${teamId}_${next}`;
        const cached = getCache(cacheKey);
        if (cached) {
            console.log('Serving from Cache:', cacheKey);
            return cached;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/fixtures`, {
                params: { team: teamId, next },
                headers: this.headers
            });
            
            const data = response.data.response;
            setCache(cacheKey, data, 'fixtures');
            return data;
        } catch (error) {
            console.error('API Error:', error.message);
            return this.getMockFixtures();
        }
    }

    async getCountries() {
        if (IS_DEMO_MODE) return [{"name": "Israel", "code": "IL", "flag": "https://media.api-sports.io/flags/il.svg"}, {"name": "England", "code": "GB", "flag": "https://media.api-sports.io/flags/gb.svg"}];
        
        const cacheKey = 'countries_list';
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${API_BASE_URL}/countries`, {
                headers: this.headers
            });
            const data = response.data.response;
            setCache(cacheKey, data, 'static');
            return data;
        } catch (error) {
            console.error('API Error (Countries):', error.message);
            return [];
        }
    }

    async getLeagues(country) {
        if (IS_DEMO_MODE) return [{"league":{"id":1,"name":"Ligat HaAl","type":"League","logo":"https://media.api-sports.io/football/leagues/1.png"},"country":{"name":"Israel","code":"IL","flag":"https://media.api-sports.io/flags/il.svg"},"seasons":[{"year":2023,"start":"2023-08-26","end":"2024-05-25","current":true}]}];
        
        const cacheKey = `leagues_${country}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${API_BASE_URL}/leagues`, {
                params: { country: country },
                headers: this.headers
            });
            console.log(`Fetched leagues for ${country}: ${response.data.response.length}`);
            const data = response.data.response;
            setCache(cacheKey, data, 'static');
            return data;
        } catch (error) {
            console.error('API Error (Leagues):', error.message);
            return [];
        }
    }

    async getTeams(league, season) {
        if (IS_DEMO_MODE) return [{"team":{"id":1462,"name":"Maccabi Haifa","code":"MAC","country":"Israel","founded":1913,"national":false,"logo":"https://media.api-sports.io/football/teams/1462.png"},"venue":{"id":1111,"name":"Sammy Ofer Stadium","address":"Matam Park","city":"Haifa","capacity":30870,"surface":"grass","image":"https://media.api-sports.io/football/venues/1111.png"}}];
        
        const cacheKey = `teams_${league}_${season}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${API_BASE_URL}/teams`, {
                params: { league: league, season: season },
                headers: this.headers
            });
            const data = response.data.response;
            setCache(cacheKey, data, 'static');
            return data;
        } catch (error) {
            console.error('API Error (Teams):', error.message);
            return [];
        }
    }

    async getNationalTeam(country) {
        if (IS_DEMO_MODE) return [{"team": {id: 767, name: "Israel", national: true, logo: "https://media.api-sports.io/football/teams/767.png"}}];
        try {
            console.log(`Fetching National Team for: ${country}`);
            
            // Fix: API-Sports search fails when combining country + search for same string
            // Strategy: Search globally for the country name, then filter by country + national flag
            const response = await axios.get(`${API_BASE_URL}/teams`, {
                params: { search: country }, 
                headers: this.headers
            });
            
            const results = response.data.response;
            
            // Filter strictly:
            // 1. Must be a National Team
            // 2. Must belong to the requested Country
            // 3. Exclude "U21", "U19", "Women" to get the main Senior Team (optional, but usually desired as default)
            const nationalTeams = results.filter(t => 
                t.team.national === true && 
                t.team.country === country &&
                !t.team.name.includes('U21') &&
                !t.team.name.includes('U19') &&
                !t.team.name.includes('U17') &&
                !t.team.name.includes('Women')
            );

            if (nationalTeams.length > 0) {
                 console.log(`Found ${nationalTeams.length} national teams. Returning top match.`);
                 return nationalTeams;
            }

            console.log(`Structure check: Found ${results.length} total via search, but 0 matches after filter.`);
            return [];

        } catch (error) {
            console.error('API Error (National Team):', error.message);
            return [];
        }
    }

    async getFixtureById(id) {
        // Implementation for single fixture
         try {
            const response = await axios.get(`${API_BASE_URL}/fixtures`, {
                params: { id: id },
                headers: this.headers
            });
            return response.data.response[0]; // Return single object
        } catch (error) {
            return null;
        }
    }
    
    async getFixturesByDate(date) {
         try {
            const response = await axios.get(`${API_BASE_URL}/fixtures`, {
                params: { date: date },
                headers: this.headers
            });
            return response.data.response;
        } catch (error) {
            return [];
        }
    }
    
    async getPastFixtures(teamId, last = 10) {
         try {
            const response = await axios.get(`${API_BASE_URL}/fixtures`, {
                params: { team: teamId, last: last, status: 'FT-AET-PEN' },
                headers: this.headers
            });
            return response.data.response;
        } catch (error) {
            return [];
        }
    }

    getMockFixtures() {
        return [{ fixture: { id: 1, date: new Date().toISOString() }, teams: { home: { name: 'Demo FC' }, away: { name: 'Mock City' } } }];
    }
}

module.exports = new FootballApi();
