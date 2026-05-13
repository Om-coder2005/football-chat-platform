import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\frontend\src\components\CommunityRoom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add mentions highlighting function
render_msg_func = """
  const renderMessageContent = (content) => {
    // Regex to match @username (letters, numbers, underscores)
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
    const parts = content.split(mentionRegex);
    return parts.map((part, i) => {
      if (part.match(mentionRegex)) {
        return <span key={i} className="text-[#FFD700] font-bold bg-[#FFD700]/10 px-1 rounded">{part}</span>;
      }
      return part;
    });
  };
"""
# Insert before "const canDeleteMessage = (message) => {"
content = content.replace("  const canDeleteMessage = (message) => {", render_msg_func + "\n  const canDeleteMessage = (message) => {")

# 2. Use renderMessageContent
content = content.replace('<div className="msg-text">{msg.content}</div>', '<div className="msg-text">{renderMessageContent(msg.content)}</div>')


# 3. Add Avatar to message bubble
avatar_code = """                    <div className="flex items-center gap-2 mb-1">
                      <img 
                        src={msg.avatar_url || `https://ui-avatars.com/api/?name=${msg.username}&background=random`} 
                        alt="Avatar" 
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="msg-user">{msg.username}</span>
                    </div>"""

# Replace `<span className="msg-user">{msg.username}</span>` with the avatar code.
content = content.replace('<span className="msg-user">{msg.username}</span>', avatar_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Mentions and avatars added successfully.")
