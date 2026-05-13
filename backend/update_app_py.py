import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\backend\app.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_gemini = """from google import genai
from google.genai import types
import threading
"""
content = re.sub(r"(from dotenv import load_dotenv\n)", r"\1" + import_gemini, content)

# Modify handle_message
new_handle_message = """@socketio.on("send_message")
def handle_message(data):
    \"\"\"
    Send a message with JWT authentication and database persistence
    Client must send: { token: "jwt_token", room: "community_id", message: "content" }
    \"\"\"
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
            
        def process_and_save():
            db_thread = next(get_db())
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

            success, msg, message = MessageService.create_message(
                db_thread, content.strip(), user_id, int(room), media_url=media_url, media_description=media_desc
            )
            
            if success:
                socketio.emit("receive_message", {
                    "id": message.id,
                    "user_id": user.id,
                    "username": user.username,
                    "avatar_url": user.avatar_url,
                    "content": message.content,
                    "media_url": message.media_url,
                    "media_description": message.media_description,
                    "is_highlighted": message.is_highlighted.isoformat() if message.is_highlighted else None,
                    "created_at": message.created_at.isoformat()
                }, to=room)
                print(f"💬 Message from {user.username} in room {room}")
            else:
                socketio.emit("error", {"message": f"Failed to save message: {msg}"}, to=room)
                
        # Run in background to avoid blocking socketio thread
        threading.Thread(target=process_and_save).start()
            
    except Exception as e:
        print(f"❌ Send message error: {str(e)}")
        emit("error", {"message": f"Failed to send message: {str(e)}"})"""

content = re.sub(r'@socketio\.on\("send_message"\).*?emit\("error", \{"message": f"Failed to send message: \{str\(e\)\}"\}\)', new_handle_message, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.py successfully.")
