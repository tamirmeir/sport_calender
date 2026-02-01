from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, FavoriteTeam
from services.football_service import football_api

favorites_bp = Blueprint('favorites', __name__)

@favorites_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_favorites():
    """Get all favorite teams for the current user"""
    try:
        current_identity = get_jwt_identity()
        user_id = int(current_identity)
        user = User.query.get(user_id)
        
        if not user:
            # If token is valid but user deleted
            return jsonify({'error': 'User not found', 'favorites': []}), 404
        
        favorites = [fav.to_dict() for fav in user.favorite_teams]
        return jsonify({'favorites': favorites}), 200
    except Exception as e:
        print(f"Error in get_favorites: {e}")
        return jsonify({'error': 'Server error fetching favorites'}), 500

@favorites_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def add_favorite():
    """Add a team to favorites"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or not data.get('team_id') or not data.get('team_name'):
        return jsonify({'error': 'Missing team_id or team_name'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if already favorited
    existing = FavoriteTeam.query.filter_by(
        user_id=user_id,
        team_id=data['team_id']
    ).first()
    
    if existing:
        return jsonify({'error': 'Team already in favorites'}), 400
    
    favorite = FavoriteTeam(
        user_id=user_id,
        team_id=data['team_id'],
        team_name=data['team_name'],
        team_logo=data.get('team_logo', '')
    )
    
    db.session.add(favorite)
    db.session.commit()
    
    return jsonify({
        'message': 'Team added to favorites',
        'favorite': favorite.to_dict()
    }), 201

@favorites_bp.route('/<int:team_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(team_id):
    """Remove a team from favorites"""
    user_id = get_jwt_identity()
    
    favorite = FavoriteTeam.query.filter_by(
        user_id=user_id,
        team_id=team_id
    ).first()
    
    if not favorite:
        return jsonify({'error': 'Favorite not found'}), 404
    
    db.session.delete(favorite)
    db.session.commit()
    
    return jsonify({'message': 'Team removed from favorites'}), 200

@favorites_bp.route('/matches', methods=['GET'])
@jwt_required()
def get_favorite_matches():
    """Get all matches for favorite teams"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not user.favorite_teams:
        return jsonify({'matches': []}), 200
    
    all_matches = []
    
    for fav_team in user.favorite_teams:
        fixtures = football_api.get_fixtures_by_team(fav_team.team_id, next_n=10)
        if fixtures.get('response'):
            all_matches.extend(fixtures['response'])
    
    # Sort by date
    all_matches.sort(key=lambda x: x['fixture']['date'])
    
    return jsonify({'matches': all_matches}), 200
