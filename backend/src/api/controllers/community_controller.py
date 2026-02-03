from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.community_service import CommunityService
from src.db.connection import get_db

class CommunityController:
    @staticmethod
    @jwt_required()
    def create_community():
        """Create a new community"""
        try:
            data = request.get_json()
            name = data.get('name')
            description = data.get('description', '')
            club_name = data.get('club_name', '')
            
            if not name:
                return jsonify({
                    'success': False,
                    'message': 'Community name is required'
                }), 400
            
            user_id = get_jwt_identity()  # String from token
            db = next(get_db())
            
            success, msg, community = CommunityService.create_community(
                db, name, description, club_name, int(user_id)  # Convert to int
            )
            
            if success:
                return jsonify({
                    'success': True,
                    'message': msg,
                    'community': community.to_dict()
                }), 201
            else:
                return jsonify({
                    'success': False,
                    'message': msg
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
    
    @staticmethod
    def list_communities():
        """Get all public communities"""
        try:
            db = next(get_db())
            communities = CommunityService.get_all_communities(db)
            return jsonify({
                'success': True,
                'communities': [c.to_dict() for c in communities]
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
    
    @staticmethod
    @jwt_required()
    def get_user_communities():
        """Get communities user is a member of"""
        try:
            user_id = get_jwt_identity()  # String
            db = next(get_db())
            communities = CommunityService.get_user_communities(db, int(user_id))  # Convert to int
            return jsonify({
                'success': True,
                'communities': [c.to_dict() for c in communities]
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
    
    @staticmethod
    @jwt_required()
    def join_community(community_id):
        """Join a community"""
        try:
            user_id = get_jwt_identity()  # String
            db = next(get_db())
            
            success, msg = CommunityService.join_community(db, community_id, int(user_id))  # Convert to int
            
            if success:
                return jsonify({
                    'success': True,
                    'message': msg
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': msg
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
    
    @staticmethod
    @jwt_required()
    def leave_community(community_id):
        """Leave a community"""
        try:
            user_id = get_jwt_identity()  # String
            db = next(get_db())
            
            success, msg = CommunityService.leave_community(db, community_id, int(user_id))  # Convert to int
            
            if success:
                return jsonify({
                    'success': True,
                    'message': msg
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': msg
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
