import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\frontend\src\components\CommunityRoom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add mentions states and attachment toggle state
state_insertions = """  const [showMediaInput, setShowMediaInput] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);"""

content = re.sub(r"(const \[loadingSummary, setLoadingSummary\] = useState\(false\);)", r"\1\n" + state_insertions, content)

# 2. Add input change handler to detect @
input_change_handler = """  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);
    
    const lastWord = val.split(' ').pop();
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username) => {
    const words = inputMessage.split(' ');
    words.pop();
    words.push(`@${username} `);
    setInputMessage(words.join(' '));
    setShowMentions(false);
    document.getElementById('chat-input').focus();
  };

  const filteredMembers = members.filter(m => m.username.toLowerCase().includes(mentionFilter));
"""
content = re.sub(r"(  const handleKeyPress = \(e\) => \{)", input_change_handler + "\n" + r"\1", content)

# 3. Update handleKeyPress for Mentions navigation
keypress_old = """  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };"""
keypress_new = """  const handleKeyPress = (e) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev > 0 ? prev - 1 : filteredMembers.length - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev < filteredMembers.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex].username);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };"""
content = content.replace(keypress_old, keypress_new)


# 4. Enhance Tactical Summary UI
summary_ui_old = """                  {/* AI Tactical Summary */}
                  <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="text-[#FFD700]">✨</span> AI Tactical Summary
                      </h3>
                      <button 
                        onClick={fetchTacticalSummary} 
                        disabled={loadingSummary}
                        className="bg-[#FFD700] text-black text-xs font-bold px-3 py-1 rounded hover:bg-yellow-400 disabled:opacity-50"
                      >
                        {loadingSummary ? 'Generating...' : (tacticalSummary ? 'Regenerate' : 'Generate Report')}
                      </button>
                    </div>
                    
                    {tacticalSummary && (
                      <div className="space-y-3 mt-3">
                        <div className="bg-gray-900 p-3 rounded border border-gray-700">
                          <h4 className="text-[#FFD700] text-xs font-bold mb-1 uppercase tracking-wider">Manager's Report</h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{tacticalSummary.tactical_analysis}</p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded border border-gray-700">
                          <h4 className="text-blue-400 text-xs font-bold mb-1 uppercase tracking-wider">Fan Sentiment</h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{tacticalSummary.fan_sentiment}</p>
                        </div>
                      </div>
                    )}
                  </div>"""

summary_ui_new = """                  {/* AI Tactical Summary */}
                  <div className="bg-[#1a202c] rounded-xl p-4 mb-4 border border-gray-700/50 shadow-lg relative overflow-hidden">
                    {/* Subtle gradient background */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-[#FFD700] to-purple-500"></div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="text-[#FFD700] text-lg">✨</span> AI Match Analysis
                      </h3>
                      <button 
                        onClick={fetchTacticalSummary} 
                        disabled={loadingSummary}
                        className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#FFD700]/20 disabled:opacity-50 transition-all duration-300 flex items-center gap-1"
                      >
                        {loadingSummary ? (
                          <><svg className="animate-spin h-3 w-3 text-[#FFD700]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...</>
                        ) : (tacticalSummary ? '↻ Regenerate' : 'Generate Now')}
                      </button>
                    </div>
                    
                    {loadingSummary && (
                      <div className="space-y-3 mt-4 animate-pulse">
                        <div className="h-20 bg-gray-800 rounded-lg w-full"></div>
                        <div className="h-16 bg-gray-800 rounded-lg w-full"></div>
                      </div>
                    )}

                    {tacticalSummary && !loadingSummary && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-4">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-3.5 rounded-lg border border-gray-700/50 shadow-inner">
                          <h4 className="text-[#FFD700] text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Manager's Report
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed font-light">{tacticalSummary.tactical_analysis}</p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-3.5 rounded-lg border border-gray-700/50 shadow-inner">
                          <h4 className="text-blue-400 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            Fan Sentiment
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed font-light">{tacticalSummary.fan_sentiment}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>"""
content = content.replace(summary_ui_old, summary_ui_new)

# 5. Redesign Chat Input Area
chat_input_old = """          <div className="chat-input-area">
            <div className="input-wrapper flex flex-col gap-2 p-2 bg-[#1d2333]">
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
                />
              <button 
                className="send-trigger" 
                onClick={sendMessage} 
                disabled={!isConnected || (!inputMessage.trim() && !mediaUrl.trim())}
              >
                SEND
              </button>
              </div>
            </div>
          </div>"""

chat_input_new = """          <div className="chat-input-area relative">
            {/* Mentions Autocomplete */}
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute bottom-full left-4 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="max-h-48 overflow-y-auto">
                  {filteredMembers.map((m, i) => (
                    <button
                      key={m.user_id}
                      className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-gray-700 transition-colors ${i === mentionIndex ? 'bg-gray-700' : ''}`}
                      onClick={() => insertMention(m.username)}
                    >
                      <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${m.username}&background=random`} alt="" className="w-6 h-6 rounded-full" />
                      <span className="text-sm font-medium text-white">{m.username}</span>
                      <span className="text-xs text-gray-400 capitalize ml-auto">{m.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#1a202c] border border-gray-700 rounded-2xl mx-4 mb-4 p-2 shadow-sm transition-all focus-within:border-[#FFD700]/50 focus-within:ring-1 focus-within:ring-[#FFD700]/50">
              {showMediaInput && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pb-2 mb-2 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <input
                      type="text"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="Paste Image URL to attach..."
                      className="bg-transparent text-sm text-white placeholder-gray-500 w-full outline-none"
                      disabled={!isConnected}
                      autoFocus
                    />
                    <button onClick={() => { setMediaUrl(''); setShowMediaInput(false); }} className="text-gray-400 hover:text-white p-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </motion.div>
              )}
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowMediaInput(!showMediaInput)}
                  className={`p-2 rounded-full transition-colors ${showMediaInput || mediaUrl ? 'text-[#FFD700] bg-[#FFD700]/10' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                  title="Attach Media"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <input
                  id="chat-input"
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={isConnected ? "Send a message to the community..." : "Connecting..."}
                  disabled={!isConnected}
                  className="bg-transparent text-sm text-white placeholder-gray-500 w-full outline-none py-2"
                  autoComplete="off"
                />
                <button 
                  onClick={sendMessage} 
                  disabled={!isConnected || (!inputMessage.trim() && !mediaUrl.trim())}
                  className="bg-[#FFD700] text-black p-2 rounded-full hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          </div>"""

content = content.replace(chat_input_old, chat_input_new)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("UI improvements completed successfully.")
