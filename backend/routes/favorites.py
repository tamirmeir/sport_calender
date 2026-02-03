from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, FavoriteTeam, SavedFixture
from services.football_service import football_api
import json
import os

favorites_bp = Blueprint('favorites', __name__)

# Cache Configuration (Must match calendar.py)
CACHE_DIR = os.path.join(os.getcwd(), 'instance', 'cache')

def _should_include_fixture(fixture, filters):
    """
    Determine if a fixture should be included based on user's filter preferences.
    
    Args:
        fixture: API fixture object with 'league' containing 'type' and 'name'
        filters: List of filter strings like ['League', 'Cup', 'Champions League'] or None
    
    Returns:
        bool: True if fixture should be included
    """
    if not filters:
        return True  # No filters = include all
    
    if 'All' in filters:
        return True
    
    league_type = fixture['league']['type']  # "League" or "Cup"
    league_name = fixture['league']['name']
    
    # Check type matches
    if 'League' in filters and league_type == 'League':
        return True
    if 'Cup' in filters and league_type == 'Cup':
        return True
    
    # Check specific league name matches (e.g., "Champions League")
    for keyword in filters:
        if keyword not in ('League', 'Cup', 'All') and keyword in league_name:
            return True
    
    return False

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
    """Add a team to favorites and Auto-Sync to Calendar"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or not data.get('team_id') or not data.get('team_name'):
        return jsonify({'error': 'Missing team_id or team_name'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if already favorited - UPDATE if exists (upsert)
    existing = FavoriteTeam.query.filter_by(
        user_id=user_id,
        team_id=data['team_id']
    ).first()
    
    filters = data.get('filters') # List of allowed strings e.g. ['League', 'Cup', 'UEFA']
    
    if existing:
        # Update existing subscription
        existing.filters = json.dumps(filters) if filters else None
        existing.team_name = data['team_name']  # Update name if changed
        existing.team_logo = data.get('team_logo', existing.team_logo)
        db.session.commit()
        
        # TODO: Could re-sync fixtures here based on new filters
        return jsonify({'message': 'Subscription updated', 'favorite': existing.to_dict()}), 200
    
    # 1. Add to Favorites (new subscription)
    favorite = FavoriteTeam(
        user_id=user_id,
        team_id=data['team_id'],
        team_name=data['team_name'],
        team_logo=data.get('team_logo', ''),
        filters=json.dumps(filters) if filters else None
    )
    db.session.add(favorite)
    db.session.commit()
    
    # 2. Auto-Add Upcoming Fixtures to Calendar
    added_count = 0
    try:
        # Fetch next 10 games
        api_res = football_api.get_fixtures_by_team(data['team_id'], next_n=10)
        fixtures = api_res.get('response', []) if isinstance(api_res, dict) else []
        
        for f in fixtures:
            # Filter Logic - use shared helper
            if not _should_include_fixture(f, filters):
                continue

            fid = f['fixture']['id']
            # Check for duplicates
            exists = SavedFixture.query.filter_by(user_id=user_id, fixture_id=fid).first()
            if not exists:
                new_entry = SavedFixture(
                    user_id=user_id, 
                    fixture_id=fid,
                    fixture_data=json.dumps(f)
                )
                db.session.add(new_entry)
                added_count += 1
                
        if added_count > 0:
            db.session.commit()
            
            # Invalidate Cache
            cache_path = os.path.join(CACHE_DIR, f"{user.username}.ics")
            if os.path.exists(cache_path):
                try:
                    os.remove(cache_path)
                except:
                    pass
    except Exception as e:
        print(f"Error auto-syncing calendar: {e}")
    
    return jsonify({
        'message': 'Team added to favorites',
        'calendar_sync': f'Added {added_count} matches to calendar',
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
    
    # Remove associated saved fixtures from calendar
    try:
        saved_fixtures = SavedFixture.query.filter_by(user_id=user_id).all()
        start_count = len(saved_fixtures)
        for saf in saved_fixtures:
            try:
                data = json.loads(saf.fixture_data)
                # Check if this fixture involves the team being removed
                if (data['teams']['home']['id'] == team_id or 
                    data['teams']['away']['id'] == team_id):
                    db.session.delete(saf)
            except Exception as e:
                print(f"Error parsing fixture data for cleanup: {e}")
                continue
    except Exception as e:
        print(f"Error cleaning up fixtures: {e}")

    db.session.delete(favorite)
    db.session.commit()
    
    # Invalidate cache
    user = User.query.get(user_id)
    cache_path = os.path.join(CACHE_DIR, f"{user.username}.ics")
    if os.path.exists(cache_path):
        try:
            os.remove(cache_path)
        except:
            pass
    
    return jsonify({'message': 'Team removed from favorites and calendar cleaned'}), 200

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
    
    import json as _json
    for fav_team in user.favorite_teams:
        filters = fav_team.filters
        league_filter = None
        if filters:
            try:
                filters_list = _json.loads(filters)
                # If filters is a dict, support {league: ...}
                if isinstance(filters_list, dict) and 'league' in filters_list:
                    league_filter = filters_list['league']
                elif isinstance(filters_list, list):
                    # If filters is a list, look for league name
                    for f in filters_list:
                        if f.lower().startswith('ligat') or f.lower() in ['state cup', 'cup']:
                            league_filter = f
            except Exception:
                pass
        fixtures = football_api.get_fixtures_by_team(fav_team.team_id, next_n=10)
        matches = fixtures.get('response', []) if isinstance(fixtures, dict) else []
        # If league_filter is set, filter matches
        if league_filter:
            matches = [m for m in matches if m.get('league', {}).get('name') == league_filter]
        all_matches.extend(matches)
    # Sort by date
    all_matches.sort(key=lambda x: x['fixture']['date'])
    return jsonify({'matches': all_matches}), 200

@favorites_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_favorites():
    """Manually re-sync fixtures for all favorite teams"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    favorites = user.favorite_teams
    total_added = 0
    
    for fav in favorites:
        try:
            # Re-parse filters
            filters = json.loads(fav.filters) if fav.filters else []
            
            # Fetch next 10 games
            api_res = football_api.get_fixtures_by_team(fav.team_id, next_n=10)
            fixtures = api_res.get('response', []) if isinstance(api_res, dict) else []
            
            for f in fixtures:
                # Use shared filter logic
                if not _should_include_fixture(f, filters):
                    continue

                # Check if exists
                fixture_id = f['fixture']['id']
                exists = SavedFixture.query.filter_by(
                    user_id=user.id, 
                    fixture_id=fixture_id
                ).first()
                
                if not exists:
                    new_fixture = SavedFixture(
                        user_id=user.id,
                        fixture_id=fixture_id,
                        fixture_data=json.dumps(f)
                    )
                    db.session.add(new_fixture)
                    total_added += 1
                    
        except Exception as e:
            print(f"Error syncing team {fav.team_id}: {e}")
            continue

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Database error during sync', 'details': str(e)}), 500

    return jsonify({
        'success': True, 
        'message': f'Sync complete. Added {total_added} new fixtures.',
        'total_added': total_added
    }), 200

