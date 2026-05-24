import json
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.db.connection import db_session
from src.db.models.new_models import RivalryRoom, RivalryMessage, PredictionPoll, UserPrediction
from src.db.models.user import User

rivalry_bp = Blueprint('rivalry', __name__)

RIVALRY_DERBIES = [
    {
        "slug": "el-clasico",
        "title": "El Clasico",
        "clubs": ("Real Madrid", "Barcelona"),
        "aliases": (("real madrid", "cf real madrid"), ("barcelona", "fc barcelona", "barca")),
        "reason": "Spain's biggest pressure-cooker fixture.",
    },
    {
        "slug": "north-london-derby",
        "title": "North London Derby",
        "clubs": ("Arsenal", "Tottenham"),
        "aliases": (("arsenal", "arsenal fc"), ("tottenham", "tottenham hotspur", "spurs")),
        "reason": "A loud London split with bragging rights on every touch.",
    },
    {
        "slug": "manchester-derby",
        "title": "Manchester Derby",
        "clubs": ("Manchester United", "Manchester City"),
        "aliases": (("manchester united", "man united", "man utd"), ("manchester city", "man city")),
        "reason": "Red vs blue, history vs modern dominance.",
    },
    {
        "slug": "merseyside-derby",
        "title": "Merseyside Derby",
        "clubs": ("Liverpool", "Everton"),
        "aliases": (("liverpool", "liverpool fc"), ("everton", "everton fc")),
        "reason": "Local tension, split families, full-volume matchday.",
    },
    {
        "slug": "derby-della-madonnina",
        "title": "Derby della Madonnina",
        "clubs": ("Inter Milan", "AC Milan"),
        "aliases": (("inter", "inter milan", "internazionale"), ("ac milan", "milan")),
        "reason": "San Siro shared, Milan divided.",
    },
    {
        "slug": "der-klassiker",
        "title": "Der Klassiker",
        "clubs": ("Bayern Munich", "Borussia Dortmund"),
        "aliases": (("bayern", "bayern munich", "fc bayern"), ("borussia dortmund", "dortmund", "bvb")),
        "reason": "Germany's heavyweight duel with title-race energy.",
    },
]


def _club_key(value):
    return "".join(ch for ch in str(value or "").lower() if ch.isalnum())


def _alias_matches(team_name, aliases):
    team_key = _club_key(team_name)
    return any(_club_key(alias) == team_key or _club_key(alias) in team_key for alias in aliases)


def _match_derby(home_name, away_name):
    for derby in RIVALRY_DERBIES:
        first_aliases, second_aliases = derby["aliases"]
        first_home = _alias_matches(home_name, first_aliases) and _alias_matches(away_name, second_aliases)
        second_home = _alias_matches(home_name, second_aliases) and _alias_matches(away_name, first_aliases)
        if first_home or second_home:
            return derby
    return None


def _same_fixture(room, home, away):
    room_home = _club_key(room.home_club_name)
    room_away = _club_key(room.away_club_name)
    home_key = _club_key(home)
    away_key = _club_key(away)
    return (
        room_home == home_key and room_away == away_key
    ) or (
        room_home == away_key and room_away == home_key
    )


