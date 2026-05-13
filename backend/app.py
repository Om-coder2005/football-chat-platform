from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template
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
from src.api.routes.news_routes import news_bp
from src.services.news_service import NewsService
from apscheduler.schedulers.background import BackgroundScheduler
import os
from dotenv import load_dotenv
from google import genai
import threading
import atexit

# Load environment variables
load_dotenv()


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

# Set up APScheduler for background tasks
def fetch_news_job():
    try:
        with db_session() as db:
            NewsService.fetch_and_store_news(db)
    except Exception as e:
        print(f"Background job error: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(func=fetch_news_job, trigger="interval", minutes=15)

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

            user_payload = {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
            }
            
        def process_and_save():
            media_desc = None
            if media_url:
                try:
                    # Very simple moderation/description using Gemini
                    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
                    prompt = f"Please describe this image in one short sentence for visually impaired fans: {media_url}"
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt,
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
                    "created_at": message.created_at.isoformat()
                }, to=room)
                print(f"Message from {user_payload['username']} in room {room}")
            else:
                socketio.emit("error", {"message": f"Failed to save message: {msg}"}, to=room)
                
        # Run in background to avoid blocking socketio thread
        threading.Thread(target=process_and_save, daemon=True).start()
            
    except Exception as e:
        print(f"Send message error: {str(e)}")
        emit("error", {"message": f"Failed to send message: {str(e)}"})

# ========== END SOCKET.IO EVENTS ==========

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print(f"Starting server on port {port}...")
    socketio.run(
        app,
        debug=app.config["DEBUG"],
        host="0.0.0.0",
        port=port,
        use_reloader=False,
    )
