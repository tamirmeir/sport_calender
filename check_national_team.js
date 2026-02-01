require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function checkNationalTeam() {
    try {
        console.log(`Fetching teams for Israel... using key: ${API_KEY ? 'Yes' : 'No'}`);
        const response = await axios.get(`${BASE_URL}/teams`, {
            params: { country: 'Israel', search: 'Israel' }, 
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        const teams = response.data.response;
        // console.log(teams);
        if (teams && teams.length > 0) {
             const nationalTeam = teams.find(t => t.team.national === true);
             if (nationalTeam) {
                console.log('Found National Team:');
                console.log(`ID: ${nationalTeam.team.id}`);
                console.log(`Name: ${nationalTeam.team.name}`);
                console.log(`Logo: ${nationalTeam.team.logo}`);
             } else {
                 console.log('No team marked as national found in search "Israel"');
             }
        } else {
            console.log("No teams found");
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkNationalTeam();
