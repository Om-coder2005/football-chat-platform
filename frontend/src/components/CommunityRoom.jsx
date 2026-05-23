import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { messageAPI, communityAPI, matchAPI } from '../services/api';
import { formatTime } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from './AppHeader';
import ClubNews from './ClubNews';
import { MessageSquare, Users, Activity, Sparkles, Send, Paperclip, X, Trash2, Star, Shield, Info, RefreshCw, Trophy } from 'lucide-react';
import '../styles/CommunityRoom.css';

const CommunityRoom = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [matchData, setMatchData] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'news', or 'members'
  const [matchSource, setMatchSource] = useState('none');
  const [messageActionLoading, setMessageActionLoading] = useState({});
  const [memberActionLoading, setMemberActionLoading] = useState({});
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem('access_token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCommunityAndMessages();
  }, [communityId]);

  useEffect(() => {
    if (community) fetchMatchData();
  }, [community]);

  // Tactical summary logic removed to focus on traditional match stats

  useEffect(() => {
    if (socket && communityId) {
      const intervalId = setInterval(fetchMatchData, 60000);
      return () => clearInterval(intervalId);
    }
  }, [community]);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:5001', {
      transports: ['websocket'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_room', { room: communityId, token });
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on('typing_update', (data) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (data.is_typing) next.add(data.username);
        else next.delete(data.username);
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_room', { room: communityId, token });
      newSocket.disconnect();
    };
  }, [communityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCommunityAndMessages = async () => {
    try {
      const commResponse = await communityAPI.getAll();
      const allCommunities = commResponse.data.communities || [];
      setCommunities(allCommunities);
      const comm = allCommunities.find((c) => c.id === parseInt(communityId));
      setCommunity(comm);

      const msgResponse = await messageAPI.getHistory(communityId, 50, 0);
      if (msgResponse.data.success) {
        setMessages(msgResponse.data.messages);
      }

      const membersResponse = await communityAPI.getMembers(communityId);
      if (membersResponse.data.success) {
        setMembers(membersResponse.data.members || []);
      }
    } catch (error) {
      if (error.response?.status === 403) navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchData = async () => {
    const clubName = community?.club_name || community?.name || '';
    if (!clubName) {
      setMatchData(null);
      return;
    }

    try {
      const response = await matchAPI.getTeamMatchesByName(clubName);
      if (response.data.success && response.data.matches && response.data.matches.length > 0) {
        setMatchData(response.data.matches[0]);
        setMatchSource(response.data.source || 'today');
        return;
      }
    } catch {}

    setMatchData({
      competition: { name: '' },
      score: { fullTime: { home: null, away: null } },
      homeTeam: { name: clubName },
      awayTeam: { name: 'No match today' },
      status: 'SCHEDULED'
    });
  };

  const sendMessage = () => {
    if ((!inputMessage.trim() && !mediaUrl.trim()) || !socket || !isConnected) return;
    socket.emit('send_message', {
      room: communityId,
      message: inputMessage.trim(),
      media_url: mediaUrl.trim(),
      token,
    });
    setInputMessage('');
    setMediaUrl('');
    setShowMediaInput(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);

    if (socket && isConnected) {
      socket.emit('typing', { room: communityId, token, is_typing: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { room: communityId, token, is_typing: false });
      }, 2000);
    }

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getSourceLabel = () => {
    if (matchSource === 'live') return 'LIVE NOW';
    if (matchSource === 'today' || matchSource === 'team_today') return "TODAY'S MATCH";
    if (matchSource === 'closest') return matchData?.status === 'FINISHED' ? 'LAST RESULT' : 'NEXT MATCH';
    return '';
  };

  const combinedEvents = useMemo(() => {
    if (!matchData) return [];
    const goals    = (matchData.goals    || []).map(g => ({ ...g, eventType: 'goal' }));
    const bookings = (matchData.bookings || []).map(b => ({ ...b, eventType: 'card' }));
    return [...goals, ...bookings].sort((a, b) => parseInt(a.minute) - parseInt(b.minute));
  }, [matchData]);

  const matchStats = useMemo(() => {
    if (!matchData) return null;
    const home = matchData.homeTeam?.statistics, away = matchData.awayTeam?.statistics;
    if (!home || !away) return null;
    return [
      { label: 'Possession', home: home.ball_possession || 0, away: away.ball_possession || 0, suffix: '%', isPct: true },
      { label: 'Total Shots', home: home.total_shots || home.shots || 0, away: away.total_shots || away.shots || 0 },
      { label: 'Shots on Target', home: home.shots_on_target || home.shots_on_goal || 0, away: away.shots_on_target || away.shots_on_goal || 0 },
      { label: 'Corner Kicks', home: home.corner_kicks || 0, away: away.corner_kicks || 0 },
    ];
  }, [matchData]);

  const isModerator = useMemo(() => {
    const role = members.find(m => m.user_id === currentUser.id)?.role;
    return role === 'admin' || role === 'moderator';
  }, [members, currentUser.id]);

  if (loading) return (
    <div className="chat-view-wrapper h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <h2 className="neu-heading text-6xl animate-pulse">{'WARMING UP…'}</h2>
    </div>
  );

  return (
    <div className="chat-view-wrapper">
      <AppHeader />
      <div className="chat-room-layout">
        
        {/* Left Sidebar - Channels */}
        <aside className="chat-sidebar-left">
          <div className="sidebar-header">
            <div className="app-logo-icon">
              <MessageSquare size={24} />
            </div>
            {isConnected && <div className="status-dot w-3 h-3 bg-green-500 border-2 border-black rounded-full" />}
          </div>
          
          <div className="channels-list">
            {communities.slice(0, 8).map((comm) => (
              <button
                key={comm.id}
                className={`channel-item ${comm.id === parseInt(communityId) ? 'active' : ''}`}
                onClick={() => navigate(`/community/${comm.id}`)}
              >
                <span className="channel-logo-text">{(comm.club_name || comm.name).charAt(0)}</span>
              </button>
            ))}
          </div>

          <button className="add-channel-btn" onClick={() => navigate('/communities')}>
            <span>+</span>
          </button>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-main-area">
          <div className="chat-header-bar">
            <div className="chat-header-info flex items-center gap-4">
              <h2 className="neu-heading text-2xl tracking-widest">{community?.name}</h2>
              <div className="comic-sticker bg-white text-black text-[10px] hidden sm:block">
                {community?.club_name || 'GENERAL'}
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setShowRightSidebar(!showRightSidebar)}
                 className="font-archivo text-xs bg-black text-white px-3 py-1 flex items-center gap-2 lg:hidden shadow-[2px_2px_0px_0px_var(--accent-primary)] border border-black"
               >
                 <Activity size={12} /> STATS
               </button>
               <div className="font-archivo text-xs bg-black text-white px-3 py-1 flex items-center gap-2 hidden sm:flex">
                 <Users size={12} /> {members.length} FANS
               </div>
            </div>
          </div>
          
          <div className="messages-viewport">
            {messages.length === 0 ? (
              <div className="empty-chat-placeholder h-full flex flex-col items-center justify-center opacity-20 rotate-[-5deg]">
                <MessageSquare size={80} className="mb-4" />
                <p className="text-4xl uppercase font-bebas">{'NO CHATTER YET'}</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`msg-row ${msg.user_id === currentUser.id ? 'msg-own' : 'msg-other'} ${msg.is_highlighted ? 'msg-highlighted' : ''}`}
                >
                  <div className="msg-bubble">
                    {msg.is_highlighted && (
                      <div className="highlight-badge text-[var(--accent-primary)] font-archivo text-[10px] flex items-center gap-1 mb-1">
                        <Star size={10} fill="currentColor" /> HIGHLIGHTED
                      </div>
                    )}
                    <div className="msg-meta flex justify-between items-center mb-1">
                      <span className="msg-user text-[12px] font-archivo uppercase text-black/70 font-bold">
                        {msg.username}
                      </span>
                      <span className="msg-time text-[10px] font-poppins font-bold opacity-70">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div className="msg-text">
                      {msg.content}
                    </div>
                    {msg.media_url && (
                      <div className="mt-3 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                        <img src={msg.media_url} alt="" className="w-full max-h-80 object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {typingUsers.size > 0 && (
              <div className="typing-indicator text-[10px] font-archivo opacity-60 mb-2 ml-2 italic">
                {Array.from(typingUsers).join(', ')} typing...
              </div>
            )}
            
            <AnimatePresence>
              {showMediaInput && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="media-input-row flex items-center gap-3 bg-white border-4 border-black p-3 mb-4 shadow-[4px_4px_0px_0px_#000]"
                >
                  <Paperclip size={18} className="text-gray-400" />
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="IMAGE URL..."
                    className="flex-1 outline-none font-poppins font-bold text-sm bg-transparent"
                  />
                  <button onClick={() => setShowMediaInput(false)}><X size={18} /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-wrapper">
              <button 
                onClick={() => setShowMediaInput(!showMediaInput)}
                className={`p-2 transition-colors ${showMediaInput ? 'text-[var(--accent-primary)]' : 'opacity-40'}`}
              >
                <Paperclip size={20} />
              </button>
              <input
                id="chat-input"
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isConnected ? 'CHANT SOMETHING...' : 'CONNECTING...'}
                disabled={!isConnected}
              />
              <button
                className="send-btn bg-[var(--accent-primary)] text-white p-3 border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                onClick={sendMessage}
                disabled={!isConnected || (!inputMessage.trim() && !mediaUrl.trim())}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Stats & News */}
        <aside className={`chat-sidebar-right ${showRightSidebar ? 'mobile-visible' : ''}`}>
          <div className="sidebar-tabs">
            <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>{'STATS'}</button>
            <button className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>{'NEWS'}</button>
            <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>{'FANS'}</button>
            <button className="tab-btn bg-red-600 lg:hidden text-white border-l-2 border-black" onClick={() => setShowRightSidebar(false)}><X size={14} /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {activeTab === 'stats' && (
              <div className="p-4 space-y-6 overflow-y-auto flex-1">
                {matchData ? (
                  <>
                    <div className="match-source-badge mb-2">
                       <span className="comic-sticker bg-black text-white text-[9px]">{getSourceLabel()}</span>
                    </div>
                    
                    <div className="neu-card bg-white p-4">
                       <p className="font-archivo text-[10px] opacity-60 mb-2 uppercase border-b border-black pb-1">
                         {matchData.competition?.name || 'MATCHDAY'}
                       </p>
                       <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col items-center flex-1">
                             <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] mb-2">
                               {matchData.homeTeam?.crest ? <img src={matchData.homeTeam.crest} className="w-8 h-8 object-contain" alt="" /> : <Shield size={24} />}
                             </div>
                             <span className="font-archivo text-[10px] text-center uppercase leading-tight">{matchData.homeTeam?.shortName || matchData.homeTeam?.name}</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                             <div className="font-bebas text-4xl bg-black text-white px-3 shadow-[3px_3px_0px_0px_var(--accent-primary)]">
                               {matchData.score?.fullTime?.home ?? '-'} : {matchData.score?.fullTime?.away ?? '-'}
                             </div>
                             <span className={`font-archivo text-[9px] text-white px-2 py-0.5 mt-1 ${
                               matchData.status === 'IN_PLAY' || matchData.status === 'PAUSED'
                                 ? 'bg-green-500 animate-pulse'
                                 : matchData.status === 'FINISHED'
                                   ? 'bg-gray-600'
                                   : 'bg-blue-600'
                             }`}>
                               {matchData.status === 'IN_PLAY' ? 'LIVE' : matchData.status === 'PAUSED' ? 'HALF TIME' : matchData.status === 'FINISHED' ? 'FULL TIME' : matchData.status || 'UPCOMING'}
                             </span>
                          </div>
                          <div className="flex flex-col items-center flex-1">
                             <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] mb-2">
                               {matchData.awayTeam?.crest ? <img src={matchData.awayTeam.crest} className="w-8 h-8 object-contain" alt="" /> : <Shield size={24} />}
                             </div>
                             <span className="font-archivo text-[10px] text-center uppercase leading-tight">{matchData.awayTeam?.shortName || matchData.awayTeam?.name}</span>
                          </div>
                       </div>
                    </div>

                    {/* Goals & Events — or score-based fallback */}
                    {combinedEvents.length > 0 ? (
                      <div className="neu-card bg-white p-4">
                        <h4 className="font-bebas text-xl border-b-2 border-black mb-3">{'MATCH EVENTS'}</h4>
                        <div className="space-y-3">
                          {combinedEvents.map((event, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-[11px] font-poppins font-bold">
                                <span className="bg-black text-white px-2 py-1 font-archivo min-w-[32px] text-center border border-black shadow-[2px_2px_0px_0px_#ff3b30]">{event.minute}'</span>
                                {event.eventType === 'goal' ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Trophy size={14} className="text-yellow-500 shrink-0" />
                                    <span className="uppercase truncate">{event.scorer?.name || 'Unknown'}</span>
                                    <span className="opacity-60 ml-auto shrink-0">
                                      {event.team?.id === matchData.homeTeam?.id ? 'H' : 'A'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className={`w-2 h-3 border border-black shrink-0 ${event.card === 'YELLOW_CARD' || event.card === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-600'}`}></div>
                                    <span className="font-bold uppercase truncate">{event.player?.name || 'Unknown'}</span>
                                    <span className="opacity-40 ml-auto shrink-0">
                                      {event.team?.id === matchData.homeTeam?.id ? 'H' : 'A'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (() => {
                      // Score-based fallback — show goals per team when scorer names aren't available yet
                      const sh = matchData.score?.fullTime?.home;
                      const sa = matchData.score?.fullTime?.away;
                      const isFinishedWithGoals = matchData.status === 'FINISHED' && ((sh || 0) + (sa || 0)) > 0;
                      if (!isFinishedWithGoals) return null;
                      return (
                        <div className="neu-card bg-white p-4">
                          <h4 className="font-bebas text-xl border-b-2 border-black mb-3">{'SCORE SUMMARY'}</h4>
                          <div className="space-y-3">
                            {sh > 0 && Array.from({length: sh}).map((_, i) => (
                              <div key={`h${i}`} className="flex items-center gap-3 text-[11px] font-poppins font-bold">
                                <span className="bg-black text-white px-2 py-1 font-archivo min-w-[32px] text-center border border-black shadow-[2px_2px_0px_0px_#ff3b30]">–</span>
                                <div className="flex items-center gap-2 flex-1">
                                  <Trophy size={14} className="text-yellow-500 shrink-0" />
                                  <span className="font-bold uppercase truncate opacity-50">{'Scorer details loading…'}</span>
                                  <span className="opacity-40 ml-auto shrink-0">H</span>
                                </div>
                              </div>
                            ))}
                            {sa > 0 && Array.from({length: sa}).map((_, i) => (
                              <div key={`a${i}`} className="flex items-center gap-3 text-[10px] font-inter">
                                <span className="bg-black text-white px-1.5 py-0.5 font-archivo min-w-[28px] text-center">–</span>
                                <div className="flex items-center gap-2 flex-1">
                                  <Trophy size={10} className="text-yellow-500 shrink-0" />
                                  <span className="font-bold uppercase truncate opacity-50">{'Scorer details loading…'}</span>
                                  <span className="opacity-40 ml-auto shrink-0">A</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="font-inter text-[8px] opacity-30 mt-3 uppercase">{'Scorer data will appear shortly'}</p>
                        </div>
                      );
                    })()}

                    {/* Statistics */}
                    {matchStats && (
                      <div className="neu-card bg-black text-white p-4">
                        <h4 className="font-bebas text-xl border-b border-white/20 mb-4 text-yellow-400">{'MATCH STATS'}</h4>
                        <div className="space-y-4">
                          {matchStats.map((stat, idx) => {
                            const total = (stat.home || 0) + (stat.away || 0) || 1;
                            const hPct = stat.isPct ? stat.home : (stat.home / total) * 100;
                            const aPct = stat.isPct ? stat.away : (stat.away / total) * 100;
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-[9px] font-archivo uppercase">
                                  <span>{stat.home}{stat.suffix || ''}</span>
                                  <span className="opacity-40">{stat.label}</span>
                                  <span>{stat.away}{stat.suffix || ''}</span>
                                </div>
                                <div className="h-1 bg-white/10 flex">
                                  <div className="bg-yellow-400" style={{ width: `${hPct}%` }}></div>
                                  <div className="bg-white/20" style={{ width: `${aPct}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Lineups */}
                    {(matchData.homeTeam?.lineup?.length > 0 || matchData.awayTeam?.lineup?.length > 0) && (
                      <div className="neu-card bg-white p-4">
                        <h4 className="font-bebas text-xl border-b-2 border-black mb-3">{'LINEUPS'}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {[matchData.homeTeam, matchData.awayTeam].map((team, tIdx) => (
                            <div key={tIdx} className="space-y-2 overflow-hidden">
                              <p className="font-archivo text-[9px] uppercase border-b border-black/10 pb-1 font-bold truncate">{team?.shortName || team?.name}</p>
                              <div className="space-y-1">
                                {team?.lineup?.slice(0, 11).map((player, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-2 text-[10px] font-poppins font-bold truncate mb-1">
                                    <span className="text-[9px] opacity-60 w-4 bg-gray-100 text-center border border-black">{player.shirtNumber}</span>
                                    <span className="truncate">{player.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="neu-card bg-white/50 border-dashed py-12 flex flex-col items-center text-center">
                    <Info size={32} className="text-gray-300 mb-2" />
                    <p className="font-archivo text-xs text-gray-400">{'NO LIVE MATCH DATA'}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'news' && (
              <ClubNews clubName={community?.club_name || community?.name} />
            )}

            {activeTab === 'members' && (
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <h3 className="neu-heading text-xl mb-4 border-b-2 border-black pb-2">{'THE FIRM'} ({members.length})</h3>
                {members.map(member => (
                  <div key={member.user_id} className="neu-box bg-white p-3 flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-black bg-[var(--accent-secondary)] flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                       <span className="text-white font-archivo">{member.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-archivo text-sm uppercase truncate font-bold">{member.username}</span>
                         {member.role === 'admin' && <Shield size={12} className="text-red-500" />}
                       </div>
                       <span className="font-poppins text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 border border-black px-1 py-0.5">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CommunityRoom;