def _parse_api_kickoff(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _same_rivalry_room_for_match(room, match_id, home, away, kickoff):
    if match_id and room.match_id == match_id:
        return True
    if not _same_fixture(room, home, away):
        return False
    kickoff_dt = _parse_api_kickoff(kickoff)
    if not kickoff_dt or not room.scheduled_kickoff:
        return False
    return abs((room.scheduled_kickoff - kickoff_dt).total_seconds()) <= 6 * 60 * 60


def _club_meta(name, cache):
    key = _club_key(name)
    if key not in cache:
        try:
            from src.services.match_service import MatchService
            profile = MatchService.get_team_profile_by_name(name) or {}
        except Exception:
            profile = {}
        cache[key] = {
            "name": profile.get("name") or name,
            "shortName": profile.get("shortName") or profile.get("name") or name,
            "crest": profile.get("crest"),
            "id": profile.get("id"),
        }
    return cache[key]

@rivalry_bp.route('', methods=['POST'])
@jwt_required()
def schedule_rivalry():
    """Allows hosts/admins to schedule a Rivalry Arena session"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        
        home_club = data.get('home_club_name')
        away_club = data.get('away_club_name')
        kickoff_str = data.get('scheduled_kickoff')
        match_id = data.get('match_id')
        status = data.get('status', 'scheduled')
        
        if not home_club or not away_club or not kickoff_str:
            return jsonify({
                'success': False,
                'message': 'home_club_name, away_club_name, and scheduled_kickoff are required.'
            }), 400
            
        # Parse kickoff ISO string
        if kickoff_str.endswith('Z'):
            kickoff_str = kickoff_str[:-1]
        try:
            scheduled_kickoff = datetime.fromisoformat(kickoff_str)
        except Exception:
            try:
                scheduled_kickoff = datetime.strptime(kickoff_str, '%Y-%m-%d %H:%M:%S')
            except Exception as parse_err:
                return jsonify({
                    'success': False,
                    'message': f'Invalid scheduled_kickoff format. Use ISO format (e.g. YYYY-MM-DDTHH:MM:S): {str(parse_err)}'
                }), 400
                
        with db_session() as db:
            # Let's ensure match_id is integer if provided
            if match_id is not None:
                try:
                    match_id = int(match_id)
                except ValueError:
                    match_id = None
                    
            room = RivalryRoom(
                home_club_name=home_club,
                away_club_name=away_club,
                scheduled_kickoff=scheduled_kickoff,
                status=status,
                match_id=match_id
            )
            db.add(room)
            db.commit()
            db.refresh(room)
            
            return jsonify({
                'success': True,
                'message': 'Rivalry match scheduled successfully!',
                'rivalry_room': room.to_dict()
            }), 201
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to schedule rivalry: {str(e)}'
        }), 500

@rivalry_bp.route('', methods=['GET'])
def get_rivalries():
    """Returns a list of scheduled, live, and finished rivalry matches"""
    try:
        with db_session() as db:
            rooms = db.query(RivalryRoom).order_by(RivalryRoom.scheduled_kickoff.asc()).all()
            
            # Group or order them by status nicely if needed, or return all
            # We return them serialized
            return jsonify({
                'success': True,
                'rivalries': [r.to_dict() for r in rooms]
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to retrieve rivalries: {str(e)}'
        }), 500


@rivalry_bp.route('/suggestions', methods=['GET'])
def get_rivalry_suggestions():
    """Returns upcoming derby fixtures, annotated with any existing room."""
    try:
        with db_session() as db:
            rooms = db.query(RivalryRoom).order_by(RivalryRoom.scheduled_kickoff.desc()).all()
            club_cache = {}
            suggestions = []
            seen_matches = set()

            try:
                from src.services.match_service import MatchService
                start_date = datetime.utcnow().date()
                upcoming_matches = []
                for day_start in range(0, 61, 10):
                    date_from = start_date + timedelta(days=day_start)
                    date_to = min(start_date + timedelta(days=day_start + 9), start_date + timedelta(days=60))
                    data = MatchService.get_matches_by_date_range(
                        date_from.isoformat(),
                        date_to.isoformat(),
                    )
                    upcoming_matches.extend(data.get("matches", []))
            except Exception:
                upcoming_matches = []

            for match in upcoming_matches:
                home_team = match.get("homeTeam") or {}
                away_team = match.get("awayTeam") or {}
                home_name = home_team.get("name") or home_team.get("shortName")
                away_name = away_team.get("name") or away_team.get("shortName")
                kickoff = match.get("utcDate")
                if not home_name or not away_name or not kickoff or match.get("status") == "FINISHED":
                    continue

                derby = _match_derby(home_name, away_name)
                if not derby:
                    continue

                match_key = match.get("id") or f"{home_name}-{away_name}-{kickoff}"
                if match_key in seen_matches:
                    continue
                seen_matches.add(match_key)

                existing_room = next(
                    (
                        room for room in rooms
                        if _same_rivalry_room_for_match(
                            room,
                            match.get("id"),
                            home_name,
                            away_name,
                            kickoff,
                        )
                    ),
                    None,
                )

                competition = match.get("competition") or {}
                payload = {
                    "slug": f'{derby["slug"]}-{match_key}',
                    "title": derby["title"],
                    "home_club_name": home_name,
                    "away_club_name": away_name,
                    "reason": derby["reason"],
                    "match_id": match.get("id"),
                    "match_status": match.get("status"),
                    "competition": {
                        "id": competition.get("id"),
                        "name": competition.get("name"),
                        "emblem": competition.get("emblem"),
                    },
                    "home_club_meta": _club_meta(home_name, club_cache),
                    "away_club_meta": _club_meta(away_name, club_cache),
                    "existing_room_id": existing_room.id if existing_room else None,
                    "existing_status": existing_room.status if existing_room else None,
                    "scheduled_kickoff": existing_room.scheduled_kickoff.isoformat() if existing_room and existing_room.scheduled_kickoff else kickoff,
                }
                suggestions.append(payload)

            suggestions.sort(key=lambda item: item.get("scheduled_kickoff") or "")

            return jsonify({
                'success': True,
                'suggestions': suggestions,
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to retrieve rivalry suggestions: {str(e)}'
        }), 500

@rivalry_bp.route('/<int:session_id>', methods=['GET'])
def get_rivalry_details(session_id):
    """Returns details of a specific rivalry room, including cumulative respect scores"""
    try:
        with db_session() as db:
            room = db.query(RivalryRoom).filter(RivalryRoom.id == session_id).first()
            if not room:
                return jsonify({
                    'success': False,
                    'message': 'Rivalry room not found'
                }), 404
                
            return jsonify({
                'success': True,
                'rivalry_room': room.to_dict()
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to retrieve rivalry room details: {str(e)}'
        }), 500

@rivalry_bp.route('/<int:session_id>/messages', methods=['GET'])
def get_rivalry_messages(session_id):
    """Paginated fetch of rivalry messages for the room"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        with db_session() as db:
            # Check room exists first
            room = db.query(RivalryRoom).filter(RivalryRoom.id == session_id).first()
            if not room:
                return jsonify({
                    'success': False,
                    'message': 'Rivalry room not found'
                }), 404
                
            messages = db.query(RivalryMessage).filter(
                RivalryMessage.rivalry_room_id == session_id
            ).order_by(RivalryMessage.created_at.desc()).limit(limit).offset(offset).all()
            
            # Return chronological order (oldest to newest)
            messages_list = [m.to_dict() for m in messages]
            messages_list.reverse()
            
            return jsonify({
                'success': True,
                'messages': messages_list
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch messages: {str(e)}'
        }), 500

@rivalry_bp.route('/<int:session_id>/polls', methods=['POST'])
@jwt_required()
def create_prediction_poll(session_id):
    """Lets hosts trigger a prediction poll in a rivalry room"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        
        question = data.get('question')
        options = data.get('options') # expects a list e.g. ["Home Win", "Away Win", "Draw"]
        duration_minutes = data.get('duration_minutes', 5)
        
        if not question or not options or not isinstance(options, list) or len(options) < 2:
            return jsonify({
                'success': False,
                'message': 'question and a list of at least 2 options are required.'
            }), 400
            
        expires_at = datetime.utcnow() + timedelta(minutes=int(duration_minutes))
        
        with db_session() as db:
            room = db.query(RivalryRoom).filter(RivalryRoom.id == session_id).first()
            if not room:
                return jsonify({
                    'success': False,
                    'message': 'Rivalry room not found'
                }), 404
                
            poll = PredictionPoll(
                rivalry_room_id=session_id,
                question=question,
                options_json=json.dumps(options),
                expires_at=expires_at,
                is_active=True
            )
            db.add(poll)
            db.commit()
            db.refresh(poll)
            
            # Broadcast the poll through socketio in background
            try:
                from app import socketio
                socketio.emit('new_prediction_poll', poll.to_dict(), to=f"rivalry/{session_id}")
            except Exception as err:
                print(f"Socket IO broadcast failed for new poll: {err}")
                
            return jsonify({
                'success': True,
                'message': 'Prediction poll created successfully!',
                'poll': poll.to_dict()
            }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create prediction poll: {str(e)}'
        }), 500

@rivalry_bp.route('/<int:session_id>/polls', methods=['GET'])
def get_prediction_polls(session_id):
    """Lists active and expired prediction polls for a rivalry room"""
    try:
        with db_session() as db:
            room = db.query(RivalryRoom).filter(RivalryRoom.id == session_id).first()
            if not room:
                return jsonify({
                    'success': False,
                    'message': 'Rivalry room not found'
                }), 404
                
            polls = db.query(PredictionPoll).filter(
                PredictionPoll.rivalry_room_id == session_id
            ).order_by(PredictionPoll.id.desc()).all()
            
            # Sync expiration status in DB before returning
            now = datetime.utcnow()
            updated = False
            for p in polls:
                if p.is_active and p.expires_at < now:
                    p.is_active = False
                    updated = True
            if updated:
                db.commit()
                
            return jsonify({
                'success': True,
                'polls': [p.to_dict() for p in polls]
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to retrieve polls: {str(e)}'
        }), 500

@rivalry_bp.route('/polls/<int:poll_id>/vote', methods=['POST'])
@jwt_required()
def vote_prediction_poll(poll_id):
    """Registers a user's prediction vote, ensuring single-vote constraints are respected"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        selected_option = data.get('selected_option')
        
        if not selected_option:
            return jsonify({
                'success': False,
                'message': 'selected_option is required.'
            }), 400
            
        with db_session() as db:
            poll = db.query(PredictionPoll).filter(PredictionPoll.id == poll_id).first()
            if not poll:
                return jsonify({
                    'success': False,
                    'message': 'Prediction poll not found'
                }), 404
                
            # Check if active
            now = datetime.utcnow()
            if not poll.is_active or poll.expires_at < now:
                if poll.is_active:
                    poll.is_active = False
                    db.commit()
                return jsonify({
                    'success': False,
                    'message': 'Prediction poll has expired/is inactive.'
                }), 400
                
            # Verify options
            try:
                options = json.loads(poll.options_json)
            except Exception:
                options = []
            if selected_option not in options:
                return jsonify({
                    'success': False,
                    'message': f'Invalid option selection. Available: {options}'
                }), 400
                
            # Check single vote constraint
            existing = db.query(UserPrediction).filter(
                UserPrediction.poll_id == poll_id,
                UserPrediction.user_id == user_id
            ).first()
            
            if existing:
                return jsonify({
                    'success': False,
                    'message': 'You have already voted on this prediction poll.'
                }), 400
                
            prediction = UserPrediction(
                poll_id=poll_id,
                user_id=user_id,
                selected_option=selected_option
            )
            db.add(prediction)
            db.commit()
            
            # Calculate vote results breakdown so far to emit
            votes_count = {}
            for opt in options:
                votes_count[opt] = 0
            all_votes = db.query(UserPrediction).filter(UserPrediction.poll_id == poll_id).all()
            for v in all_votes:
                if v.selected_option in votes_count:
                    votes_count[v.selected_option] += 1
            
            # Broadcast the updated poll results through socketio
            try:
                from app import socketio
                socketio.emit('prediction_vote_updated', {
                    'poll_id': poll_id,
                    'votes_count': votes_count,
                    'total_votes': len(all_votes)
                }, to=f"rivalry/{poll.rivalry_room_id}")
            except Exception as err:
                print(f"Socket IO broadcast failed for vote: {err}")
                
            return jsonify({
                'success': True,
                'message': 'Prediction vote submitted successfully!',
                'prediction': prediction.to_dict(),
                'votes_count': votes_count
            }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to submit prediction: {str(e)}'
        }), 500
