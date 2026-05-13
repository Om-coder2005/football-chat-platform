import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\backend\app.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

typing_event = """@socketio.on("typing")
def handle_typing(data):
    try:
        token = data.get("token")
        room = str(data.get("room"))
        is_typing = data.get("is_typing", True)
        
        if not token or not room: return
        
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        if not user: return
        
        emit("receive_typing", {
            "username": user.username,
            "is_typing": is_typing
        }, to=room, include_self=False)
    except Exception:
        pass
"""

# Insert before @socketio.on("send_message")
content = content.replace('@socketio.on("send_message")', typing_event + '\n@socketio.on("send_message")')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added typing event to app.py")
