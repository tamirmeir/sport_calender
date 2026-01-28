"""
Sport Calendar Backend - Main Application
Flask API server for managing sports fixtures and user favorites
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db, jwt

load_dotenv()

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///sport_calendar.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    # Allow CORS for all routes (API + Calendar logic)
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    # Health check
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'ok', 'message': 'Sport Calendar Backend is running'}), 200
    
    # Register blueprints
    with app.app_context():
        from routes.auth import auth_bp
        from routes.favorites import favorites_bp
        from routes.fixtures import fixtures_bp
        from routes.calendar import calendar_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(favorites_bp, url_prefix='/api/favorites')
        app.register_blueprint(fixtures_bp, url_prefix='/api/fixtures')
        app.register_blueprint(calendar_bp, url_prefix='/') # Mount logic at root for /sync/...
        
        # Create tables
        db.create_all()
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 8000))
    debug = os.getenv('FLASK_ENV') == 'development'
    print(f'🚀 Sport Calendar Backend running on http://localhost:{port}')
    app.run(debug=debug, host='0.0.0.0', port=port)
