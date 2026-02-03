from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy.orm import Session
from src.db.models.user import User
import re

class AuthService:
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def validate_password(password):
        """
        Validate password strength
        At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        """
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        return True, "Password is valid"

    @staticmethod
    def register_user(db: Session, username, email, password, favorite_club=None):
        """
        Register a new user
        Returns: (success: bool, message: str, user: User or None)
        """
        # Validate input
        if not username or len(username) < 3:
            return False, "Username must be at least 3 characters long", None

        if not AuthService.validate_email(email):
            return False, "Invalid email format", None

        is_valid, msg = AuthService.validate_password(password)
        if not is_valid:
            return False, msg, None

        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            if existing_user.username == username:
                return False, "Username already exists", None
            if existing_user.email == email:
                return False, "Email already registered", None

        # Create new user
        try:
            new_user = User(
                username=username,
                email=email,
                favorite_club=favorite_club
            )
            new_user.set_password(password)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return True, "User registered successfully", new_user
        except Exception as e:
            db.rollback()
            return False, f"Registration failed: {str(e)}", None

    @staticmethod
    def login_user(db: Session, email, password):
        """
        Authenticate user and generate tokens
        Returns: (success: bool, message: str, tokens: dict or None, user: User or None)
        """
        if not email or not password:
            return False, "Email and password are required", None, None

        # Find user by email
        user = db.query(User).filter(User.email == email).first()

        if not user:
            return False, "Invalid credentials", None, None

        # Check if user is banned
        if user.is_banned:
            return False, "Your account has been banned", None, None

        # Check if user is active
        if not user.is_active:
            return False, "Your account is inactive", None, None

        # Verify password
        if not user.check_password(password):
            return False, "Invalid credentials", None, None

        # Generate JWT tokens (FIXED: convert user.id to string)
        try:
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            tokens = {
                'access_token': access_token,
                'refresh_token': refresh_token
            }
            
            return True, "Login successful", tokens, user
        except Exception as e:
            return False, f"Token generation failed: {str(e)}", None, None

    @staticmethod
    def get_user_by_id(db: Session, user_id):
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def refresh_access_token(user_id):
        """Generate new access token"""
        try:
            new_access_token = create_access_token(identity=str(user_id))
            return True, "Token refreshed successfully", new_access_token
        except Exception as e:
            return False, f"Token refresh failed: {str(e)}", None
