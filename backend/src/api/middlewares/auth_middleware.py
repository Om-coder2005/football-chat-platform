from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from src.services.auth_service import AuthService
from src.db.connection import get_db

def jwt_required_custom():
    """
    Custom JWT decorator that checks token validity and user status
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                # Verify JWT token
                verify_jwt_in_request()
                
                # Get user ID from token
                user_id = get_jwt_identity()
                
                # Get database session
                db = next(get_db())
                
                # Get user from database
                user = AuthService.get_user_by_id(db, user_id)
                
                if not user:
                    return jsonify({
                        'success': False,
                        'message': 'User not found'
                    }), 404
                
                if user.is_banned:
                    return jsonify({
                        'success': False,
                        'message': 'Your account has been banned'
                    }), 403
                
                if not user.is_active:
                    return jsonify({
                        'success': False,
                        'message': 'Your account is inactive'
                    }), 403
                
                # Pass user to the route function
                return f(current_user=user, *args, **kwargs)
            
            except Exception as e:
                return jsonify({
                    'success': False,
                    'message': f'Authentication failed: {str(e)}'
                }), 401
        
        return wrapper
    return decorator

def optional_jwt():
    """
    Optional JWT decorator - doesn't fail if no token provided
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                
                if user_id:
                    db = next(get_db())
                    user = AuthService.get_user_by_id(db, user_id)
                    return f(current_user=user, *args, **kwargs)
                else:
                    return f(current_user=None, *args, **kwargs)
            
            except Exception:
                return f(current_user=None, *args, **kwargs)
        
        return wrapper
    return decorator