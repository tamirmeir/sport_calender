"""
Fixtures Routes
Endpoints for fetching football fixtures and team information
"""
from flask import Blueprint, request, jsonify
from services.football_service import football_api

fixtures_bp = Blueprint('fixtures', __name__)

@fixtures_bp.route('/team/<int:team_id>', methods=['GET'])
def get_team_fixtures(team_id):
    """
    Get fixtures for a specific team
    
    Query params:
    - next: number of next fixtures (default: 10)
    - last: number of last fixtures
    - season: specific season year
    
    Returns: List of fixtures for the team
    """
    next_n = request.args.get('next', 10, type=int)
    last_n = request.args.get('last', type=int)
    season = request.args.get('season', type=int)
    
    if next_n and (next_n < 1 or next_n > 100):
        return jsonify({'error': 'next parameter must be between 1 and 100'}), 400
        
    fixtures = football_api.get_fixtures_by_team(team_id, next_n=next_n, last_n=last_n, season=season)
    return jsonify(fixtures), 200

@fixtures_bp.route('/team/<int:team_id>/info', methods=['GET'])
def get_team_info(team_id):
    """
    Get detailed information about a team
    
    Returns: Team info including name, logo, etc.
    """
    team_info = football_api.get_team_info(team_id)
    return jsonify(team_info), 200

@fixtures_bp.route('/countries', methods=['GET'])
def get_countries():
    """Get list of countries"""
    data = football_api.get_countries()
    return jsonify(data), 200

@fixtures_bp.route('/leagues', methods=['GET'])
def get_leagues():
    """Get leagues by country"""
    country = request.args.get('country')
    if not country:
        return jsonify({'error': 'Country parameter required'}), 400
    data = football_api.get_leagues(country)
    return jsonify(data), 200

@fixtures_bp.route('/teams', methods=['GET'])
def get_teams():
    """Get teams by league and season OR search by name"""
    league = request.args.get('league')
    season = request.args.get('season', 2023, type=int)
    search = request.args.get('search')
    
    if search:
        # Search mode
        if len(search) < 3:
             return jsonify({'error': 'Search query must be at least 3 characters'}), 400
        data = football_api.search_teams(search)
        return jsonify(data), 200
        
    # League listing mode
    if not league:
        return jsonify({'error': 'League or Search parameter required'}), 400
        
    data = football_api.get_teams(league, season)
    return jsonify(data), 200
