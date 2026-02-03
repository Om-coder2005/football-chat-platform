from flask import Blueprint
from src.api.controllers.community_controller import CommunityController

community_bp = Blueprint('community', __name__)

# Community routes
community_bp.route('/communities', methods=['POST'])(CommunityController.create_community)
community_bp.route('/communities', methods=['GET'])(CommunityController.list_communities)
community_bp.route('/communities/my', methods=['GET'])(CommunityController.get_user_communities)
community_bp.route('/communities/<int:community_id>/join', methods=['POST'])(CommunityController.join_community)
community_bp.route('/communities/<int:community_id>/leave', methods=['POST'])(CommunityController.leave_community)
