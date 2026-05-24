from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.community_service import CommunityService
from src.db.connection import db_session
from src.api.controllers.utils import get_json_payload

class CommunityController:
    @staticmethod
    @jwt_required()
    def create_community():
        """Create a new community"""
        try:
            data = get_json_payload()
            name = data.get('name')
            description = data.get('description', '')
            club_name = data.get('club_name', '')

            if not name:
                return jsonify({
                    'success': False,
                    'message': 'Community name is required'
                }), 400

            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg, community = CommunityService.create_community(
                    db, name, description, club_name, user_id
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
            with db_session() as db:
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
            user_id = int(get_jwt_identity())
            with db_session() as db:
                communities = CommunityService.get_user_communities(db, user_id)
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
            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg = CommunityService.join_community(db, community_id, user_id)

                if success:
                    return jsonify({'success': True, 'message': msg}), 200
                else:
                    return jsonify({'success': False, 'message': msg}), 400
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
            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg = CommunityService.leave_community(db, community_id, user_id)

                if success:
                    return jsonify({'success': True, 'message': msg}), 200
                else:
                    return jsonify({'success': False, 'message': msg}), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500

    @staticmethod
    @jwt_required()
    def get_community_members(community_id):
        """Get members of a community for the members tab"""
        try:
            user_id = int(get_jwt_identity())
            with db_session() as db:
                if not CommunityService.is_member(db, user_id, community_id):
                    return jsonify({
                        'success': False,
                        'message': 'You must be a member to view the member list'
                    }), 403

                members = CommunityService.get_community_members(db, community_id)
                return jsonify({
                    'success': True,
                    'members': members
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500

    @staticmethod
    @jwt_required()
    def update_member_role(community_id, member_user_id):
        """Update a community member role (admin only)"""
        try:
            data = get_json_payload()
            role = data.get('role')
            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg, status_code = CommunityService.update_member_role(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    target_user_id=member_user_id,
                    new_role=role
                )

                return jsonify({'success': success, 'message': msg}), status_code
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500

    @staticmethod
    @jwt_required()
    def remove_member(community_id, member_user_id):
        """Remove a community member (admin only)"""
        try:
            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg, status_code = CommunityService.remove_member(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    target_user_id=member_user_id
                )

                return jsonify({'success': success, 'message': msg}), status_code
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500

    @staticmethod
    @jwt_required()
    def transfer_ownership(community_id):
        """Transfer ownership to another user (admin only)"""
        try:
            data = get_json_payload()
            target_user_id = data.get('target_user_id')
            user_id = int(get_jwt_identity())

            if not target_user_id:
                return jsonify({'success': False, 'message': 'Target user ID is required'}), 400

            with db_session() as db:
                success, msg, status_code = CommunityService.transfer_ownership(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    target_user_id=target_user_id
                )

                return jsonify({'success': success, 'message': msg}), status_code
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_member(community_id):
        """Add a member by identifier (admin only)"""
        try:
            data = get_json_payload()
            identifier = data.get('identifier')
            user_id = int(get_jwt_identity())

            if not identifier:
                return jsonify({'success': False, 'message': 'Username or Email is required'}), 400

            with db_session() as db:
                success, msg, status_code = CommunityService.add_member_by_identifier(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    identifier=identifier
                )

                return jsonify({'success': success, 'message': msg}), status_code
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_tactical_summary(community_id):
        """Generate AI tactical summary based on match and chat stats."""
        try:
            from src.services.ai_stats_service import AIStatsService
            from src.services.match_service import MatchService
            from src.services.message_service import MessageService
            from src.db.models.community import Community

            with db_session() as db:
                community = db.query(Community).filter(Community.id == community_id).first()
                if not community:
                    return jsonify({'success': False, 'message': 'Community not found'}), 404

                club_name = community.club_name or community.name

                # Get latest match data
                match_data = MatchService.get_matches_for_team(club_name)
                if match_data.get('matches') and len(match_data['matches']) > 0:
                    match_data = match_data['matches'][0]
                else:
                    match_data = None

                # Get recent chat messages (last 50)
                messages = MessageService.get_community_messages(db, community_id, 50, 0)
                chat_messages = []
                for m in messages:
                    chat_messages.append({'username': m.username, 'content': m.content})

                summary = AIStatsService.generate_tactical_summary(match_data, chat_messages)

                if not summary:
                    return jsonify({'success': False, 'message': 'Failed to generate summary'}), 500

                return jsonify({'success': True, 'summary': summary}), 200
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def mute_member(community_id, member_user_id):
        """Mute a community member (admin/moderator only)"""
        try:
            data = get_json_payload() or {}
            duration = data.get('duration', 10)
            try:
                duration = int(duration)
            except ValueError:
                duration = 10

            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg, status_code = CommunityService.mute_member(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    target_user_id=member_user_id,
                    duration_minutes=duration
                )
                return jsonify({'success': success, 'message': msg}), status_code
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def warn_member(community_id, member_user_id):
        """Warn a community member (admin/moderator only). Automute on 3 warnings."""
        try:
            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg, status_code, muted = CommunityService.warn_member(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    target_user_id=member_user_id
                )
                return jsonify({'success': success, 'message': msg, 'muted': muted}), status_code
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def ban_member(community_id, member_user_id):
        """Ban a community member (admin/moderator only)"""
        try:
            data = get_json_payload() or {}
            reason = data.get('reason', '')
            user_id = int(get_jwt_identity())
            with db_session() as db:
                success, msg, status_code = CommunityService.ban_member(
                    db=db,
                    community_id=community_id,
                    actor_user_id=user_id,
                    target_user_id=member_user_id,
                    reason=reason
                )
                return jsonify({'success': success, 'message': msg}), status_code
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_tactic_board(community_id):
        """Get or create the tactical board state for a community"""
        try:
            from src.db.models.new_models import TacticBoard
            import json
            
            user_id = int(get_jwt_identity())
            with db_session() as db:
                if not CommunityService.is_member(db, user_id, community_id):
                    return jsonify({
                        'success': False,
                        'message': 'You must be a member to access the tactic board'
                    }), 403

                tactic_board = db.query(TacticBoard).filter(TacticBoard.community_id == community_id).first()
                if not tactic_board:
                    # Create default board state
                    default_state = json.dumps({"tokens": [], "drawings": []})
                    tactic_board = TacticBoard(community_id=community_id, board_state=default_state)
                    db.add(tactic_board)
                    db.commit()
                    db.refresh(tactic_board)

                return jsonify({
                    'success': True,
                    'tactic_board': tactic_board.to_dict()
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500

    @staticmethod
    @jwt_required()
    def save_tactic_board(community_id):
        """Save the tactical board state for a community"""
        try:
            from src.db.models.new_models import TacticBoard
            import json
            
            data = get_json_payload()
            board_state = data.get('board_state')
            if board_state is None:
                return jsonify({
                    'success': False,
                    'message': 'board_state is required'
                }), 400
                
            if not isinstance(board_state, str):
                board_state_str = json.dumps(board_state)
            else:
                board_state_str = board_state

            user_id = int(get_jwt_identity())
            with db_session() as db:
                if not CommunityService.is_member(db, user_id, community_id):
                    return jsonify({
                        'success': False,
                        'message': 'You must be a member to access the tactic board'
                    }), 403

                tactic_board = db.query(TacticBoard).filter(TacticBoard.community_id == community_id).first()
                if not tactic_board:
                    tactic_board = TacticBoard(community_id=community_id, board_state=board_state_str)
                    db.add(tactic_board)
                else:
                    tactic_board.board_state = board_state_str
                
                db.commit()
                db.refresh(tactic_board)

                return jsonify({
                    'success': True,
                    'message': 'Tactic board saved successfully',
                    'tactic_board': tactic_board.to_dict()
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
