import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\frontend\src\components\CommunityRoom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add typing states
state_insertions = """  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);"""

content = re.sub(r"(const messagesEndRef = useRef\(null\);)", r"\1\n" + state_insertions, content)

# 2. Add socket listener for typing
socket_typing = """
      newSocket.on('receive_typing', (data) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.is_typing) newSet.add(data.username);
          else newSet.delete(data.username);
          return newSet;
        });
      });"""
content = re.sub(r"(newSocket\.on\('receive_message', \(newMsg\) => \{.*?\}\);)", r"\1" + socket_typing, content, flags=re.DOTALL)

# 3. Update input change to emit typing
typing_emit_code = """
    // Typing indicator logic
    if (socket && isConnected) {
      socket.emit('typing', { room: communityId, token, is_typing: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { room: communityId, token, is_typing: false });
      }, 2000);
    }
"""
content = content.replace("setInputMessage(val);", "setInputMessage(val);\n" + typing_emit_code)

# 4. Render typing users
typing_ui = """
            {typingUsers.size > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-gray-400 italic mb-2 ml-2 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
"""
content = content.replace("<div ref={messagesEndRef} />", typing_ui)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added typing UI to CommunityRoom.jsx")
