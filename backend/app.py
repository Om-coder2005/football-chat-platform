from gevent import monkey
monkey.patch_all()

import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_jwt_extended import JWTManager, decode_token
from flask_cors import CORS
from src.api.routes.auth_routes import auth_bp
from src.api.routes.community_routes import community_bp
from src.api.routes.message_routes import message_bp
from src.api.routes.match_routes import match_bp
from src.db.connection import db_session, init_db
from src.db.models.community_member import CommunityMember
from src.db.models.user import User
from src.services.message_service import MessageService
from src.services.community_service import CommunityService
from src.api.routes.news_routes import news_bp
from src.api.routes.sticker_routes import sticker_bp
from src.services.news_service import NewsService
from src.api.routes.rivalry_routes import rivalry_bp
from src.api.routes.transfer_routes import transfer_bp
from src.db.models.new_models import RivalryRoom, RivalryMessage, PredictionPoll, UserPrediction

from apscheduler.schedulers.background import BackgroundScheduler
from google import genai
import threading
import atexit


def _get_cors_origins():
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174")
    if origins.strip() == "*":
        return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"]
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


CORS_ORIGINS = _get_cors_origins()

app = Flask(__name__)

# Configuration
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "1") == "1"

# JWT Security Settings
from datetime import timedelta
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
app.config["JWT_VERIFY_SUB"] = False

# Ensure tables exist regardless of launch directory.
init_db()

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": CORS_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

jwt = JWTManager(app)

socketio = SocketIO(
    app,
    cors_allowed_origins=CORS_ORIGINS,
    async_mode="gevent"
)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(community_bp, url_prefix="/api")
app.register_blueprint(message_bp, url_prefix="/api")
app.register_blueprint(match_bp, url_prefix="/api")
app.register_blueprint(news_bp, url_prefix="/api")
app.register_blueprint(sticker_bp, url_prefix="/api/stickers")
app.register_blueprint(rivalry_bp, url_prefix="/api/rivalries")
app.register_blueprint(transfer_bp, url_prefix="/api/transfers")

