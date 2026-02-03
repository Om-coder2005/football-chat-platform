from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_jwt_extended import JWTManager, decode_token
from flask_cors import CORS
from src.api.routes.auth_routes import auth_bp
from src.api.routes.community_routes import community_bp
from src.api.routes.message_routes import message_bp
from src.db.connection import get_db
from src.db.models.community_member import CommunityMember
from src.db.models.user import User
from src.services.message_service import MessageService
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

jwt = JWTManager(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(community_bp, url_prefix="/api")
app.register_blueprint(message_bp, url_prefix="/api")

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
        db = next(get_db())
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
        
        # Successfully join the room
        join_room(room)
        
        # Notify room
        emit("user_joined", {
            "user_id": user.id,
            "username": user.username,
            "message": f"{user.username} joined the chat"
        }, to=room, broadcast=True)
        
        print(f"✅ User {user.username} (ID: {user.id}) joined room {room}")
        
    except Exception as e:
        print(f"❌ Join room error: {str(e)}")
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
        
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        
        if user:
            leave_room(room)
            
            emit("user_left", {
                "user_id": user.id,
                "username": user.username,
                "message": f"{user.username} left the chat"
            }, to=room, broadcast=True)
            
            print(f"👋 User {user.username} left room {room}")
        
    except Exception as e:
        print(f"❌ Leave room error: {str(e)}")

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
        
        if not token or not room or not content:
            emit("error", {"message": "Token, room, and message are required"})
            return
        
        if not content.strip():
            emit("error", {"message": "Message cannot be empty"})
            return
        
        # Validate JWT
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
        except Exception as e:
            emit("error", {"message": "Invalid or expired token"})
            return
        
        db = next(get_db())
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
        
        # Save message to database
        success, msg, message = MessageService.create_message(
            db, content.strip(), user_id, int(room)
        )
        
        if success:
            # Broadcast message to room
            emit("receive_message", {
                "id": message.id,
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "content": message.content,
                "created_at": message.created_at.isoformat()
            }, to=room, broadcast=True)
            
            print(f"💬 Message from {user.username} in room {room}: {content[:50]}")
        else:
            emit("error", {"message": f"Failed to save message: {msg}"})
            
    except Exception as e:
        print(f"❌ Send message error: {str(e)}")
        emit("error", {"message": f"Failed to send message: {str(e)}"})

# ========== END SOCKET.IO EVENTS ==========

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
