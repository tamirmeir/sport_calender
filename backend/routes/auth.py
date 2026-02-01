"""
Authentication Routes
User registration and login endpoints
"""
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from extensions import db, jwt, mail
from models import User, LoginLog
from datetime import timedelta
import os
import textwrap

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    
    Request JSON:
    {
        "username": "string",
        "email": "string",
        "password": "string"
    }
    
    Returns JWT token on success
    """
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields: username, email, password'}), 400
    
    # Check if user exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create user
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict(),
        'access_token': access_token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login user
    
    Request JSON:
    {
        "username": "string",
        "password": "string"
    }
    
    Returns JWT token on success
    """
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    # Find user and verify password
    user = User.query.filter_by(username=data['username']).first()
    
    ip = request.remote_addr
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        # Log Failure
        try:
            db.session.add(LoginLog(
                username=data.get('username', 'UNKNOWN'),
                status='FAILURE',
                ip_address=ip
            ))
            db.session.commit()
        except Exception as e:
            print(f"Log Error: {e}")
            db.session.rollback()
            
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Log Success
    try:
        db.session.add(LoginLog(
            username=user.username,
            email=user.email,
            status='SUCCESS',
            ip_address=ip
        ))
        db.session.commit()
    except Exception as e:
        print(f"Log Error: {e}")
        db.session.rollback()
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token
    }), 200

@auth_bp.route('/reset-request', methods=['POST'])
def reset_request():
    """
    Verify user details for password reset
    
    Request JSON:
    {
        "username": "string",
        "email": "string"
    }
    """
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email'):
        return jsonify({'error': 'Missing username or email'}), 400
        
    user = User.query.filter_by(username=data['username'], email=data['email']).first()
    
    if user:
        try:
            # Create a reset token valid for 1 hour
            reset_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=1), additional_claims={"type": "reset"})
            
            # Since we are local, assume port 3000. In prod, check Host header or env var
            reset_link = f"http://127.0.0.1:3000/reset-password.html?token={reset_token}"
            
            # Determine Recipient (Support Dev Redirection)
            recipient = user.email
            redirect_to = os.getenv('MAIL_REDIRECT_TO')
            subject_suffix = ""
            
            if redirect_to:
                subject_suffix = f" [Redirected from {user.email}]"
                recipient = redirect_to
            
            msg = Message(f"Password Reset Request{subject_suffix}",
                          recipients=[recipient])
            
            msg.body = textwrap.dedent(f"""
                Hello {user.username},

                We received a request to reset your password.

                Click the link below to set a new password:
                {reset_link}

                If you did not request this, please ignore this email.
                
                Link expires in 1 hour.
                
                Best regards,
                Matchday Team
            """).strip()
            
            mail.send(msg)
            return jsonify({'message': 'Verification successful. Password reset instructions sent to your email.'}), 200
        except Exception as e:
            print(f"Mail Error: {e}")
            # In production, do not return 500 to avoid enumerating users, but for dev it is fine
            return jsonify({'error': f'Verification successful, but failed to send email: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Username and Email do not match our records.'}), 400

@auth_bp.route('/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    """
    Reset password using the token
    
    Request JSON:
    {
        "password": "string"
    }
    Header: Authorization: Bearer <token>
    """
    user_id = get_jwt_identity()
    
    data = request.get_json()
    if not data or not data.get('password'):
        return jsonify({'error': 'Missing new password'}), 400
        
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user.password_hash = generate_password_hash(data['password'])
    db.session.commit()
    
    return jsonify({'message': 'Password updated successfully'}), 200