# Set up APScheduler for background tasks
def fetch_news_job():
    try:
        with db_session() as db:
            NewsService.fetch_and_store_news(db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Background news job error: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(
    func=fetch_news_job,
    trigger="interval",
    minutes=15,
    # coalesce: if multiple runs were missed, fire only once instead of catching up.
    coalesce=True,
    # misfire_grace_time: allow up to 10 minutes of lateness before treating it as
    # a missed run.  Silences the "Run time was missed" WARNING during server startup.
    misfire_grace_time=600,
    id="fetch_news_job",
    replace_existing=True,
)

# Avoid duplicate scheduler instances under Flask debug reloader.
scheduler.start()
atexit.register(lambda: scheduler.shutdown(wait=False))


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/test")
def test_socket():
    return render_template("test_socketio.html")

# ========== SECURE SOCKET.IO EVENTS ==========

@socketio.on("join_room")
def handle_join(data):
    """
    Secure room join with JWT authentication
    Client must send: { token: "jwt_token", room: "community_id" }
    """
    try:
        token = data.get("token")
        room = str(data.get("room"))
        
        if not token or not room:
            emit("error", {"message": "Token and room ID are required"})
            return
        
        # Decode and validate JWT token
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception as e:
            emit("error", {"message": f"Invalid token: {str(e)}"})
            return
        
        # Get user from database
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                emit("error", {"message": "User not found"})
                return
            
            if user.is_banned:
                emit("error", {"message": "Your account has been banned"})
                return
            
            # Verify community membership
            member = db.query(CommunityMember).filter_by(
                user_id=user_id,
                community_id=int(room)
            ).first()
            
            if not member:
                emit("error", {"message": "You must join this community before chatting"})
                return

            user_payload = {
                "id": user.id,
                "username": user.username,
            }
        
        # Successfully join the room
        join_room(room)
        
        # Notify room
        emit("user_joined", {
            "user_id": user_payload["id"],
            "username": user_payload["username"],
            "message": f"{user_payload['username']} joined the chat"
        }, to=room, broadcast=True)
        
        print(f"User {user_payload['username']} (ID: {user_payload['id']}) joined room {room}")
        
    except Exception as e:
        print(f"Join room error: {str(e)}")
        emit("error", {"message": f"Failed to join room: {str(e)}"})

@socketio.on("leave_room")
def handle_leave(data):
    """
    Leave a room
    Client must send: { token: "jwt_token", room: "community_id" }
    """
    try:
        token = data.get("token")
        room = str(data.get("room"))
        
        if not token or not room:
            return
        
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            user_payload = None
            if user:
                user_payload = {
                    "id": user.id,
                    "username": user.username,
                }
        
        if user_payload:
            leave_room(room)
            
            emit("user_left", {
                "user_id": user_payload["id"],
                "username": user_payload["username"],
                "message": f"{user_payload['username']} left the chat"
            }, to=room, broadcast=True)
            
            print(f"User {user_payload['username']} left room {room}")
        
    except Exception as e:
        print(f"Leave room error: {str(e)}")

@socketio.on("typing")
def handle_typing(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        is_typing = data.get("is_typing", True)
        
        if not token or not room: return
        
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return
            username = user.username
        
        emit("receive_typing", {
            "username": username,
            "is_typing": is_typing
        }, to=room, include_self=False)
    except Exception:
        pass

@socketio.on("send_message")
def handle_message(data):
    """
    Send a message with JWT authentication and database persistence
    Client must send: { token: "jwt_token", room: "community_id", message: "content" }
    """
    try:
        token = data.get("token")
        room = str(data.get("room"))
        content = data.get("message")
        media_url = data.get("media_url")
        message_type = data.get("message_type", "text")
        
        if not token or not room or (not content and not media_url):
            emit("error", {"message": "Token, room, and message or media are required"})
            return
            
        content = content or ""
        
        # Validate JWT
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception as e:
            emit("error", {"message": "Invalid or expired token"})
            return
        
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user or user.is_banned:
                emit("error", {"message": "Unauthorized"})
                return
            
            # Verify membership
            member = db.query(CommunityMember).filter_by(
                user_id=user_id,
                community_id=int(room)
            ).first()
            
            if not member:
                emit("error", {"message": "You are not a member of this community"})
                return
 
            from datetime import datetime
            if member.muted_until and member.muted_until > datetime.utcnow():
                time_left = member.muted_until - datetime.utcnow()
                minutes_left = int(time_left.total_seconds() / 60) + 1
                emit("error", {"message": f"You are muted in this community for another {minutes_left} minute(s)."})
                return
 
            user_payload = {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
            }
            
        def process_and_save():
            media_desc = None
            if media_url:
                if message_type == "sticker":
                    media_desc = f"Sticker: {content or 'sticker'}"
                else:
                    try:
                        # Very simple moderation/description using Gemini
                        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "").split(",")[0].strip())
                        prompt = f"Please describe this image in one short sentence for visually impaired fans: {media_url}"
                        from google.genai import types
                        response = client.models.generate_content(
                            model="gemini-2.5-flash",
                            contents=prompt,
                            config=types.GenerateContentConfig(
                                safety_settings=[
                                    types.SafetySetting(
                                        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                                        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                                    ),
                                    types.SafetySetting(
                                        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                                        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                                    )
                                ]
                            )
                        )
                        media_desc = response.text.strip()
                    except Exception as e:
                        print(f"Gemini error: {e}")
                        media_desc = "Media attached."
 
            with db_session() as db_thread:
                success, msg, message = MessageService.create_message(
                    db_thread, content.strip(), user_id, int(room), media_url=media_url, media_description=media_desc
                )
            
            if success:
                socketio.emit("receive_message", {
                    "id": message.id,
                    "user_id": user_payload["id"],
                    "username": user_payload["username"],
                    "avatar_url": user_payload["avatar_url"],
                    "content": message.content,
                    "media_url": message.media_url,
                    "media_description": message.media_description,
                    "is_highlighted": message.is_highlighted.isoformat() if message.is_highlighted else None,
                    "created_at": message.created_at.isoformat(),
                    "message_type": message_type
                }, to=room)
                print(f"Message from {user_payload['username']} in room {room}")

                # Trigger goal_alert if message matches keywords or command
                content_lower = content.lower()
                is_goal = "/goal" in content_lower or "gooooal" in content_lower or "siuuu" in content_lower or "golaso" in content_lower
                if is_goal:
                    scorer = "A Legend"
                    team_name = "The Champions"
                    if content.strip().lower().startswith("/goal"):
                        parts = content.strip().split(None, 2)
                        scorer = parts[1] if len(parts) > 1 else "A Legend"
                        team_name = parts[2] if len(parts) > 2 else "The Champions"
                    
                    socketio.emit("goal_alert", {
                        "scorer": scorer,
                        "team_name": team_name
                    }, to=room)
            else:
                socketio.emit("error", {"message": f"Failed to save message: {msg}"}, to=room)
                
        # Run in background to avoid blocking socketio thread
        threading.Thread(target=process_and_save, daemon=True).start()
            
    except Exception as e:
        print(f"Send message error: {str(e)}")
        emit("error", {"message": f"Failed to send message: {str(e)}"})

