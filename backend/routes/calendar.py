"""
Calendar Routes
Handles calendar entry creation and ICS feed generation
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, SavedFixture
from services.football_service import FootballAPI
import json
import os
import time
from datetime import datetime

calendar_bp = Blueprint('calendar', __name__)
football_service = FootballAPI()

# Cache Configuration
CACHE_DIR = os.path.join(os.getcwd(), 'instance', 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_DURATION = 6 * 3600  # 6 Hours in seconds

@calendar_bp.route('/calendar/add', methods=['POST'])
@jwt_required()
def add_to_calendar():
    """
    Save selected fixtures to user's calendar
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('fixtures'):
        return jsonify({'error': 'No fixtures provided'}), 400
        
    fixtures = data['fixtures'] # List of fixture objects
    saved_count = 0
    
    for f in fixtures:
        fid = f['fixture']['id']
        # Check if exists
        exists = SavedFixture.query.filter_by(user_id=current_user_id, fixture_id=fid).first()
        if not exists:
            new_entry = SavedFixture(
                user_id=current_user_id, 
                fixture_id=fid,
                fixture_data=json.dumps(f)
            )
            db.session.add(new_entry)
            saved_count += 1
            
    db.session.commit()
    
    # Invalidate Cache on update so user sees changes immediately
    user = User.query.get(current_user_id)
    _invalidate_cache(user.username)
    
    # Generate the sync URL
    sync_url = f"{request.host_url}sync/MatchDayByTM/{user.username}.ics"
    
    return jsonify({
        'message': f'Saved {saved_count} fixtures',
        'sync_url': sync_url
    }), 200

@calendar_bp.route('/calendar/events', methods=['GET'])
@jwt_required()
def get_calendar_events():
    """Get all saved events for the user"""
    current_user_id = get_jwt_identity()
    saved = SavedFixture.query.filter_by(user_id=current_user_id).order_by(SavedFixture.added_at.desc()).all()
    
    events = []
    for s in saved:
        try:
            data = json.loads(s.fixture_data)
            events.append({
                'id': s.id, # The DB ID, not fixture ID
                'fixture_id': s.fixture_id,
                'teams': data['teams'],
                'date': data['fixture']['date'],
                'league': data['league']['name']
            })
        except:
            continue
            
    return jsonify({'events': events}), 200

@calendar_bp.route('/calendar/events/<int:db_id>', methods=['DELETE'])
@jwt_required()
def delete_calendar_event(db_id):
    """Delete a specific event"""
    current_user_id = get_jwt_identity()
    event = SavedFixture.query.filter_by(id=db_id, user_id=current_user_id).first()
    
    if event:
        db.session.delete(event)
        db.session.commit()
        # Invalidate cache
        user = User.query.get(current_user_id)
        _invalidate_cache(user.username)
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Event not found'}), 404

@calendar_bp.route('/calendar/clear', methods=['DELETE'])
@jwt_required()
def clear_calendar():
    """Clear all events for user"""
    current_user_id = get_jwt_identity()
    SavedFixture.query.filter_by(user_id=current_user_id).delete()
    db.session.commit()
    
    user = User.query.get(current_user_id)
    _invalidate_cache(user.username)
    
    return jsonify({'success': True}), 200

def _invalidate_cache(username):
    cache_path = os.path.join(CACHE_DIR, f"{username}.ics")
    if os.path.exists(cache_path):
        try:
            os.remove(cache_path)
        except:
             pass

@calendar_bp.route('/sync/MatchDayByTM/<username>.ics')
def get_ics_feed(username):
    """
    Public ICS feed endpoint - Optimized with Caching
    """
    # 1. Check Cache
    cache_path = os.path.join(CACHE_DIR, f"{username}.ics")
    if os.path.exists(cache_path):
        file_age = time.time() - os.path.getmtime(cache_path)
        if file_age < CACHE_DURATION:
            # Serve Cached File
            with open(cache_path, 'r', encoding='utf-8') as f:
                content = f.read()
                return Response(
                    content,
                    mimetype="text/calendar",
                    headers={"Content-Disposition": f"attachment; filename={username}_MatchDayByTM.ics"}
                )

    # 2. Logic: If cache missing or expired, regenerate
    user = User.query.filter_by(username=username).first_or_404()
    saved_items = SavedFixture.query.filter_by(user_id=user.id).all()
    
    if not saved_items:
        return Response("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR", mimetype="text/calendar")

    # 3. Fetch Fresh Data (Optimization: use IDs to batch fetch)
    fixture_ids = [item.fixture_id for item in saved_items]
    fresh_fixtures = football_service.get_fixtures_by_ids(fixture_ids)
    
    # Map by ID for easy lookup
    fixtures_map = {f['fixture']['id']: f for f in fresh_fixtures}

    # 4. Build ICS content
    ics_content = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Match Calendar//MatchDayByTM//EN",
        "X-WR-CALNAME:MatchDayByTM",
        "CALSCALE:GREGORIAN", 
        "METHOD:PUBLISH"
    ]
    
    for item in saved_items:
        try:
            # Use fresh data if available, else fallback to stale DB data
            f = fixtures_map.get(item.fixture_id)
            if not f:
                 f = json.loads(item.fixture_data)
            
            # Format dates
            dt_str = f['fixture']['date'] # ISO string
            dt_obj = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
            
            # ICS format: YYYYMMDDTHHMMSSZ
            start_str = dt_obj.strftime('%Y%m%dT%H%M%SZ')
            # Assume 2 hours duration
            end_ts = dt_obj.timestamp() + 7200 
            end_obj = datetime.fromtimestamp(end_ts)
            end_str = end_obj.strftime('%Y%m%dT%H%M%SZ')
            
            now_str = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
            
            uid = f"{f['fixture']['id']}@matchdaybytm"
            
            # Add Status to summary if LIVE or FT
            status = f['fixture']['status']['short']
            score = ""
            status_prefix = ""

            if status == 'PST':
                status_prefix = "⚠️ POSTPONED: "
            elif status in ['FT', '1H', '2H', 'HT']:
                score = f" [{f['goals']['home']}-{f['goals']['away']}]"
            
            summary = f"{status_prefix}⚽ {f['teams']['home']['name']} vs {f['teams']['away']['name']}{score}"
            
            # Location Logic (Venue + City)
            venue = f['fixture']['venue'].get('name') or "TBA"
            city = f['fixture']['venue'].get('city')
            location = f"{venue}, {city}" if city and venue != "TBA" else venue

            description = f"{f['league']['name']} - {location}"
            
            ics_content.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART:{start_str}",
                f"DTEND:{end_str}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                f"LOCATION:{location}",
                f"STATUS:{'CANCELLED' if status == 'PST' else 'CONFIRMED'}",
                "END:VEVENT"
            ])
            
            # Update DB record with fresh data (Optional, keeps DB fresh)
            if f != json.loads(item.fixture_data):
                item.fixture_data = json.dumps(f)
                
        except Exception as e:
            print(f"Error parsing fixture {item.id}: {e}")
            continue
    
    ics_content.append("END:VCALENDAR")
    final_ics = "\n".join(ics_content)
    
    # 5. Save to Cache
    try:
        with open(cache_path, 'w', encoding='utf-8') as f:
            f.write(final_ics)
        # Verify update
        db.session.commit() 
    except Exception as e:
        print(f"Cache write error: {e}")

    return Response(
        final_ics,
        mimetype="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={username}_MatchDayByTM.ics"}
    )
