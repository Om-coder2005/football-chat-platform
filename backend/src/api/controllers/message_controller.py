from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.message_service import MessageService
from src.services.community_service import CommunityService
from src.db.connection import get_db

class MessageController:
    @staticmethod
    def _get_json_payload():
        data = request.get_json(silent=True)
        return data if isinstance(data, dict) else {}

    @staticmethod
    @jwt_required()
    def send_message(community_id):
        """Send a message to a community (via HTTP API)"""
        db = None
        try:
            data = MessageController._get_json_payload()
            content = data.get('content')
            
            if not content or not content.strip():
                return jsonify({
                    'success': False,
                    'message': 'Message content cannot be empty'
                }), 400
            
            user_id = int(get_jwt_identity())
            db = next(get_db())
            
            # Check if user is a member of the community
            if not CommunityService.is_member(db, user_id, community_id):
                return jsonify({
                    'success': False,
                    'message': 'You must be a member of this community to send messages'
                }), 403
            
            # Create message in database
            success, msg, message = MessageService.create_message(
                db, content.strip(), user_id, community_id
            )
            
            if success:
                return jsonify({
                    'success': True,
                    'message': message.to_dict()
                }), 201
            else:
                return jsonify({
                    'success': False,
                    'message': msg
                }), 400
                
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error sending message: {str(e)}'
            }), 500
        finally:
            if db:
                db.close()
    
    @staticmethod
    @jwt_required()
    def get_messages(community_id):
        """Get message history for a community"""
        db = None
        try:
            user_id = int(get_jwt_identity())
            db = next(get_db())
            
            # Check if user is a member of the community
            if not CommunityService.is_member(db, user_id, community_id):
                return jsonify({
                    'success': False,
                    'message': 'You must be a member to view messages'
                }), 403
            
            # Get pagination parameters
            limit = request.args.get('limit', 50, type=int)
            offset = request.args.get('offset', 0, type=int)
            
            # Limit maximum messages per request
            limit = max(1, min(limit, 100))
            offset = max(offset, 0)
            
            messages = MessageService.get_community_messages(db, community_id, limit, offset)
            message_count = MessageService.get_message_count(db, community_id)
            
            return jsonify({
                'success': True,
                'messages': [m.to_dict() for m in messages],
                'total_count': message_count,
                'limit': limit,
                'offset': offset
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error fetching messages: {str(e)}'
            }), 500
        finally:
            if db:
                db.close()
    
    @staticmethod
    @jwt_required()
    def delete_message(message_id):
        """Delete a message"""
        db = None
        try:
            user_id = int(get_jwt_identity())
            db = next(get_db())
            
            success, msg = MessageService.delete_message(db, message_id, user_id)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': msg
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': msg
                }), 403
                
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error deleting message: {str(e)}'
            }), 500
        finally:
            if db:
                db.close()

    @staticmethod
    @jwt_required()
    def toggle_highlight(message_id):
        """Toggle message highlight (admin/moderator only)"""
        db = None
        try:
            user_id = int(get_jwt_identity())
            db = next(get_db())
            
            success, msg, status_code = MessageService.toggle_highlight(db, message_id, user_id)
            
            return jsonify({
                'success': success,
                'message': msg
            }), status_code
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error highlighting message: {str(e)}'
            }), 500
        finally:
            if db:
                db.close()

    @staticmethod
    @jwt_required()
    def send_notification(community_id):
        """Send a notification to the chat (admin only)"""
        db = None
        try:
            data = MessageController._get_json_payload()
            content = data.get('content')
            user_id = int(get_jwt_identity())
            db = next(get_db())

            if not content:
                return jsonify({'success': False, 'message': 'Notification content is required'}), 400

            # Check if user is admin
            membership = CommunityService.get_membership(db, user_id, community_id)
            if not membership or membership.role != 'admin':
                return jsonify({'success': False, 'message': 'Only admins can send notifications'}), 403

            # Create a special notification message that is automatically highlighted
            from datetime import datetime
            notification_content = f"📢 NOTIFICATION: {content}"
            success, msg, message = MessageService.create_message(
                db, notification_content, user_id, community_id, is_highlighted=datetime.utcnow()
            )

            if success:
                # In a real implementation, we would emit this via Socket.IO here too
                # but for simplicity we'll let the client handle the broadcast if sent via Socket.IO
                # or just return success
                return jsonify({
                    'success': True,
                    'message': message.to_dict()
                }), 201
            else:
                return jsonify({'success': False, 'message': msg}), 400
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
        finally:
            if db:
                db.close()
