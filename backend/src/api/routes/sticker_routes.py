import time
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.db.connection import db_session
from src.db.models.new_models import Sticker, UserSticker

sticker_bp = Blueprint('stickers', __name__)

@sticker_bp.route('', methods=['GET'])
def get_all_stickers():
    """Get all stickers in the database, grouped by category."""
    try:
        with db_session() as db:
            stickers = db.query(Sticker).all()
            
            grouped = {}
            for s in stickers:
                cat = s.category or 'Classic'
                if cat not in grouped:
                    grouped[cat] = []
                grouped[cat].append(s.to_dict())
                
            return jsonify({
                'success': True,
                'stickers': [s.to_dict() for s in stickers],
                'grouped': grouped
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load stickers: {str(e)}'
        }), 500

@sticker_bp.route('/my', methods=['GET'])
@jwt_required()
def get_owned_stickers():
    """Get list of sticker IDs purchased by the logged-in user."""
    try:
        user_id = int(get_jwt_identity())
        with db_session() as db:
            user_stickers = db.query(UserSticker).filter(UserSticker.user_id == user_id).all()
            owned_ids = [us.sticker_id for us in user_stickers]
            return jsonify({
                'success': True,
                'sticker_ids': owned_ids
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch owned stickers: {str(e)}'
        }), 500

@sticker_bp.route('/<int:sticker_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_sticker(sticker_id):
    """Emulate premium sticker purchase with payment processing delay."""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        
        card_number = data.get('card_number')
        expiry = data.get('expiry')
        cvv = data.get('cvv')
        
        if not card_number or not expiry or not cvv:
            return jsonify({
                'success': False,
                'message': 'Invalid payment details. Card number, expiry, and CVV are required.'
            }), 400
            
        # Simulate payment processing delay (1.2 seconds)
        time.sleep(1.2)
        
        with db_session() as db:
            sticker = db.query(Sticker).filter(Sticker.id == sticker_id).first()
            if not sticker:
                return jsonify({
                    'success': False,
                    'message': 'Sticker not found'
                }), 404
                
            # Check if already owned
            existing = db.query(UserSticker).filter(
                UserSticker.user_id == user_id,
                UserSticker.sticker_id == sticker_id
            ).first()
            
            if existing:
                return jsonify({
                    'success': True,
                    'message': 'You already own this sticker!'
                }), 200
                
            # Record purchase
            user_sticker = UserSticker(user_id=user_id, sticker_id=sticker_id)
            db.add(user_sticker)
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Sticker "{sticker.name}" unlocked successfully!',
                'sticker_id': sticker_id
            }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Purchase failed: {str(e)}'
        }), 500
