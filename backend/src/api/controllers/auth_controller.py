from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm import joinedload
from src.services.auth_service import AuthService
from src.db.connection import db_session
from src.db.models.user import User
from src.db.models.community_member import CommunityMember
from src.api.controllers.utils import get_json_payload

class AuthController:
    @staticmethod
    def register():
        """Handle user registration"""
        try:
            data = get_json_payload()
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            favorite_club = data.get('favorite_club')

            if not username or not email or not password:
                return jsonify({
                    'success': False,
                    'message': 'Username, email, and password are required'
                }), 400

            with db_session() as db:
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
            data = get_json_payload()
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return jsonify({
                    'success': False,
                    'message': 'Email and password are required'
                }), 400

            with db_session() as db:
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
            user_id = get_jwt_identity()  # String from token
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
        """Get current authenticated user's profile and communities"""
        try:
            user_id = int(get_jwt_identity())
            with db_session() as db:
                # Eager-load memberships and their communities to avoid N+1
                user = db.query(User).options(
                    joinedload(User.memberships).joinedload(CommunityMember.community)
                ).filter(User.id == user_id).first()

                if user:
                    user_dict = user.to_dict()

                    # Fetch joined communities
                    communities = []
                    for membership in user.memberships:
                        if membership.community:
                            communities.append({
                                'id': membership.community.id,
                                'name': membership.community.name,
                                'role': membership.role,
                                'joined_at': membership.joined_at.isoformat() if membership.joined_at else None
                            })
                    user_dict['communities'] = communities

                    return jsonify({
                        'success': True,
                        'user': user_dict
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
    def update_profile():
        """Update user profile"""
        try:
            user_id = int(get_jwt_identity())
            data = get_json_payload()
            with db_session() as db:
                user = AuthService.get_user_by_id(db, user_id)
                if not user:
                    return jsonify({'success': False, 'message': 'User not found'}), 404

                # Update fields
                if 'avatar_url' in data: user.avatar_url = data['avatar_url']
                if 'bio' in data: user.bio = data['bio']
                if 'favorite_club' in data: user.favorite_club = data['favorite_club']

                # Optional password update
                if data.get('new_password'):
                    if not data.get('current_password') or not user.check_password(data['current_password']):
                        return jsonify({'success': False, 'message': 'Incorrect current password'}), 400
                    user.set_password(data['new_password'])

                db.commit()

                return jsonify({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'user': user.to_dict()
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Update error: {str(e)}'
            }), 500

    @staticmethod
    @jwt_required()
    def logout():
        """Handle user logout (client-side token removal)"""
        return jsonify({
            'success': True,
            'message': 'Logout successful. Please remove tokens from client.'
        }), 200
