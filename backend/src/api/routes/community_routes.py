from flask import Blueprint
from src.api.controllers.community_controller import CommunityController

community_bp = Blueprint('community', __name__)

# Community routes
community_bp.route('/communities', methods=['POST'])(CommunityController.create_community)
community_bp.route('/communities', methods=['GET'])(CommunityController.list_communities)
community_bp.route('/communities/my', methods=['GET'])(CommunityController.get_user_communities)
community_bp.route('/communities/<int:community_id>/members', methods=['GET'])(CommunityController.get_community_members)
community_bp.route('/communities/<int:community_id>/members/<int:member_user_id>/role', methods=['PUT'])(CommunityController.update_member_role)
community_bp.route('/communities/<int:community_id>/members/<int:member_user_id>', methods=['DELETE'])(CommunityController.remove_member)
community_bp.route('/communities/<int:community_id>/members/<int:member_user_id>/mute', methods=['POST'])(CommunityController.mute_member)
community_bp.route('/communities/<int:community_id>/members/<int:member_user_id>/warn', methods=['POST'])(CommunityController.warn_member)
community_bp.route('/communities/<int:community_id>/members/<int:member_user_id>/ban', methods=['POST'])(CommunityController.ban_member)
community_bp.route('/communities/<int:community_id>/transfer-ownership', methods=['POST'])(CommunityController.transfer_ownership)
community_bp.route('/communities/<int:community_id>/add-member', methods=['POST'])(CommunityController.add_member)
community_bp.route('/communities/<int:community_id>/join', methods=['POST'])(CommunityController.join_community)
community_bp.route('/communities/<int:community_id>/leave', methods=['POST'])(CommunityController.leave_community)
community_bp.route('/communities/<int:community_id>/tactical-summary', methods=['GET'])(CommunityController.get_tactical_summary)
community_bp.route('/communities/<int:community_id>/tactic-board', methods=['GET'])(CommunityController.get_tactic_board)
community_bp.route('/communities/<int:community_id>/tactic-board', methods=['POST'])(CommunityController.save_tactic_board)

