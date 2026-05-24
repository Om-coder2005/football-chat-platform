from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from src.db.connection import db_session
from src.db.models.new_models import TransferRumor, RumorRating
from src.api.controllers.utils import get_json_payload

class TransferController:
    @staticmethod
    def get_rumors():
        """Fetches all rumored transfers along with consensus ratio calculations"""
        try:
            with db_session() as db:
                rumors = db.query(TransferRumor).order_by(TransferRumor.created_at.desc()).all()
                result = []
                for r in rumors:
                    # Count the ratings
                    reliable_count = 0
                    fake_news_count = 0
                    overpriced_count = 0
                    masterclass_count = 0
                    for vote in r.ratings:
                        if vote.rating == 'reliable':
                            reliable_count += 1
                        elif vote.rating == 'fake_news':
                            fake_news_count += 1
                        elif vote.rating == 'overpriced':
                            overpriced_count += 1
                        elif vote.rating == 'masterclass':
                            masterclass_count += 1
                    
                    total_votes = reliable_count + fake_news_count + overpriced_count + masterclass_count
                    
                    # Check if current user has voted on this card
                    user_rating = None
                    try:
                        # Verify JWT in request optionally
                        verify_jwt_in_request(optional=True)
                        curr_user_id = get_jwt_identity()
                        if curr_user_id:
                            curr_user_id = int(curr_user_id)
                            my_vote = next((v for v in r.ratings if v.user_id == curr_user_id), None)
                            if my_vote:
                                user_rating = my_vote.rating
                    except Exception:
                        pass

                    rumor_dict = r.to_dict()
                    rumor_dict.update({
                        'reliable_count': reliable_count,
                        'fake_news_count': fake_news_count,
                        'overpriced_count': overpriced_count,
                        'masterclass_count': masterclass_count,
                        'total_votes': total_votes,
                        'user_rating': user_rating
                    })
                    result.append(rumor_dict)

                return jsonify({
                    'success': True,
                    'count': len(result),
                    'rumors': result
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

    @staticmethod
    @jwt_required()
    def create_rumor():
        """Submits a new transfer rumor"""
        try:
            data = get_json_payload()
            player_name = data.get('player_name')
            from_club = data.get('from_club')
            to_club = data.get('to_club')
            estimated_fee = data.get('estimated_fee', '')
            source = data.get('source', '')
            details = data.get('details', '')

            if not player_name or not from_club or not to_club:
                return jsonify({
                    'success': False,
                    'message': 'Player name, current club, and destination club are required'
                }), 400

            user_id = int(get_jwt_identity())
            with db_session() as db:
                rumor = TransferRumor(
                    player_name=player_name,
                    from_club=from_club,
                    to_club=to_club,
                    estimated_fee=estimated_fee,
                    source=source,
                    details=details,
                    created_by=user_id
                )
                db.add(rumor)
                db.commit()
                db.refresh(rumor)

                # Fetch rumor as dictionary
                rumor_dict = rumor.to_dict()
                rumor_dict.update({
                    'reliable_count': 0,
                    'fake_news_count': 0,
                    'overpriced_count': 0,
                    'masterclass_count': 0,
                    'total_votes': 0,
                    'user_rating': None
                })

                return jsonify({
                    'success': True,
                    'message': 'Transfer rumor created successfully!',
                    'rumor': rumor_dict
                }), 201
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

    @staticmethod
    @jwt_required()
    def rate_rumor(rumor_id):
        """Casts consensus rating (1 vote per user per card)"""
        try:
            data = get_json_payload()
            rating = data.get('rating')

            if not rating or rating not in ['reliable', 'fake_news', 'masterclass', 'overpriced']:
                return jsonify({
                    'success': False,
                    'message': 'Valid rating is required (reliable, fake_news, masterclass, overpriced)'
                }), 400

            user_id = int(get_jwt_identity())
            with db_session() as db:
                rumor = db.query(TransferRumor).filter(TransferRumor.id == rumor_id).first()
                if not rumor:
                    return jsonify({
                        'success': False,
                        'message': 'Transfer rumor not found'
                    }), 404

                # Check if user has already voted on this rumor
                existing_vote = db.query(RumorRating).filter_by(rumor_id=rumor_id, user_id=user_id).first()
                if existing_vote:
                    existing_vote.rating = rating
                    db.commit()
                    msg = "Vote updated successfully!"
                else:
                    new_vote = RumorRating(
                        rumor_id=rumor_id,
                        user_id=user_id,
                        rating=rating
                    )
                    db.add(new_vote)
                    db.commit()
                    msg = "Vote registered successfully!"

                # Re-calculate counts
                ratings = db.query(RumorRating).filter_by(rumor_id=rumor_id).all()
                reliable_count = sum(1 for v in ratings if v.rating == 'reliable')
                fake_news_count = sum(1 for v in ratings if v.rating == 'fake_news')
                overpriced_count = sum(1 for v in ratings if v.rating == 'overpriced')
                masterclass_count = sum(1 for v in ratings if v.rating == 'masterclass')
                total_votes = len(ratings)

                return jsonify({
                    'success': True,
                    'message': msg,
                    'rating': rating,
                    'counts': {
                        'reliable': reliable_count,
                        'fake_news': fake_news_count,
                        'overpriced': overpriced_count,
                        'masterclass': masterclass_count,
                        'total_votes': total_votes
                    }
                }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500
