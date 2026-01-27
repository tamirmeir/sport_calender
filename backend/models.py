"""
Database Models for Sport Calendar
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    favorite_teams = db.relationship('FavoriteTeam', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
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
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert favorite team to dictionary"""
        return {
            'id': self.id,
            'team_id': self.team_id,
            'team_name': self.team_name,
            'team_logo': self.team_logo,
            'added_at': self.added_at.isoformat()
        }

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

