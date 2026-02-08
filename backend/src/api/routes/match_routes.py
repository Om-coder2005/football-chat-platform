from flask import Blueprint
from src.api.controllers.match_controller import MatchController

match_bp = Blueprint('match', __name__)

# Match routes
match_bp.route('/matches/live', methods=['GET'])(MatchController.get_live_matches)
match_bp.route('/matches/today', methods=['GET'])(MatchController.get_todays_matches_grouped)
match_bp.route('/matches/team', methods=['GET'])(MatchController.get_team_matches_by_name)
match_bp.route('/matches', methods=['GET'])(MatchController.get_matches_by_date)
match_bp.route('/matches/<int:match_id>', methods=['GET'])(MatchController.get_match_details)
match_bp.route('/competitions/available', methods=['GET'])(MatchController.get_available_competitions)
match_bp.route('/competitions', methods=['GET'])(MatchController.get_competitions)
match_bp.route('/competitions/<int:competition_id>/matches', methods=['GET'])(MatchController.get_competition_matches)
match_bp.route('/competitions/<int:competition_id>/standings', methods=['GET'])(MatchController.get_competition_standings)
match_bp.route('/teams/<int:team_id>/matches', methods=['GET'])(MatchController.get_team_matches)
