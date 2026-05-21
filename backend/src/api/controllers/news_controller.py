from flask import jsonify, request
from src.services.news_service import NewsService
from src.db.connection import db_session

class NewsController:
    @staticmethod
    def get_club_news(club_name):
        """Get latest news for a specific club"""
        try:
            limit = request.args.get('limit', 10, type=int)
            with db_session() as db:
                articles = NewsService.get_news_for_club(db, club_name, limit)

                return jsonify({
                    'success': True,
                    'count': len(articles),
                    'articles': articles
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