@socketio.on("mute_user")
def handle_mute_user(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        target_user_id = data.get("target_user_id")
        duration = data.get("duration", 10)
        
        if not token or not room or not target_user_id:
            emit("error", {"message": "Token, room, and target user ID are required"})
            return
            
        try:
            decoded = decode_token(token)
            actor_user_id = int(decoded['sub'])
        except Exception:
            emit("error", {"message": "Invalid token"})
            return
            
        with db_session() as db:
            success, msg, status_code = CommunityService.mute_member(
                db, int(room), actor_user_id, int(target_user_id), int(duration)
            )
            
            if success:
                target_user = db.query(User).filter(User.id == int(target_user_id)).first()
                username = target_user.username if target_user else f"User {target_user_id}"
                
                target_mem = CommunityService.get_membership(db, int(target_user_id), int(room))
                muted_until_str = target_mem.muted_until.isoformat() if (target_mem and target_mem.muted_until) else None
                
                emit("user_muted", {
                    "user_id": int(target_user_id),
                    "username": username,
                    "muted_until": muted_until_str,
                    "message": f"{username} has been muted for {duration} minutes."
                }, to=room, broadcast=True)
            else:
                emit("error", {"message": msg})
    except Exception as e:
        emit("error", {"message": str(e)})

@socketio.on("kick_user")
def handle_kick_user(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        target_user_id = data.get("target_user_id")
        
        if not token or not room or not target_user_id:
            emit("error", {"message": "Token, room, and target user ID are required"})
            return
            
        try:
            decoded = decode_token(token)
            actor_user_id = int(decoded['sub'])
        except Exception:
            emit("error", {"message": "Invalid token"})
            return
            
        with db_session() as db:
            success, msg, status_code = CommunityService.remove_member(
                db, int(room), actor_user_id, int(target_user_id)
            )
            
            if success:
                target_user = db.query(User).filter(User.id == int(target_user_id)).first()
                username = target_user.username if target_user else f"User {target_user_id}"
                
                emit("user_kicked", {
                    "user_id": int(target_user_id),
                    "username": username,
                    "message": f"{username} has been kicked from the stand."
                }, to=room, broadcast=True)
            else:
                emit("error", {"message": msg})
    except Exception as e:
        emit("error", {"message": str(e)})

@socketio.on("ban_user")
def handle_ban_user(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        target_user_id = data.get("target_user_id")
        reason = data.get("reason", "No reason provided")
        
        if not token or not room or not target_user_id:
            emit("error", {"message": "Token, room, and target user ID are required"})
            return
            
        try:
            decoded = decode_token(token)
            actor_user_id = int(decoded['sub'])
        except Exception:
            emit("error", {"message": "Invalid token"})
            return
            
        with db_session() as db:
            success, msg, status_code = CommunityService.ban_member(
                db, int(room), actor_user_id, int(target_user_id), reason
            )
            
            if success:
                target_user = db.query(User).filter(User.id == int(target_user_id)).first()
                username = target_user.username if target_user else f"User {target_user_id}"
                
                emit("user_banned", {
                    "user_id": int(target_user_id),
                    "username": username,
                    "reason": reason,
                    "message": f"{username} has been permanently banned from the stand. Reason: {reason}"
                }, to=room, broadcast=True)
            else:
                emit("error", {"message": msg})
    except Exception as e:
        emit("error", {"message": str(e)})

@socketio.on("pin_message")
def handle_pin_message(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        message_id = data.get("message_id")
        
        if not token or not room or not message_id:
            emit("error", {"message": "Token, room, and message ID are required"})
            return
            
        try:
            decoded = decode_token(token)
            actor_user_id = int(decoded['sub'])
        except Exception:
            emit("error", {"message": "Invalid token"})
            return
            
        with db_session() as db:
            success, msg, status_code, message = MessageService.toggle_pin(
                db, int(message_id), actor_user_id
            )
            
            if success:
                emit("message_pinned", {
                    "message_id": int(message_id),
                    "is_pinned": message.is_pinned,
                    "pinned_message": message.to_dict() if message.is_pinned else None,
                    "message": f"Message {'pinned' if message.is_pinned else 'unpinned'} successfully."
                }, to=room, broadcast=True)
            else:
                emit("error", {"message": msg})
    except Exception as e:
        emit("error", {"message": str(e)})

@socketio.on("tactic:draw")
def handle_tactic_draw(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        if not token or not room:
            return
        try:
            decoded = decode_token(token)
        except Exception:
            return
        emit("tactic:draw", data, to=room, include_self=False)
    except Exception as e:
        print(f"tactic:draw error: {e}")

@socketio.on("tactic:move-token")
def handle_tactic_move_token(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        if not token or not room:
            return
        try:
            decoded = decode_token(token)
        except Exception:
            return
        emit("tactic:move-token", data, to=room, include_self=False)
    except Exception as e:
        print(f"tactic:move-token error: {e}")

@socketio.on("tactic:clear")
def handle_tactic_clear(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        if not token or not room:
            return
        try:
            decoded = decode_token(token)
        except Exception:
            return
        emit("tactic:clear", data, to=room, include_self=False)
    except Exception as e:
        print(f"tactic:clear error: {e}")

@socketio.on("tactic:toggle-cooperative")
def handle_tactic_toggle_cooperative(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        if not token or not room:
            return
        try:
            decoded = decode_token(token)
        except Exception:
            return
        emit("tactic:toggle-cooperative", data, to=room, include_self=False)
    except Exception as e:
        print(f"tactic:toggle-cooperative error: {e}")

# ========== RIVALRY SOCKET.IO EVENTS ==========

@socketio.on("join_rivalry")
def handle_join_rivalry(data):
    """
    Secure rivalry room join with JWT authentication
    Client sends: { token: "jwt_token", room: "session_id", team_affinity: "home" | "away" }
    """
    try:
        token = data.get("token")
        room_id = data.get("room")
        team_affinity = data.get("team_affinity", "home")
        
        if not token or not room_id:
            emit("error", {"message": "Token and room ID are required"})
            return
        
        # Decode and validate JWT token
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception as e:
            emit("error", {"message": f"Invalid token: {str(e)}"})
            return
        
        # Get user from database
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                emit("error", {"message": "User not found"})
                return
            
            if user.is_banned:
                emit("error", {"message": "Your account has been banned"})
                return
            
            user_payload = {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
            }
        
        # Successfully join the room
        room_name = f"rivalry/{room_id}"
        join_room(room_name)
        
        # Notify room
        emit("rivalry_user_joined", {
            "user_id": user_payload["id"],
            "username": user_payload["username"],
            "team_affinity": team_affinity,
            "message": f"{user_payload['username']} ({team_affinity}) joined the arena!"
        }, to=room_name, broadcast=True)
        
        print(f"User {user_payload['username']} joined rivalry room {room_name} with affinity {team_affinity}")
        
    except Exception as e:
        print(f"Join rivalry room error: {str(e)}")
        emit("error", {"message": f"Failed to join rivalry room: {str(e)}"})

@socketio.on("leave_rivalry")
def handle_leave_rivalry(data):
    try:
        token = data.get("token")
        room_id = data.get("room")
        team_affinity = data.get("team_affinity", "home")
        
        if not token or not room_id:
            return
        
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception:
            return
        
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return
            username = user.username
            
        room_name = f"rivalry/{room_id}"
        leave_room(room_name)
        
        emit("rivalry_user_left", {
            "user_id": user_id,
            "username": username,
            "team_affinity": team_affinity,
            "message": f"{username} left the arena"
        }, to=room_name, broadcast=True)
    except Exception as e:
        print(f"Leave rivalry error: {str(e)}")

rivalry_warnings = {}

@socketio.on("send_rivalry_message")
def handle_send_rivalry_message(data):
    """
    Send a rivalry chat message
    Client sends: { token: "jwt_token", room: "session_id", team_affinity: "home" | "away", message: "content" }
    """
    try:
        token = data.get("token")
        room_id = data.get("room")
        content = data.get("message")
        team_affinity = data.get("team_affinity", "home")
        
        if not token or not room_id or not content:
            emit("error", {"message": "Token, room, and message content are required"})
            return
        
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception as e:
            emit("error", {"message": "Invalid or expired token"})
            return
        
        with db_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if not user or user.is_banned:
                emit("error", {"message": "Unauthorized"})
                return
            
            # Check Red Card State
            room_id_str = str(room_id)
            if room_id_str not in rivalry_warnings:
                rivalry_warnings[room_id_str] = {}
            if rivalry_warnings[room_id_str].get(user_id, 0) >= 3:
                emit("ban_alert", {"message": "RED CARD: You are banned from this Arena."}, to=request.sid)
                return

            content_stripped = content.strip()
            
            # 1. AI Slash Commands (Copilot)
            if content_stripped.startswith('/banter') or content_stripped.startswith('/stat'):
                command = content_stripped.split(" ", 1)
                query = command[1] if len(command) > 1 else ""
                
                try:
                    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "").split(",")[0].strip())
                    if content_stripped.startswith('/banter'):
                        prompt = f"Generate a short, witty, clean football banter line (max 150 chars) from a {team_affinity} fan's perspective about {query if query else 'the rivalry match'}."
                    else:
                        prompt = f"Provide one short, interesting football stat (max 150 chars) related to {query if query else 'this derby match'}."
                    
                    from google.genai import types
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            safety_settings=[
                                types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH),
                                types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH)
                            ]
                        )
                    )
                    content = "[COPILOT] " + response.text.strip()
                except Exception as e:
                    emit("error", {"message": "AI Copilot failed to generate response."})
                    return
            else:
                # 2. AI Respect Filter (Toxicity Check)
                try:
                    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "").split(",")[0].strip())
                    prompt = f"Analyze this message for extreme toxicity, racism, or severe abuse in a football fan context. Is it highly toxic? Answer YES or NO.\n\nMessage: '{content_stripped}'"
                    from google.genai import types
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            safety_settings=[
                                types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH),
                                types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH)
                            ]
                        )
                    )
                    if response.text.strip().upper().startswith("YES"):
                        warnings = rivalry_warnings[room_id_str].get(user_id, 0) + 1
                        rivalry_warnings[room_id_str][user_id] = warnings
                        
                        if warnings >= 3:
                            emit("ban_alert", {"message": "RED CARD: You have been temporarily banned from this Arena for toxic behavior."}, to=request.sid)
                        else:
                            emit("warning_alert", {"message": f"YELLOW CARD: Warning {warnings}/3. Keep the banter respectful!"}, to=request.sid)
                        return
                except Exception as e:
                    print(f"Respect Filter error: {e}")
                    pass
            
            # Persist rivalry message
            msg = RivalryMessage(
                rivalry_room_id=int(room_id),
                user_id=user_id,
                team_affinity=team_affinity,
                content=content.strip(),
                respect_votes=0
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)
            
            msg_dict = msg.to_dict()
            
        room_name = f"rivalry/{room_id}"
        emit("receive_rivalry_message", msg_dict, to=room_name, broadcast=True)

        # Trigger goal_alert if message matches keywords or command
        content_lower = content.lower()
        is_goal = "/goal" in content_lower or "gooooal" in content_lower or "siuuu" in content_lower or "golaso" in content_lower
        if is_goal:
            scorer = "A Legend"
            team_name = "The Champions"
            if content.strip().lower().startswith("/goal"):
                parts = content.strip().split(None, 2)
                scorer = parts[1] if len(parts) > 1 else "A Legend"
                team_name = parts[2] if len(parts) > 2 else "The Champions"
            
            emit("goal_alert", {
                "scorer": scorer,
                "team_name": team_name
            }, to=room_name, broadcast=True)

        print(f"Rivalry message saved and broadcasted to {room_name}")
        
    except Exception as e:
        print(f"Send rivalry message error: {str(e)}")
        emit("error", {"message": f"Failed to send message: {str(e)}"})

