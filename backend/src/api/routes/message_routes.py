from flask import Blueprint
from src.api.controllers.message_controller import MessageController

message_bp = Blueprint('message', __name__)

# Message routes
message_bp.route('/communities/<int:community_id>/messages', methods=['POST'])(MessageController.send_message)
message_bp.route('/communities/<int:community_id>/messages', methods=['GET'])(MessageController.get_messages)
message_bp.route('/messages/<int:message_id>', methods=['DELETE'])(MessageController.delete_message)
message_bp.route('/messages/<int:message_id>/highlight', methods=['PUT'])(MessageController.toggle_highlight)
message_bp.route('/communities/<int:community_id>/notifications', methods=['POST'])(MessageController.send_notification)
