from flask import request, jsonify
from src.services.match_service import MatchService

class MatchController:
    @staticmethod
    def get_live_matches():
        """
        Get all live matches happening today
        Returns HTTP response with matches data
        """
        try:
            data = MatchService.get_live_matches()
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'matches': data.get('matches', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
    
    @staticmethod
    def get_todays_matches_grouped():
        """
        Get all of today's matches grouped by competition/league.
        Returns grouped match data for the Live Scores page.
        """
        try:
            data = MatchService.get_todays_matches_grouped()
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'grouped_matches': data.get('grouped_matches', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

    @staticmethod
    def get_available_competitions():
        """
        Get all available competitions/leagues with metadata.
        Returns filtered competition list for the league cards.
        """
        try:
            data = MatchService.get_available_competitions()
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'competitions': data.get('competitions', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

    @staticmethod
    def get_matches_by_date():
        """
        Get matches within a date range
        Query params: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD)
        """
        try:
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            
            if not date_from or not date_to:
                return jsonify({
                    'success': False,
                    'message': 'dateFrom and dateTo query parameters are required (YYYY-MM-DD)'
                }), 400
            
            data = MatchService.get_matches_by_date_range(date_from, date_to)
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'matches': data.get('matches', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 400
    
    @staticmethod
    def get_match_details(match_id):
        """
        Get detailed information about a specific match
        """
        try:
            data = MatchService.get_match_by_id(match_id)
            return jsonify({
                'success': True,
                'match': data
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
    
    @staticmethod
    def get_competitions():
        """
        Get all available competitions/leagues
        """
        try:
            data = MatchService.get_competitions()
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'competitions': data.get('competitions', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
    
    @staticmethod
    def get_competition_matches(competition_id):
        """
        Get matches for a specific competition
        Query params: status (optional), dateFrom (optional), dateTo (optional)
        """
        try:
            status = request.args.get('status')
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            
            data = MatchService.get_competition_matches(
                competition_id, 
                status=status,
                date_from=date_from,
                date_to=date_to
            )
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'matches': data.get('matches', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
    
    @staticmethod
    def get_competition_standings(competition_id):
        """
        Get league table/standings for a competition
        """
        try:
            data = MatchService.get_competition_standings(competition_id)
            return jsonify({
                'success': True,
                'standings': data.get('standings', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
    
    @staticmethod
    def get_team_matches(team_id):
        """
        Get matches for a specific team by ID
        Query params: status (optional), limit (optional, default 10)
        """
        try:
            status = request.args.get('status')
            limit = request.args.get('limit', 10, type=int)
            
            data = MatchService.get_team_matches(team_id, status=status, limit=limit)
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'matches': data.get('matches', [])
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

    @staticmethod
    def get_team_matches_by_name():
        """
        Get today's matches for a team identified by club name.
        Falls back to the closest recent/upcoming match if none today.
        Query params: teamName (required) - the club name from the community
        @returns HTTP response with matches data and source indicator
        """
        try:
            team_name = request.args.get('teamName')
            if not team_name:
                return jsonify({
                    'success': False,
                    'message': 'teamName query parameter is required'
                }), 400

            data = MatchService.get_matches_for_team(team_name)
            return jsonify({
                'success': True,
                'count': data.get('count', 0),
                'matches': data.get('matches', []),
                'source': data.get('source', 'none'),
                'message': data.get('message', '')
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