@socketio.on("rivalry_respect_upvote")
def handle_rivalry_respect_upvote(data):
    """
    Upvotes a rivalry message and increases the respect clout score of the respective team.
    Client sends: { token: "jwt_token", room: "session_id", message_id: 123 }
    """
    try:
        token = data.get("token")
        room_id = data.get("room")
        message_id = data.get("message_id")
        
        if not token or not room_id or not message_id:
            emit("error", {"message": "Token, room, and message ID are required"})
            return
        
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception:
            emit("error", {"message": "Invalid token"})
            return
            
        with db_session() as db:
            # Fetch the message
            msg = db.query(RivalryMessage).filter(RivalryMessage.id == int(message_id)).first()
            if not msg:
                emit("error", {"message": "Message not found"})
                return
                
            # Check if message belongs to correct room
            if msg.rivalry_room_id != int(room_id):
                emit("error", {"message": "Message does not belong to this room"})
                return
                
            # Increment respect_votes for the message
            msg.respect_votes += 1
            
            # Increment score of respective team
            room = db.query(RivalryRoom).filter(RivalryRoom.id == int(room_id)).first()
            if room:
                if msg.team_affinity == 'home':
                    room.home_respect_score += 1
                elif msg.team_affinity == 'away':
                    room.away_respect_score += 1
                    
                db.commit()
                
                # Broadcast the updated respect stats
                room_name = f"rivalry/{room_id}"
                emit("rivalry_respect_updated", {
                    "message_id": msg.id,
                    "respect_votes": msg.respect_votes,
                    "home_respect_score": room.home_respect_score,
                    "away_respect_score": room.away_respect_score
                }, to=room_name, broadcast=True)
                print(f"Respect upvote registered for message {message_id} in {room_name}")
            else:
                emit("error", {"message": "Rivalry room not found"})
    except Exception as e:
        print(f"Respect upvote error: {str(e)}")
        emit("error", {"message": f"Failed to upvote: {str(e)}"})

# ========== END SOCKET.IO EVENTS ==========

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    print(f"Starting server on port {port}...")
    socketio.run(
        app,
        debug=app.config["DEBUG"],
        host="0.0.0.0",
        port=port,
        use_reloader=False,
    )
