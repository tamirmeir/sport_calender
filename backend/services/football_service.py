import requests
from config import FOOTBALL_API_KEY, API_BASE_URL

class FootballAPI:
    def __init__(self):
        self.api_key = FOOTBALL_API_KEY
        self.base_url = API_BASE_URL
        self.headers = {
            'x-apisports-key': self.api_key,
            'x-apisports-host': 'v3.football.api-sports.io'
        }
    
    def get_fixtures_by_team(self, team_id, next_n=10, last_n=None, season=None):
        """Get fixtures for a team (next, last, or by season)"""
        try:
            # Demo mode
            if self.api_key == 'demo_key_12345':
                return self._get_demo_fixtures()
            
            url = f'{self.base_url}/fixtures'
            params = {'team': team_id}
            
            # Priority: Season > Last > Next
            if season:
                params['season'] = season
            elif last_n:
                params['last'] = last_n
            else:
                params['next'] = next_n
                
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'Error fetching fixtures: {str(e)}')
            return self._get_demo_fixtures()
    
    def get_team_info(self, team_id):
        """Get team information"""
        try:
            if self.api_key == 'demo_key_12345':
                return self._get_demo_team_info(team_id)
            
            url = f'{self.base_url}/teams'
            params = {'id': team_id}
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'Error fetching team info: {str(e)}')
            return self._get_demo_team_info(team_id)

    def get_countries(self):
        """Get list of countries"""
        try:
            if self.api_key == 'demo_key_12345':
                return self._get_demo_countries()
            
            url = f'{self.base_url}/countries'
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'Error fetching countries: {str(e)}')
            return self._get_demo_countries()

    def get_leagues(self, country):
        """Get leagues for a specific country"""
        try:
            if self.api_key == 'demo_key_12345':
                return self._get_demo_leagues(country)
            
            url = f'{self.base_url}/leagues'
            params = {'country': country}
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'Error fetching leagues: {str(e)}')
            return self._get_demo_leagues(country)

    def get_teams(self, league_id, season):
        """Get teams for a specific league and season"""
        try:
            if self.api_key == 'demo_key_12345':
                return self._get_demo_teams(league_id)
            
            url = f'{self.base_url}/teams'
            params = {'league': league_id, 'season': season}
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'Error fetching teams: {str(e)}')
            return self._get_demo_teams(league_id)

    def search_teams(self, query):
        """Search teams by name"""
        try:
            if self.api_key == 'demo_key_12345':
                return self._get_demo_teams_search(query)
            
            url = f'{self.base_url}/teams'
            params = {'search': query}
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f'Error searching teams: {str(e)}')
            return self._get_demo_teams_search(query)
    
    def _get_demo_fixtures(self):
        """Return demo fixtures"""
        return {
            'response': [
                {
                    'fixture': {
                        'id': 1001,
                        'date': '2026-02-01T15:00:00Z',
                        'status': {'short': 'NS', 'long': 'Not Started'},
                        'venue': {'name': 'Old Trafford', 'city': 'Manchester'}
                    },
                    'league': {'name': 'Premier League', 'season': 2025},
                    'teams': {
                        'home': {'id': 604, 'name': 'Manchester United', 'logo': 'https://media.api-sports.io/teams/33.png'},
                        'away': {'id': 33, 'name': 'Manchester City', 'logo': 'https://media.api-sports.io/teams/33.png'}
                    },
                    'goals': {'home': None, 'away': None}
                }
            ]
        }
    
    def _get_demo_team_info(self, team_id):
        """Return demo team info"""
        return {
            'response': [
                {
                    'team': {
                        'id': team_id,
                        'name': 'Manchester United',
                        'logo': 'https://media.api-sports.io/teams/33.png'
                    }
                }
            ]
        }

    def _get_demo_teams_search(self, query):
        """Return demo search results"""
        return {
            'response': [
                {'team': {'id': 33, 'name': 'Manchester United', 'logo': 'https://media.api-sports.io/teams/33.png'}},
                {'team': {'id': 34, 'name': 'Newcastle', 'logo': 'https://media.api-sports.io/teams/34.png'}}
            ]
        }

    def _get_demo_countries(self):
        return {
            'response': [
                {'name': 'England', 'code': 'GB', 'flag': 'https://media.api-sports.io/flags/gb.svg'},
                {'name': 'Spain', 'code': 'ES', 'flag': 'https://media.api-sports.io/flags/es.svg'},
                {'name': 'Germany', 'code': 'DE', 'flag': 'https://media.api-sports.io/flags/de.svg'}
            ]
        }

    def _get_demo_leagues(self, country):
        return {
            'response': [
                {
                    'league': {'id': 39, 'name': 'Premier League', 'type': 'League', 'logo': 'https://media.api-sports.io/football/leagues/39.png'},
                    'country': {'name': 'England', 'code': 'GB', 'flag': 'https://media.api-sports.io/flags/gb.svg'}
                }
            ]
        }

    def _get_demo_teams(self, league_id):
        return {
            'response': [
                {'team': {'id': 33, 'name': 'Manchester United', 'logo': 'https://media.api-sports.io/teams/33.png'}},
                {'team': {'id': 40, 'name': 'Liverpool', 'logo': 'https://media.api-sports.io/teams/40.png'}},
                {'team': {'id': 42, 'name': 'Arsenal', 'logo': 'https://media.api-sports.io/teams/42.png'}}
            ]
        }

# Create instance
football_api = FootballAPI()
