import sys
import re

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\frontend\src\components\CommunityRoom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
state_insertion = """  const [tacticalSummary, setTacticalSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);"""
content = re.sub(r"(const \[notificationInput, setNotificationInput\] = useState\(''\);)", r"\1\n" + state_insertion, content)

# 2. Add fetch function
fetch_func = """
  const fetchTacticalSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await communityAPI.getTacticalSummary(communityId);
      if (response.data?.success) {
        setTacticalSummary(response.data.summary);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate tactical summary');
    } finally {
      setLoadingSummary(false);
    }
  };
"""
content = re.sub(r"(  const sendNotification = async \(content\) => \{.*?\};\n)", r"\1\n" + fetch_func, content, flags=re.DOTALL)

# 3. Add auto-polling for match stats
polling_code = """
  // Auto-polling for Match Stats
  useEffect(() => {
    if (community) {
      const intervalId = setInterval(() => {
        fetchMatchData();
      }, 60000); // 1 minute
      return () => clearInterval(intervalId);
    }
  }, [community]);
"""
content = re.sub(r"(  // Fetch match data\n  useEffect\(\(\) => \{\n    if \(community\) \{\n      fetchMatchData\(\);\n    \}\n  \}, \[community\]\);\n)", r"\1\n" + polling_code, content)


# 4. Add the button and summary UI below the Match Header
summary_ui = """
                  {/* AI Tactical Summary */}
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
                  </div>
"""

content = content.replace("                  {/* Scoreboard */}", summary_ui + "\n                  {/* Scoreboard */}")

# 5. Import framer-motion (we'll install it)
content = re.sub(r"(import AppHeader from './AppHeader';)", r"import { motion } from 'framer-motion';\n\1", content)

# 6. Animate messages
msg_original = r"""<div
                  key={msg.id || idx}
                  className={`msg-row ${msg.user_id === currentUser.id ? 'msg-own' : 'msg-other'} ${msg.is_highlighted ? 'msg-highlighted' : ''}`}
                >"""
msg_animated = r"""<motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  key={msg.id || idx}
                  className={`msg-row ${msg.user_id === currentUser.id ? 'msg-own' : 'msg-other'} ${msg.is_highlighted ? 'msg-highlighted' : ''}`}
                >"""
content = content.replace(msg_original, msg_animated)
content = content.replace("</div>\n                </div>\n              ))", "</div>\n                </motion.div>\n              ))")


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated CommunityRoom.jsx successfully.")
