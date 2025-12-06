from flask import Blueprint
from src.api.controllers.auth_controller import AuthController

# Do NOT set url_prefix here; register_blueprint in app.py provides the prefix.
auth_bp = Blueprint('auth', __name__)

# Register routes
auth_bp.route('/register', methods=['POST'])(AuthController.register)
auth_bp.route('/login', methods=['POST'])(AuthController.login)
auth_bp.route('/refresh', methods=['POST'])(AuthController.refresh_token)
auth_bp.route('/me', methods=['GET'])(AuthController.get_current_user)
auth_bp.route('/logout', methods=['POST'])(AuthController.logout)

