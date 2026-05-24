from flask import Blueprint, jsonify
from src.api.controllers.news_controller import NewsController

news_bp = Blueprint('news', __name__)

news_bp.route('/news/global', methods=['GET'])(NewsController.get_global_news)
news_bp.route('/news/<string:club_name>', methods=['GET'])(NewsController.get_club_news)
