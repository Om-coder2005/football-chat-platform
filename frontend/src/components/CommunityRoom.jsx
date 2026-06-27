import { createElement, useEffect, useState, useRef, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { messageAPI, communityAPI, matchAPI, stickerAPI } from '../services/api';
import { SOCKET_URL } from '../config';
import { useToast } from '../contexts/ToastContext';
import { formatTime } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from './AppHeader';
import ClubNews from './ClubNews';
import TacticBoard from './TacticBoard';
import GoalAnimation from './GoalAnimation';
import { MessageSquare, Users, Activity, Sparkles, Send, Paperclip, X, Trash2, Star, Shield, Info, RefreshCw, Trophy, Pin, PinOff, VolumeX, AlertTriangle, UserMinus, Ban, Settings, Smile, ClipboardList, CircleDot, Megaphone, Flame, Crown, Hand, Footprints, Zap, BadgeAlert } from 'lucide-react';
import '../styles/CommunityRoom.css';
import { ThemeContext } from '../contexts/ThemeContext';

const QUICK_REACTIONS = [
  { label: 'Goal', text: 'Goal! ', icon: CircleDot },
  { label: 'Trophy', text: 'Champions! ', icon: Trophy },
  { label: 'Red Card', text: 'Red card! ', icon: BadgeAlert, className: 'text-red-600' },
  { label: 'Yellow Card', text: 'Yellow card! ', icon: BadgeAlert, className: 'text-yellow-500' },
  { label: 'Chant', text: 'Chant! ', icon: Megaphone },
  { label: 'Fire', text: 'On fire! ', icon: Flame },
  { label: 'Applause', text: 'Applause! ', icon: Hand },
  { label: 'Crown', text: 'Masterclass! ', icon: Crown },
];

const CommunityRoom = () => {
  const { bubbleStyle, chatFont } = useContext(ThemeContext);
  const { communityId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [showTacticBoard, setShowTacticBoard] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeGoalAlert, setActiveGoalAlert] = useState(null);

  const triggerGoalAlert = (scorer, teamName) => {
    setActiveGoalAlert({
      id: Date.now(),
      scorer: scorer || 'A Legend',
      teamName: teamName || 'The Champions'
    });
    
    // Auto clear after 4 seconds
    setTimeout(() => {
      setActiveGoalAlert(null);
    }, 4000);
  };

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

  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [selectedMemberForMod, setSelectedMemberForMod] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [muteDuration, setMuteDuration] = useState(10);

  const [allStickers, setAllStickers] = useState([]);
  const [ownedStickerIds, setOwnedStickerIds] = useState([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  const token = localStorage.getItem('access_token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchStickers = async () => {
      try {
        const stickersRes = await stickerAPI.getAll();
        const ownedRes = await stickerAPI.getMyOwned();
        if (stickersRes.data.success) {
          setAllStickers(stickersRes.data.stickers || []);
        }
        if (ownedRes.data.success) {
          setOwnedStickerIds(ownedRes.data.sticker_ids || []);
        }
      } catch (err) {
        console.error("Failed to load stickers for picker", err);
      }
    };
    if (token) {
      fetchStickers();
    }
  }, [communityId, token]);

  const sendSticker = (sticker) => {
    if (!socket || !isConnected) return;
    socket.emit('send_message', {
      room: communityId,
      message: '[sticker]',
      media_url: sticker.image_url,
      message_type: 'sticker',
      token
    });
    setShowStickerPicker(false);
  };

  const actorRole = useMemo(() => members.find(m => m.user_id === currentUser.id)?.role, [members, currentUser.id]);

  const handleWarnMember = async (memberUserId) => {
    try {
      const response = await communityAPI.warnMember(communityId, memberUserId);
      if (response.data.success) {
        toast.success(response.data.message);
        const membersResponse = await communityAPI.getMembers(communityId);
        if (membersResponse.data.success) {
          setMembers(membersResponse.data.members || []);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to warn member");
    }
  };

  const handleMuteMember = (memberUserId, durationMinutes) => {
    if (socket && isConnected) {
      socket.emit('mute_user', {
        token,
        room: communityId,
        target_user_id: memberUserId,
        duration: durationMinutes
      });
    }
  };

  const handleKickMember = (memberUserId) => {
    if (socket && isConnected) {
      socket.emit('kick_user', {
        token,
        room: communityId,
        target_user_id: memberUserId
      });
      toast.info('Kick request sent.');
    }
  };

  const handleBanMember = (memberUserId, reason) => {
    if (socket && isConnected) {
      socket.emit('ban_user', {
        token,
        room: communityId,
        target_user_id: memberUserId,
        reason: reason
      });
      toast.info('Ban request sent.');
    }
  };

  const handleTogglePin = (messageId) => {
    if (socket && isConnected) {
      socket.emit('pin_message', {
        token,
        room: communityId,
        message_id: messageId
      });
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await messageAPI.delete(messageId);
      if (response.data.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Message deleted.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  const handleToggleHighlight = async (messageId) => {
    try {
      const response = await messageAPI.toggleHighlight(messageId);
      if (response.data.success) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_highlighted: !m.is_highlighted } : m));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to highlight message");
    }
  };

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

    const newSocket = io(SOCKET_URL, {
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

    newSocket.on('goal_alert', (data) => {
      triggerGoalAlert(data.scorer, data.team_name);
    });

    newSocket.on('typing_update', (data) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (data.is_typing) next.add(data.username);
        else next.delete(data.username);
        return next;
      });
    });

    newSocket.on('user_muted', (data) => {
      setMembers(prev => prev.map(m => m.user_id === data.user_id ? { ...m, muted_until: data.muted_until } : m));
      
      const sysMsg = {
        id: `sys-${Date.now()}-${Math.random()}`,
        username: 'SYSTEM',
        content: data.message,
        created_at: new Date().toISOString(),
        is_highlighted: true
      };
      setMessages(prev => [...prev, sysMsg]);
      
      if (data.user_id === currentUser.id) {
        toast.error(data.message);
      }
    });

    newSocket.on('user_kicked', (data) => {
      setMembers(prev => prev.filter(m => m.user_id !== data.user_id));
      
      const sysMsg = {
        id: `sys-${Date.now()}-${Math.random()}`,
        username: 'SYSTEM',
        content: data.message,
        created_at: new Date().toISOString(),
        is_highlighted: true
      };
      setMessages(prev => [...prev, sysMsg]);
      
      if (data.user_id === currentUser.id) {
        toast.error("You have been kicked from the room.");
        navigate('/communities');
      }
    });

    newSocket.on('user_banned', (data) => {
      setMembers(prev => prev.filter(m => m.user_id !== data.user_id));
      
      const sysMsg = {
        id: `sys-${Date.now()}-${Math.random()}`,
        username: 'SYSTEM',
        content: data.message,
        created_at: new Date().toISOString(),
        is_highlighted: true
      };
      setMessages(prev => [...prev, sysMsg]);
      
      if (data.user_id === currentUser.id) {
        toast.error(`You have been banned from this room. Reason: ${data.reason}`);
        navigate('/communities');
      }
    });

    newSocket.on('message_pinned', (data) => {
      if (data.is_pinned) {
        setPinnedMessage(data.pinned_message);
      } else {
        setPinnedMessage(current => (current && current.id === data.message_id) ? null : current);
      }
      
      setMessages(prev => prev.map(m => {
        if (m.id === data.message_id) {
          return { ...m, is_pinned: data.is_pinned };
        }
        if (data.is_pinned && m.is_pinned) {
          return { ...m, is_pinned: false };
        }
        return m;
      }));
      
      const sysMsg = {
        id: `sys-${Date.now()}-${Math.random()}`,
        username: 'SYSTEM',
        content: data.message,
        created_at: new Date().toISOString(),
        is_highlighted: true
      };
      setMessages(prev => [...prev, sysMsg]);
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
        const pinned = msgResponse.data.messages.find(m => m.is_pinned);
        setPinnedMessage(pinned || null);
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
      {/* ── GOAL ANIMATION OVERLAY ── */}
      <GoalAnimation alert={activeGoalAlert} />

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
                 onClick={() => setShowTacticBoard(!showTacticBoard)}
                 className={`font-archivo text-xs px-3 py-1 flex items-center gap-1.5 border border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] transition-all cursor-pointer uppercase ${showTacticBoard ? 'bg-yellow-300 text-black' : 'bg-black text-white'}`}
               >
                 <ClipboardList size={14} /> TACTICS
               </button>
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

          {showTacticBoard && (
            <div className="px-6 pt-4 shrink-0 overflow-y-auto max-h-[75vh] border-b-4 border-black bg-[var(--bg-secondary)]">
              <TacticBoard 
                communityId={parseInt(communityId)} 
                socket={socket} 
                isConnected={isConnected} 
                isHost={isModerator} 
              />
            </div>
          )}
          
          {pinnedMessage && (
            <div className="pinned-message-banner bg-[#ffd54f] border-b-4 border-black p-3 px-6 flex items-center justify-between gap-4 font-archivo text-black shadow-[inset_0_-2px_0px_0px_#000] relative z-10 transition-all duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-black text-white p-1 border border-black shadow-[2px_2px_0px_0px_#ff9100]">
                  <Pin size={16} fill="currentColor" className="rotate-45" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-archivo font-bold uppercase tracking-widest text-black/60">
                    PINNED BY MODERATOR • {pinnedMessage.username}
                  </p>
                  <p className="font-poppins text-xs font-bold truncate text-black/90">
                    {pinnedMessage.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isModerator && (
                  <button
                    onClick={() => handleTogglePin(pinnedMessage.id)}
                    className="font-archivo text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-1 border border-black shadow-[2px_2px_0px_0px_#ff3b30] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#ff3b30] active:translate-y-[2px]"
                  >
                    UNPIN
                  </button>
                )}
              </div>
            </div>
          )}
          
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
                  <div className={`msg-bubble bubble-${bubbleStyle}`}>
                    {msg.is_highlighted && (
                      <div className="highlight-badge text-[var(--accent-primary)] font-archivo text-[10px] flex items-center gap-1 mb-1">
                        <Star size={10} fill="currentColor" /> HIGHLIGHTED
                      </div>
                    )}
                    {msg.is_pinned && (
                      <div className="pinned-badge text-orange-500 font-archivo text-[10px] flex items-center gap-1 mb-1">
                        <Pin size={10} fill="currentColor" /> PINNED
                      </div>
                    )}
                    <div className="msg-meta flex justify-between items-center mb-1 gap-4">
                      <span className="msg-user text-[12px] font-archivo uppercase text-black/70 font-bold">
                        {msg.username}
                      </span>
                      <div className="flex items-center gap-2">
                        {isModerator && msg.username !== 'SYSTEM' && (
                          <div className="flex items-center gap-1 border border-black/20 bg-white/50 px-1 py-0.5 shadow-[1px_1px_0px_0px_#000] mr-2">
                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              title={msg.is_pinned ? "Unpin message" : "Pin message"}
                              className={`p-0.5 text-black hover:text-orange-500 transition-colors ${msg.is_pinned ? 'text-orange-500' : 'opacity-40'}`}
                            >
                              <Pin size={10} fill={msg.is_pinned ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={() => handleToggleHighlight(msg.id)}
                              title={msg.is_highlighted ? "Remove highlight" : "Highlight message"}
                              className={`p-0.5 text-black hover:text-yellow-500 transition-colors ${msg.is_highlighted ? 'text-yellow-500' : 'opacity-40'}`}
                            >
                              <Star size={10} fill={msg.is_highlighted ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete message"
                              className="p-0.5 text-black hover:text-red-500 transition-colors opacity-40 hover:opacity-100"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                        <span className="msg-time text-[10px] font-poppins font-bold opacity-70">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                    {msg.message_type === 'sticker' ? (
                      <div className="msg-sticker-container my-3 rotate-[1deg] hover:rotate-[-1deg] transition-transform duration-200">
                        <img 
                          src={msg.media_url} 
                          alt={msg.media_description || "Sticker"} 
                          className="max-w-[180px] max-h-[180px] object-contain border-4 border-black p-3 bg-white shadow-[6px_6px_0px_0px_#000] rotate-[-1deg] hover:scale-105 transition-transform cursor-pointer"
                        />
                        {msg.media_description && (
                          <span className="font-archivo text-[9px] font-bold bg-yellow-300 border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000] block mt-2 uppercase tracking-wide w-fit">
                            {msg.media_description.replace("Sticker: ", "")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="msg-text" style={{ fontFamily: chatFont === 'bebas' ? 'var(--font-bebas)' : chatFont === 'mono' ? 'monospace' : 'var(--font-inter)' }}>
                          {msg.content}
                        </div>
                        {msg.media_url && (
                          <div className="mt-3 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                            <img src={msg.media_url} alt="" className="w-full max-h-80 object-cover" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area" style={{ position: 'relative' }}>
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
                  className="media-input-row flex items-center gap-3 bg-white border-4 border-black p-3 mb-4 shadow-[4px_4px_0_0_#000]"
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

            {/* NEUBRUTALIST STICKER & EMOJI PICKER */}
            <AnimatePresence>
              {showStickerPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] z-20 p-4 max-h-[350px] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <span className="font-archivo text-xs uppercase font-bold tracking-wider inline-flex items-center gap-2">
                      <CircleDot size={14} /> ULTRAS STICKER BOX
                    </span>
                    <button 
                      onClick={() => setShowStickerPicker(false)}
                      className="font-archivo text-[10px] uppercase font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      [CLOSE]
                    </button>
                  </div>
                  
                  {/* Emojis Section */}
                  <div className="mb-4">
                    <h5 className="font-archivo text-[10px] uppercase font-bold tracking-wider opacity-60 mb-2">QUICK REACTIONS</h5>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REACTIONS.map(({ label, text, icon: Icon, className }) => (
                        <button
                          key={label}
                          title={label}
                          onClick={() => {
                            setInputMessage(prev => prev + text);
                            document.getElementById('chat-input')?.focus();
                          }}
                          className="p-2 bg-gray-50 border-2 border-black hover:bg-yellow-200 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                        >
                          {createElement(Icon, { size: 20, className: className || '' })}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Stickers Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-archivo text-[10px] uppercase font-bold tracking-wider opacity-60">MY STICKERS</h5>
                      <button 
                        onClick={() => { setShowStickerPicker(false); navigate('/stickers/shop'); }}
                        className="font-archivo text-[9px] uppercase font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        SHOP MORE →
                      </button>
                    </div>
                    
                    {allStickers.filter(s => s.price === 0 || ownedStickerIds.includes(s.id)).length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {allStickers
                          .filter(s => s.price === 0 || ownedStickerIds.includes(s.id))
                          .map((sticker) => (
                            <button
                              key={sticker.id}
                              onClick={() => sendSticker(sticker)}
                              title={sticker.name}
                              className="p-2 bg-gray-50 border-2 border-black hover:bg-lime-100 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] flex flex-col items-center gap-1 cursor-pointer"
                            >
                              <img 
                                src={sticker.image_url} 
                                alt={sticker.name} 
                                className="w-12 h-12 object-contain"
                              />
                              <span className="font-archivo text-[8px] uppercase truncate w-full text-center">{sticker.name}</span>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 border-2 border-dashed border-black bg-gray-50">
                        <p className="font-poppins text-xs font-bold text-gray-500">No stickers unlocked yet.</p>
                        <button 
                          onClick={() => { setShowStickerPicker(false); navigate('/stickers/shop'); }}
                          className="mt-2 font-archivo text-[10px] bg-yellow-300 border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] cursor-pointer"
                        >
                          GO TO SHOP
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-wrapper">
              <button 
                onClick={() => setShowMediaInput(!showMediaInput)}
                className={`p-2 transition-colors ${showMediaInput ? 'text-[var(--accent-primary)]' : 'opacity-40'}`}
                title="Toggle Media Input"
              >
                <Paperclip size={20} />
              </button>
              <button 
                onClick={() => setShowStickerPicker(!showStickerPicker)}
                className={`p-2 transition-colors ${showStickerPicker ? 'text-yellow-500' : 'opacity-40'} hover:opacity-100`}
                title="Sticker/Emoji Picker"
              >
                <Smile size={20} />
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

                    {/* Goals & Events */}
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
                    ) : null}

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
                {members.map(member => {
                  const canModerate = isModerator && member.user_id !== currentUser.id && (actorRole === 'admin' || (actorRole === 'moderator' && member.role === 'member'));
                  const isMuted = member.muted_until && new Date(member.muted_until) > new Date();
                  return (
                    <div key={member.user_id} className="neu-box bg-white p-3 flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-black bg-[var(--accent-secondary)] flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                         <span className="text-white font-archivo">{member.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-archivo text-sm uppercase truncate font-bold">{member.username}</span>
                           {member.role === 'admin' && <Shield size={12} className="text-red-500" />}
                           {isMuted && <VolumeX size={12} className="text-orange-500" title="Muted" />}
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="font-poppins text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 border border-black px-1 py-0.5">{member.role}</span>
                           {isMuted && (
                             <span className="font-poppins text-[8px] font-bold text-red-500 bg-red-100 border border-red-500 px-1 uppercase tracking-widest">
                               MUTED
                             </span>
                           )}
                         </div>
                      </div>
                      {canModerate && (
                        <button 
                          onClick={() => setSelectedMemberForMod(member)}
                          className="p-1.5 border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition-all ml-auto shrink-0 animate-bounce"
                          title="Moderate User"
                        >
                          <Settings size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Moderation Panel Dialog */}
      {selectedMemberForMod && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative animate-scale-up">
            <button 
              className="absolute top-4 right-4 p-1 border-2 border-black bg-red-500 text-white font-bold shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px]" 
              onClick={() => setSelectedMemberForMod(null)}
            >
              <X size={16} />
            </button>
            
            <h3 className="font-bebas text-3xl border-b-4 border-black pb-2 mb-4 tracking-wider uppercase text-black">
              MODERATE {selectedMemberForMod.username}
            </h3>
            
            <div className="font-archivo text-xs space-y-2 mb-6 bg-yellow-100 border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-black"><span className="font-bold">ROLE:</span> <span className="uppercase">{selectedMemberForMod.role}</span></div>
              <div className="text-black"><span className="font-bold">WARNINGS:</span> {selectedMemberForMod.warnings_count || 0} / 3</div>
              <div className="text-black">
                <span className="font-bold">MUTED UNTIL:</span> {selectedMemberForMod.muted_until && new Date(selectedMemberForMod.muted_until) > new Date() ? new Date(selectedMemberForMod.muted_until).toLocaleString() : 'NOT MUTED'}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* WARN */}
              <div className="border-2 border-black p-3 bg-[#fffde4]">
                <h4 className="font-bebas text-lg mb-2 text-black flex items-center gap-2"><AlertTriangle size={18} /> WARN MEMBER</h4>
                <p className="font-poppins text-[10px] text-black/70 mb-2">Increments warnings. Automutes for 24h at 3 warnings.</p>
                <button 
                  onClick={() => {
                    handleWarnMember(selectedMemberForMod.user_id);
                    setSelectedMemberForMod(null);
                  }}
                  className="w-full font-archivo text-xs uppercase font-bold py-2 px-4 bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
                >
                  Issue Warning
                </button>
              </div>
              
              {/* MUTE */}
              <div className="border-2 border-black p-3 bg-[#ffebd6]">
                <h4 className="font-bebas text-lg mb-2 text-black flex items-center gap-2"><VolumeX size={18} /> MUTE MEMBER</h4>
                <div className="flex gap-2 mb-3">
                  {[10, 60, 1440].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setMuteDuration(mins)}
                      className={`flex-1 font-archivo text-[10px] py-1 border-2 border-black font-bold uppercase ${muteDuration === mins ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-black'}`}
                    >
                      {mins === 10 ? '10m' : mins === 60 ? '1h' : '24h'}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    handleMuteMember(selectedMemberForMod.user_id, muteDuration);
                    setSelectedMemberForMod(null);
                  }}
                  className="w-full font-archivo text-xs uppercase font-bold py-2 px-4 bg-orange-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
                >
                  Mute User
                </button>
              </div>
              
              {/* KICK & BAN */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-black p-3 bg-[#ffe6f2] flex flex-col justify-between">
                  <div>
                    <h4 className="font-bebas text-lg mb-1 text-black flex items-center gap-2"><Footprints size={18} /> KICK</h4>
                    <p className="font-poppins text-[9px] text-black/60 mb-2">Remove user from room.</p>
                  </div>
                  <button 
                    onClick={() => {
                      handleKickMember(selectedMemberForMod.user_id);
                      setSelectedMemberForMod(null);
                    }}
                    className="w-full font-archivo text-xs uppercase font-bold py-2 bg-pink-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
                  >
                    Kick User
                  </button>
                </div>
                
                <div className="border-2 border-black p-3 bg-[#ffe6e6] flex flex-col justify-between">
                  <div>
                    <h4 className="font-bebas text-lg mb-1 text-black flex items-center gap-2"><Ban size={18} /> BAN</h4>
                    <p className="font-poppins text-[9px] text-black/60 mb-2">Permanent ban from room.</p>
                    <input 
                      type="text"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Reason..."
                      className="w-full border-2 border-black p-1 text-[10px] mb-2 font-poppins text-black"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      handleBanMember(selectedMemberForMod.user_id, banReason);
                      setBanReason('');
                      setSelectedMemberForMod(null);
                    }}
                    className="w-full font-archivo text-xs uppercase font-bold py-2 bg-red-500 text-white border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
                  >
                    Ban User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN GOAL ALERT OVERLAY ── */}
      <AnimatePresence>
        {activeGoalAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/85 flex flex-col items-center justify-center overflow-hidden pointer-events-none"
          >
            {/* Exploding particles canvas/confetti using pure CSS/Framer Motion */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(40)].map((_, i) => {
                const randomX = (Math.random() - 0.5) * window.innerWidth;
                const randomY = (Math.random() - 0.5) * window.innerHeight;
                const scale = Math.random() * 1.5 + 0.5;
                const rotate = Math.random() * 360;
                const colors = ['#ccff00', '#ff3b30', '#3b82f6', '#10b981', '#f97316', '#c084fc'];
                const color = colors[i % colors.length];

                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                    animate={{
                      x: randomX,
                      y: randomY,
                      scale: scale,
                      opacity: [1, 1, 0],
                      rotate: rotate
                    }}
                    transition={{
                      duration: 3.5,
                      ease: 'easeOut',
                      delay: Math.random() * 0.2
                    }}
                    className="absolute w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-lg select-none font-bold"
                    style={{
                      backgroundColor: color,
                      boxShadow: '2px 2px 0 0 #000'
                    }}
                  >
                    {i % 2 === 0 ? <CircleDot size={18} /> : <Sparkles size={18} />}
                  </motion.div>
                );
              })}
            </div>

            {/* Confetti Shocks */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(30)].map((_, i) => {
                const angle = (i / 30) * Math.PI * 2;
                const distance = Math.random() * 300 + 200;
                const destX = Math.cos(angle) * distance;
                const destY = Math.sin(angle) * distance;
                return (
                  <motion.div
                    key={`conf-${i}`}
                    initial={{ x: 0, y: 0, scale: 0.1, opacity: 1 }}
                    animate={{
                      x: destX,
                      y: destY,
                      scale: Math.random() * 1.2 + 0.8,
                      opacity: [1, 1, 0]
                    }}
                    transition={{
                      duration: 3,
                      ease: 'easeOut'
                    }}
                    className="absolute w-6 h-3 border-2 border-black"
                    style={{
                      backgroundColor: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'][i % 6],
                      transform: `rotate(${Math.random() * 360}deg)`
                    }}
                  />
                );
              })}
            </div>

            {/* Bubble "GOOOOOAL!!!" */}
            <motion.div
              initial={{ scale: 0.2, rotate: -25, y: 100 }}
              animate={{
                scale: [0.2, 1.2, 0.95, 1],
                rotate: [-25, 10, -5, 3],
                y: [100, -20, 10, 0]
              }}
              exit={{ scale: 0.5, opacity: 0, y: -100 }}
              transition={{
                type: 'spring',
                damping: 10,
                stiffness: 100,
                duration: 0.8
              }}
              className="bg-[#ccff00] text-black border-8 border-black p-8 md:p-12 text-center max-w-lg shadow-[12px_12px_0_0_#000] rotate-3 relative pointer-events-auto"
            >
              {/* Extra comic flare stars */}
              <div className="absolute -top-12 -left-12 animate-bounce"><Zap size={48} fill="currentColor" /></div>
              <div className="absolute -bottom-12 -right-12 animate-bounce delay-200"><Flame size={48} fill="currentColor" /></div>

              <motion.h2
                animate={{
                  scale: [1, 1.1, 0.95, 1.05, 1],
                  rotate: [3, -3, 3, -1, 0]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: 'easeInOut'
                }}
                className="font-archivo text-7xl md:text-9xl font-black tracking-tight leading-none text-black select-none uppercase drop-shadow-[4px_4px_0_#fff]"
              >
                GOAL!!!
              </motion.h2>

              <div className="border-t-4 border-black mt-4 pt-4">
                <p className="font-archivo text-xl md:text-3xl font-black uppercase tracking-wider mb-2">
                  {activeGoalAlert.scorer.toUpperCase()}
                </p>
                <p className="font-inter font-extrabold text-xs md:text-sm text-black/60 uppercase tracking-widest bg-white border-2 border-black py-1 px-4 inline-block shadow-[3px_3px_0_0_#000]">
                  FOR {activeGoalAlert.teamName.toUpperCase()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityRoom;
