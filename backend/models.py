"""
Database Models for Match Calendar
User and FavoriteTeam models
"""
from extensions import db
from datetime import datetime

class User(db.Model):
    """User model - stores user account information"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    has_seen_sync_promo = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    favorite_teams = db.relationship('FavoriteTeam', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'has_seen_sync_promo': self.has_seen_sync_promo,
            'created_at': self.created_at.isoformat(),
            'favorite_teams_count': len(self.favorite_teams)
        }

class FavoriteTeam(db.Model):
    """FavoriteTeam model - stores user's favorite teams"""
    __tablename__ = 'favorite_teams'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team_id = db.Column(db.Integer, nullable=False)
    team_name = db.Column(db.String(120), nullable=False)
    team_logo = db.Column(db.String(255))
    filters = db.Column(db.Text, default=None) # JSON list of allowed types: ['League', 'Cup']
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert favorite team to dictionary"""
        import json as _json
        return {
            'id': self.id,
            'team_id': self.team_id,
            'team_name': self.team_name,
            'team_logo': self.team_logo,
            'filters': _json.loads(self.filters) if self.filters else None,
            'added_at': self.added_at.isoformat()
        }

class LoginLog(db.Model):
    """LoginLog model - tracks user login attempts"""
    __tablename__ = 'login_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(20), nullable=False) # 'SUCCESS', 'FAILURE'
    ip_address = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class SavedFixture(db.Model):
    """SavedFixture model - stores specific matches for calendar export"""
    __tablename__ = 'saved_fixtures'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    fixture_id = db.Column(db.Integer, nullable=False)
    fixture_data = db.Column(db.Text, nullable=False) # JSON string of match details
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Backref from User
    user = db.relationship('User', backref=db.backref('saved_fixtures', lazy=True))

