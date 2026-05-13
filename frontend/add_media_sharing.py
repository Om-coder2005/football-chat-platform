import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\frontend\src\components\CommunityRoom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add mediaUrl state
content = re.sub(r"(const \[inputMessage, setInputMessage\] = useState\(''\);)", r"\1\n  const [mediaUrl, setMediaUrl] = useState('');", content)

# 2. Update sendMessage
send_msg_old = """  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    socket.emit('send_message', {
      room: communityId,
      message: inputMessage.trim(),
      token,
    });
    setInputMessage('');
  };"""

send_msg_new = """  const sendMessage = () => {
    if ((!inputMessage.trim() && !mediaUrl.trim()) || !socket || !isConnected) return;

    socket.emit('send_message', {
      room: communityId,
      message: inputMessage.trim(),
      media_url: mediaUrl.trim(),
      token,
    });
    setInputMessage('');
    setMediaUrl('');
  };"""
content = content.replace(send_msg_old, send_msg_new)

# 3. Handle key press for both
content = content.replace("disabled={!isConnected || !inputMessage.trim()}", "disabled={!isConnected || (!inputMessage.trim() && !mediaUrl.trim())}")

# 4. Render media inside message bubble
msg_text_render = """<div className="msg-text">{renderMessageContent(msg.content)}</div>
                    {msg.media_url && (
                      <div className="mt-2 relative">
                        <img src={msg.media_url} alt="Shared media" className="max-w-full max-h-64 rounded-lg shadow-sm border border-gray-700/50" />
                        {msg.media_description && (
                          <div className="mt-1 flex items-start gap-1 text-[10px] text-gray-400 bg-gray-900/50 p-1.5 rounded w-fit">
                            <span className="text-blue-400">🤖</span> 
                            <span>{msg.media_description}</span>
                          </div>
                        )}
                      </div>
                    )}"""
content = content.replace('<div className="msg-text">{renderMessageContent(msg.content)}</div>', msg_text_render)

# 5. Add media input field in input-wrapper
input_wrapper_old = """<div className="input-wrapper">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Send a message…" : "Waiting for connection…"}
                disabled={!isConnected}
              />"""
input_wrapper_new = """<div className="input-wrapper flex flex-col gap-2 p-2 bg-[#1d2333]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Paste Image/GIF URL (optional)"
                  className="bg-[#161b22] text-xs px-3 py-1.5 rounded flex-1 border border-gray-700"
                  disabled={!isConnected}
                />
              </div>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isConnected ? "Send a message…" : "Waiting for connection…"}
                  disabled={!isConnected}
                  className="flex-1"
                />"""
content = content.replace(input_wrapper_old, input_wrapper_new)

# Add closing div for flex gap-2 w-full
content = content.replace("</button>\n            </div>", "</button>\n              </div>\n            </div>")


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated CommunityRoom.jsx with media sharing.")
