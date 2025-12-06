from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from src.services.auth_service import AuthService
# from src.api.routes.auth_routes import auth_bp
from src.db.connection import get_db

class AuthController:
    
    @staticmethod
    def register():
        """Handle user registration"""
        try:
            data = request.get_json()
            
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            favorite_club = data.get('favorite_club')
            
            if not username or not email or not password:
                return jsonify({
                    'success': False,
                    'message': 'Username, email, and password are required'
                }), 400
            
            db = next(get_db())
            success, message, user = AuthService.register_user(
                db, username, email, password, favorite_club
            )
            
            if success:
                return jsonify({
                    'success': True,
                    'message': message,
                    'user': user.to_dict()
                }), 201
            else:
                return jsonify({
                    'success': False,
                    'message': message
                }), 400
        
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Registration error: {str(e)}'
            }), 500
    
    @staticmethod
    def login():
        """Handle user login"""
        try:
            data = request.get_json()
            
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return jsonify({
                    'success': False,
                    'message': 'Email and password are required'
                }), 400
            
            db = next(get_db())
            success, message, tokens, user = AuthService.login_user(db, email, password)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': message,
                    'tokens': tokens,
                    'user': user.to_dict()
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': message
                }), 401
        
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Login error: {str(e)}'
            }), 500
    
    @staticmethod
    @jwt_required(refresh=True)
    def refresh_token():
        """Refresh access token using refresh token"""
        try:
            user_id = get_jwt_identity()
            success, message, new_token = AuthService.refresh_access_token(user_id)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': message,
                    'access_token': new_token
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': message
                }), 400
        
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Token refresh error: {str(e)}'
            }), 500
    
    @staticmethod
    @jwt_required()
    def get_current_user():
        """Get current authenticated user's profile"""
        try:
            user_id = get_jwt_identity()
            db = next(get_db())
            user = AuthService.get_user_by_id(db, user_id)
            
            if user:
                return jsonify({
                    'success': True,
                    'user': user.to_dict()
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404
        
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error fetching user: {str(e)}'
            }), 500
    
    @staticmethod
    @jwt_required()
    def logout():
        """Handle user logout (client-side token removal)"""
        # Note: JWT logout is typically handled client-side by removing tokens
        # For server-side logout, you'd need to implement token blacklisting
        return jsonify({
            'success': True,
            'message': 'Logout successful. Please remove tokens from client.'
        }), 200