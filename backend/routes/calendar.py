"""
Calendar Routes
Handles calendar entry creation and ICS feed generation
"""
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User, SavedFixture
import json
from datetime import datetime

calendar_bp = Blueprint('calendar', __name__)

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
    
    # Generate the sync URL
    user = User.query.get(current_user_id)
    sync_url = f"{request.host_url}sync/MatchDayByTM/{user.username}.ics"
    
    return jsonify({
        'message': f'Saved {saved_count} fixtures',
        'sync_url': sync_url
    }), 200

@calendar_bp.route('/sync/MatchDayByTM/<username>.ics')
def get_ics_feed(username):
    """
    Public ICS feed endpoint
    """
    # 1. Find user
    user = User.query.filter_by(username=username).first_or_404()
    
    # 2. Get saved fixtures
    saved = SavedFixture.query.filter_by(user_id=user.id).all()
    
    # 3. Build ICS content
    # Header with requested Name
    ics_content = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Sport Calendar//MatchDayByTM//EN",
        "X-WR-CALNAME:MatchDayByTM",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    for item in saved:
        try:
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
            summary = f"⚽ {f['teams']['home']['name']} vs {f['teams']['away']['name']}"
            description = f"{f['league']['name']} - {f['fixture']['venue'].get('name', 'TBA')}"
            
            ics_content.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART:{start_str}",
                f"DTEND:{end_str}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                "END:VEVENT"
            ])
        except Exception as e:
            print(f"Error parsing fixture {item.id}: {e}")
            continue
            
    ics_content.append("END:VCALENDAR")
    
    return Response(
        "\n".join(ics_content),
        mimetype="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={username}_MatchDayByTM.ics"}
    )
