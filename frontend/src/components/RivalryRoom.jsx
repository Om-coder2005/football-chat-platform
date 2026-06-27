/* eslint-disable i18next/no-literal-string */
/* eslint-disable security/detect-object-injection */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { rivalryAPI } from '../services/api';
import { SOCKET_URL } from '../config';
import { useToast } from '../contexts/ToastContext';
import AppHeader from './AppHeader';
import { Swords, ThumbsUp, Send, Trophy, Flame, ChevronRight, User, Home, Plane, AlertTriangle, Mic, CircleDot, Sparkles, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Theme helper for major football club styling
const getClubTheme = (name = "") => {
  const lname = name.toLowerCase();
  if (lname.includes('madrid')) {
    return {
      bg: 'bg-white',
      text: 'text-black',
      accent: 'border-yellow-500 bg-yellow-50 text-black',
      primary: '#cfb53b',
      secondary: '#00529f',
      headerBg: 'bg-white text-black border-yellow-500'
    };
  }
  if (lname.includes('barcelona') || lname.includes('barca')) {
    return {
      bg: 'bg-gradient-to-br from-[#004d98] to-[#a50044]',
      text: 'text-white',
      accent: 'border-[#edbb00] bg-[#edbb00] text-black',
      primary: '#edbb00',
      secondary: '#a50044',
      headerBg: 'bg-[#a50044] text-white border-[#edbb00]'
    };
  }
  if (lname.includes('manchester united') || lname.includes('united') || lname.includes('man utd')) {
    return {
      bg: 'bg-red-700',
      text: 'text-white',
      accent: 'border-yellow-400 bg-yellow-400 text-black',
      primary: '#da291c',
      secondary: '#ffe500',
      headerBg: 'bg-red-600 text-white border-yellow-400'
    };
  }
  if (lname.includes('manchester city') || lname.includes('city') || lname.includes('man city')) {
    return {
      bg: 'bg-[#6cabdd]',
      text: 'text-black',
      accent: 'border-black bg-white text-black',
      primary: '#6cabdd',
      secondary: '#1c2c5b',
      headerBg: 'bg-[#6cabdd] text-black border-black'
    };
  }
  if (lname.includes('chelsea')) {
    return {
      bg: 'bg-[#034694]',
      text: 'text-white',
      accent: 'border-white bg-white text-black',
      primary: '#034694',
      secondary: '#ee242c',
      headerBg: 'bg-[#034694] text-white border-white'
    };
  }
  if (lname.includes('liverpool')) {
    return {
      bg: 'bg-[#c8102e]',
      text: 'text-white',
      accent: 'border-[#f6eb61] bg-[#f6eb61] text-black',
      primary: '#c8102e',
      secondary: '#f6eb61',
      headerBg: 'bg-[#c8102e] text-white border-[#f6eb61]'
    };
  }
  if (lname.includes('arsenal')) {
    return {
      bg: 'bg-[#ef0107]',
      text: 'text-white',
      accent: 'border-yellow-400 bg-white text-black',
      primary: '#ef0107',
      secondary: '#063672',
      headerBg: 'bg-[#ef0107] text-white border-yellow-400'
    };
  }
  return {
    bg: 'bg-gray-100',
    text: 'text-black',
    accent: 'border-black bg-gray-200 text-black',
    primary: '#000000',
    secondary: '#ffffff',
    headerBg: 'bg-gray-100 text-black border-black'
  };
};

const RivalryRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = localStorage.getItem('access_token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // React State
  const [roomDetails, setRoomDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeGoalAlert, setActiveGoalAlert] = useState(null);
  const [warningAlert, setWarningAlert] = useState(null);
  const [banAlert, setBanAlert] = useState(null);

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

  const [polls, setPolls] = useState([]);
  const [myAffinity, setMyAffinity] = useState(''); // 'home' | 'away'
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form inputs state
  const [chatInput, setChatInput] = useState('');
  const [userVotes, setUserVotes] = useState({}); // { poll_id: selected_option }

  // Host predictions form state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [pollDuration, setPollDuration] = useState('5');
  const [pollError, setPollError] = useState('');
  const [creatingPoll, setCreatingPoll] = useState(false);

  // References for scrolling
  const homeEndRef = useRef(null);
  const awayEndRef = useRef(null);
  const sharedEndRef = useRef(null);

  // Fetch initial room data, message history, and prediction polls
  const fetchRoomData = async () => {
    try {
      setLoading(true);
      const detailsRes = await rivalryAPI.getDetails(id);
      if (detailsRes.data && detailsRes.data.success) {
        setRoomDetails(detailsRes.data.rivalry_room);
      }
      
      const messagesRes = await rivalryAPI.getMessages(id, 50, 0);
      if (messagesRes.data && messagesRes.data.success) {
        setMessages(messagesRes.data.messages || []);
      }

      const pollsRes = await rivalryAPI.getPolls(id);
      if (pollsRes.data && pollsRes.data.success) {
        setPolls(pollsRes.data.polls || []);
      }
    } catch (err) {
      console.error("Failed to load rivalry details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [id]);

  // Handle Socket.IO connection once affinity is chosen and user joins
  useEffect(() => {
    if (!joined || !token || !id) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_rivalry', { room: id, token, team_affinity: myAffinity });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('receive_rivalry_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on('goal_alert', (data) => {
      triggerGoalAlert(data.scorer, data.team_name);
    });

    newSocket.on('rivalry_respect_updated', (data) => {
      // Update cumulative scores
      setRoomDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          home_respect_score: data.home_respect_score,
          away_respect_score: data.away_respect_score
        };
      });

      // Update specific message upvotes
      setMessages(prev => prev.map(m => {
        if (m.id === data.message_id) {
          return { ...m, respect_votes: data.respect_votes };
        }
        return m;
      }));
    });

    newSocket.on('new_prediction_poll', (data) => {
      setPolls(prev => [data, ...prev]);
    });

    newSocket.on('prediction_vote_updated', (data) => {
      setPolls(prev => prev.map(p => {
        if (p.id === data.poll_id) {
          return {
            ...p,
            votes_count: data.votes_count,
            total_votes: data.total_votes
          };
        }
        return p;
      }));
    });

    newSocket.on('warning_alert', (data) => {
      setWarningAlert(data.message);
      setTimeout(() => setWarningAlert(null), 5000);
    });

    newSocket.on('ban_alert', (data) => {
      setBanAlert(data.message);
      setTimeout(() => setBanAlert(null), 10000); // Temporary ban UI block
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_rivalry', { room: id, token, team_affinity: myAffinity });
      newSocket.disconnect();
    };
  }, [joined, id, myAffinity, token]);

  // Auto-scroll chats when new messages arrive
  useEffect(() => {
    homeEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    awayEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    sharedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter messages for split view
  const homeMessages = useMemo(() => messages.filter(m => m.team_affinity === 'home'), [messages]);
  const awayMessages = useMemo(() => messages.filter(m => m.team_affinity === 'away'), [messages]);

  // Compute clout percentage
  const totalClout = (roomDetails?.home_respect_score || 0) + (roomDetails?.away_respect_score || 0);
  const homePct = totalClout > 0 ? Math.round(((roomDetails?.home_respect_score || 0) / totalClout) * 100) : 50;
  const awayPct = totalClout > 0 ? 100 - homePct : 50;

  // Handle joining stand
  const handleJoinStand = (affinity) => {
    setMyAffinity(affinity);
    setJoined(true);
  };

  // Send banter message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !isConnected) return;

    socket.emit('send_rivalry_message', {
      room: id,
      token,
      message: chatInput.trim(),
      team_affinity: myAffinity
    });
    setChatInput('');
  };

  // BANTER UPVOTE HANDLER
  const handleBanterUpvote = (msgId) => {
    if (!socket || !isConnected) return;
    socket.emit('rivalry_respect_upvote', {
      room: id,
      token,
      message_id: msgId
    });
  };

  // Poll Vote Handler
  const handlePollVote = async (pollId, option) => {
    try {
      const res = await rivalryAPI.votePoll(pollId, option);
      if (res.data && res.data.success) {
        setUserVotes(prev => ({
          ...prev,
          [pollId]: option
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register vote.");
    }
  };

  // Host creates Prediction Poll
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    setPollError('');
    
    if (!pollQuestion || !pollOptions) {
      setPollError('Question and at least 2 comma-separated options are required.');
      return;
    }

    const optionsList = pollOptions.split(',').map(o => o.trim()).filter(Boolean);
    if (optionsList.length < 2) {
      setPollError('Please provide at least 2 comma-separated options.');
      return;
    }

    try {
      setCreatingPoll(true);
      await rivalryAPI.createPoll(id, {
        question: pollQuestion,
        options: optionsList,
        duration_minutes: parseInt(pollDuration, 10)
      });
      // Clear fields
      setPollQuestion('');
      setPollOptions('');
      setPollDuration('5');
    } catch (err) {
      setPollError(err.response?.data?.message || 'Failed to trigger prediction.');
    } finally {
      setCreatingPoll(false);
    }
  };

  // Derived themes
  const homeTheme = getClubTheme(roomDetails?.home_club_name);
  const awayTheme = getClubTheme(roomDetails?.away_club_name);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin mb-4" />
        <h2 className="neu-heading text-4xl uppercase animate-pulse ml-3">Loading Arena Gate...</h2>
      </div>
    );
  }

  // AFFINITY SELECTION SCREEN (Gate Selection)
  if (!joined) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between">
        <AppHeader />
        
        <main className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center items-center">
          <div className="neu-badge bg-red-500 text-white mb-4 border-2 border-black">
            SELECT STAND ENTRANCE
          </div>
          <h1 className="font-bebas text-5xl md:text-7xl text-center mb-8 text-black tracking-wide leading-none">
            CHOOSE YOUR STAND SIDE
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            
            {/* HOME STAND TICKET */}
            <div 
              onClick={() => handleJoinStand('home')}
              className={`neu-card border-4 border-black cursor-pointer hover:translate-y-[-6px] hover:shadow-[12px_12px_0_0_#000] transition-all flex flex-col justify-between p-8 text-center bg-white`}
            >
              <div>
                <span className="font-archivo text-xs uppercase bg-yellow-400 px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000]">
                  Home Supporters
                </span>
                <h2 className="font-bebas text-4xl md:text-5xl mt-4 text-black uppercase leading-none">
                  {roomDetails?.home_club_name} Stand
                </h2>
                <p className="font-medium text-gray-600 mt-4 text-sm">
                  Stand with the hosts, chant for {roomDetails?.home_club_name}, and prove you own the home grass!
                </p>
              </div>
              <button className="neu-button bg-yellow-400 text-black border-3 border-black w-full mt-8 py-2 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-1">
                <Swords size={16} /> Enter Gate A (Home)
              </button>
            </div>

            {/* AWAY STAND TICKET */}
            <div 
              onClick={() => handleJoinStand('away')}
              className={`neu-card border-4 border-black cursor-pointer hover:translate-y-[-6px] hover:shadow-[12px_12px_0_0_#000] transition-all flex flex-col justify-between p-8 text-center bg-black text-white`}
            >
              <div>
                <span className="font-archivo text-xs uppercase bg-red-500 text-white px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000]">
                  Away Supporters
                </span>
                <h2 className="font-bebas text-4xl md:text-5xl mt-4 text-white uppercase leading-none">
                  {roomDetails?.away_club_name} Stand
                </h2>
                <p className="font-medium text-red-100 mt-4 text-sm opacity-90">
                  Crash the stadium gates, shout down the hosts, and conquer the points on the road!
                </p>
              </div>
              <button className="neu-button bg-red-500 text-white border-3 border-black w-full mt-8 py-2 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-1">
                <Swords size={16} /> Enter Gate B (Away)
              </button>
            </div>

          </div>

          <p className="text-xs font-archivo uppercase text-gray-500 mt-10">
            Clicking enters the room. Banter responsibly. Respect other fans' quality banter!
          </p>
        </main>
      </div>
    );
  }

  // ACTIVE MATCHDAY DUAL SPLIT-SCREEN CHAT
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col h-screen overflow-hidden">
      <AppHeader />

      {/* Flagship Dynamic Scoreboard Header */}
      <div className="bg-white border-b-4 border-black px-4 py-2 shrink-0 shadow-[0_4px_0_0_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Club Info Left */}
          <div className="flex items-center gap-2">
            <span className="font-archivo text-[10px] bg-yellow-400 px-1 border border-black uppercase font-bold text-black">Home</span>
            <span className="font-bebas text-2xl text-black uppercase tracking-wider">{roomDetails?.home_club_name}</span>
          </div>

          {/* Clout Scoreboard Comparative Sliding Progress Meter */}
          <div className="flex-1 w-full max-w-xl mx-2 flex flex-col items-center">
            <div className="flex justify-between w-full font-archivo text-[10px] uppercase text-black font-bold mb-1">
              <span>Home Clout: {roomDetails?.home_respect_score}</span>
              <span className="text-gray-500 font-medium">Banter Respect Meter</span>
              <span>{roomDetails?.away_respect_score} :Away Clout</span>
            </div>
            
            {/* Neubrutalist animated sliding meter */}
            <div className="w-full h-8 border-4 border-black flex overflow-hidden bg-gray-200">
              <div 
                className="bg-yellow-400 flex items-center justify-start pl-3 font-archivo text-black font-bold border-r-2 border-black transition-all duration-500 shrink-0" 
                style={{ width: `${homePct}%` }}
              >
                {homePct > 15 && `${homePct}%`}
              </div>
              <div 
                className="bg-black flex items-center justify-end pr-3 font-archivo text-white font-bold transition-all duration-500 shrink-0" 
                style={{ width: `${awayPct}%` }}
              >
                {awayPct > 15 && `${awayPct}%`}
              </div>
            </div>
          </div>

          {/* Club Info Right */}
          <div className="flex items-center gap-2">
            <span className="font-bebas text-2xl text-black uppercase tracking-wider">{roomDetails?.away_club_name}</span>
            <span className="font-archivo text-[10px] bg-black text-white px-1 border border-black uppercase font-bold">Away</span>
          </div>

        </div>
      </div>

      {/* Main Split Grid Section */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-[var(--bg-primary)]">
        
        {/* ========================================================
            LEFT COLUMN: HOME SUPPORTERS STAND (4 cols)
            ======================================================== */}
        <section className={`col-span-1 md:col-span-4 flex flex-col border-4 border-black bg-white shadow-[4px_4px_0_0_#000] min-h-0 overflow-hidden`}>
          <div className="bg-yellow-400 text-black border-b-4 border-black p-3 flex items-center justify-between shrink-0">
            <span className="font-bebas text-xl md:text-2xl tracking-wider uppercase">
              <span className="inline-flex items-center gap-2"><Home size={22} /> {roomDetails?.home_club_name} Stand</span>
            </span>
            <span className="font-archivo text-[10px] border border-black bg-white px-1 uppercase font-bold text-black">
              {homeMessages.length} messages
            </span>
          </div>

          {/* Messages stream viewport */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-yellow-50/20">
            {homeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                <Flame size={32} className="text-gray-400 mb-2" />
                <p className="font-archivo text-[10px] uppercase">Silence in the home stand. Kick off the chant!</p>
              </div>
            ) : (
              homeMessages.map((msg) => (
                <div key={msg.id} className="border-2 border-black p-2 bg-white shadow-[2px_2px_0_0_#000] relative">
                  <div className="flex justify-between items-center text-[10px] font-archivo uppercase mb-1 border-b border-gray-100 pb-0.5">
                    <span className="font-bold text-black flex items-center gap-1"><User size={10} /> {msg.username}</span>
                    <span className="text-gray-400 font-poppins">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="font-medium text-xs break-words text-black pr-12">
                    {msg.content.startsWith('[COPILOT]') ? (
                      <span className="flex flex-col gap-1">
                        <span className="font-bebas text-[10px] text-purple-600 tracking-wider">⚡ AI COPILOT</span>
                        <span className="text-purple-900 bg-purple-50 p-1 border-l-2 border-purple-500">{msg.content.replace('[COPILOT] ', '')}</span>
                      </span>
                    ) : (
                      msg.content
                    )}
                  </p>
                  
                  {/* Banter thumbs respect count */}
                  <div className="absolute right-1 bottom-1">
                    <button 
                      onClick={() => handleBanterUpvote(msg.id)}
                      className="font-archivo text-[10px] bg-yellow-100 hover:bg-yellow-200 text-black border-2 border-black px-1.5 py-0.5 flex items-center gap-0.5 shadow-[1px_1px_0_0_#000]"
                    >
                      <ThumbsUp size={10} /> {msg.respect_votes || 0}
                    </button>
                  </div>
                </div>
              ))
            )}
            <div ref={homeEndRef} />
          </div>

          {/* Input text box - enabled if affinity is home */}
          <div className="border-t-4 border-black p-3 bg-gray-50 shrink-0">
            {myAffinity === 'home' ? (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-archivo text-gray-500 uppercase">Tip: Use <span className="font-bold text-black bg-yellow-200 px-1">/banter</span> or <span className="font-bold text-black bg-yellow-200 px-1">/stat</span> for AI Copilot</span>
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Chant for ${roomDetails?.home_club_name}...`}
                    className="neu-input flex-1 py-2 text-xs"
                  />
                  <button type="submit" className="neu-button bg-black text-white py-1 px-3 border-2 border-black text-xs shrink-0 flex items-center gap-1 shadow-[2px_2px_0_0_#000]">
                    <Send size={12} /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center font-archivo text-[10px] uppercase text-gray-500 py-2 border border-dashed border-gray-300">
                <span className="inline-flex items-center justify-center gap-2"><AlertTriangle size={14} /> Standing in Away sector. Switch stand to chat.</span>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================
            CENTER COLUMN: SHARED BANTER TICKER & TIMED POLLS (4 cols)
            ======================================================== */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          
          {/* Timed prediction polls card */}
          <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_#000] p-4 shrink-0 overflow-y-auto max-h-[45%] flex flex-col">
            <h3 className="font-bebas text-2xl border-b-4 border-black pb-2 mb-3 text-black flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><Clock size={20} /> Timed predictions</span>
              <span className="font-archivo text-[9px] bg-red-500 text-white px-1 uppercase tracking-wide">
                {polls.some(p => p.is_active && new Date(p.expires_at).getTime() > Date.now()) ? 'Active' : 'No active polls'}
              </span>
            </h3>

            {/* Polls Active View */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {polls.length === 0 ? (
                <div className="text-center py-6 text-gray-400 font-archivo text-[10px] uppercase">
                  No prediction rounds triggered yet.
                </div>
              ) : (
                polls.map(p => (
                  <CountdownPoll 
                    key={p.id} 
                    poll={p} 
                    onVote={handlePollVote} 
                    userVotes={userVotes} 
                  />
                ))
              )}
            </div>

            {/* QUICK HOST TRIGGER FORM */}
            <div className="border-t-3 border-black pt-3 mt-3">
              <h4 className="font-archivo text-[10px] uppercase font-bold tracking-widest text-black mb-2">
                <span className="inline-flex items-center gap-2"><Mic size={14} /> Host Prediction poll Trigger</span>
              </h4>
              {pollError && <div className="text-[10px] text-red-600 font-bold mb-2">{pollError}</div>}
              <form onSubmit={handleCreatePoll} className="space-y-2">
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Prediction (e.g. Will there be a goal in next 10m?)"
                  className="neu-input py-1.5 px-2 text-[11px] font-medium"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pollOptions}
                    onChange={(e) => setPollOptions(e.target.value)}
                    placeholder="Options (e.g. Yes, No, Draw)"
                    className="neu-input py-1.5 px-2 text-[11px] font-medium flex-1"
                    required
                  />
                  <select
                    value={pollDuration}
                    onChange={(e) => setPollDuration(e.target.value)}
                    className="neu-input py-1.5 px-1 text-[11px] font-medium w-16"
                  >
                    <option value="1">1m</option>
                    <option value="3">3m</option>
                    <option value="5">5m</option>
                    <option value="10">10m</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingPoll}
                  className="neu-button-secondary w-full py-1 text-[10px] font-bold text-center bg-black text-white uppercase cursor-pointer"
                >
                  {creatingPoll ? 'Launching Poll...' : 'Publish prediction round'}
                </button>
              </form>
            </div>
          </div>

          {/* Shared Realtime Banter Chronological ticker */}
          <div className="flex-1 border-4 border-black bg-white shadow-[4px_4px_0_0_#000] p-4 flex flex-col min-h-0">
            <h3 className="font-bebas text-2xl border-b-4 border-black pb-2 mb-3 text-black">
              <span className="inline-flex items-center gap-2"><Flame size={22} /> Shared Arena Banter Flow</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-10">
                  <Swords size={32} className="text-gray-400 mb-2" />
                  <p className="font-archivo text-[10px] uppercase">Awaiting clash... Chant something!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isHome = msg.team_affinity === 'home';
                  const bubbleColor = isHome 
                    ? 'border-yellow-500 bg-yellow-50/50 text-black' 
                    : 'border-red-500 bg-red-50/50 text-black';

                  return (
                    <div 
                      key={msg.id} 
                      className={`border-2 p-2 shadow-[2px_2px_0_0_#000] relative ${bubbleColor}`}
                    >
                      <div className="flex justify-between items-center text-[9px] font-archivo uppercase mb-1 border-b border-gray-100 pb-0.5">
                        <span className="font-bold flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${isHome ? 'bg-yellow-400' : 'bg-black'}`} />
                          {msg.username} ({isHome ? 'Home' : 'Away'})
                        </span>
                        <span className="text-gray-400 font-poppins">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="font-medium text-xs break-words text-black pr-12">
                    {msg.content.startsWith('[COPILOT]') ? (
                      <span className="flex flex-col gap-1">
                        <span className="font-bebas text-[10px] text-purple-600 tracking-wider">⚡ AI COPILOT</span>
                        <span className="text-purple-900 bg-purple-50 p-1 border-l-2 border-purple-500">{msg.content.replace('[COPILOT] ', '')}</span>
                      </span>
                    ) : (
                      msg.content
                    )}
                  </p>
                      
                      {/* Upvote controls next to bubbles - UPVOTING OPPONENT CLOUT */}
                      <div className="absolute right-1 bottom-1">
                        <button 
                          onClick={() => handleBanterUpvote(msg.id)}
                          className="font-archivo text-[9px] bg-white hover:bg-gray-100 text-black border border-black px-1 py-0.5 flex items-center gap-0.5 shadow-[1px_1px_0_0_#000]"
                          title="Respect: Upvotes opposing/quality banter clout points"
                        >
                          <ThumbsUp size={8} /> Respect {msg.respect_votes || 0}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={sharedEndRef} />
            </div>
          </div>
        </section>

        {/* ========================================================
            RIGHT COLUMN: AWAY SUPPORTERS STAND (4 cols)
            ======================================================== */}
        <section className={`col-span-1 md:col-span-4 flex flex-col border-4 border-black bg-black shadow-[4px_4px_0_0_#000] min-h-0 overflow-hidden`}>
          <div className="bg-red-600 text-white border-b-4 border-black p-3 flex items-center justify-between shrink-0">
            <span className="font-bebas text-xl md:text-2xl tracking-wider uppercase text-white">
              <span className="inline-flex items-center gap-2"><Plane size={22} /> {roomDetails?.away_club_name} Stand</span>
            </span>
            <span className="font-archivo text-[10px] border border-black bg-white px-1 uppercase font-bold text-black">
              {awayMessages.length} messages
            </span>
          </div>

          {/* Messages stream viewport */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-red-950/20">
            {awayMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center py-20">
                <Flame size={32} className="text-red-300 mb-2" />
                <p className="font-archivo text-[10px] uppercase text-red-100">Silence in the away stand. Bring the noise!</p>
              </div>
            ) : (
              awayMessages.map((msg) => (
                <div key={msg.id} className="border-2 border-black p-2 bg-white shadow-[2px_2px_0_0_#000] relative">
                  <div className="flex justify-between items-center text-[10px] font-archivo uppercase mb-1 border-b border-gray-100 pb-0.5 text-black">
                    <span className="font-bold text-black flex items-center gap-1"><User size={10} /> {msg.username}</span>
                    <span className="text-gray-400 font-poppins">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="font-medium text-xs break-words text-black pr-12">
                    {msg.content.startsWith('[COPILOT]') ? (
                      <span className="flex flex-col gap-1">
                        <span className="font-bebas text-[10px] text-purple-600 tracking-wider">⚡ AI COPILOT</span>
                        <span className="text-purple-900 bg-purple-50 p-1 border-l-2 border-purple-500">{msg.content.replace('[COPILOT] ', '')}</span>
                      </span>
                    ) : (
                      msg.content
                    )}
                  </p>
                  
                  {/* Banter thumbs respect count */}
                  <div className="absolute right-1 bottom-1">
                    <button 
                      onClick={() => handleBanterUpvote(msg.id)}
                      className="font-archivo text-[10px] bg-red-100 hover:bg-red-200 text-black border-2 border-black px-1.5 py-0.5 flex items-center gap-0.5 shadow-[1px_1px_0_0_#000]"
                    >
                      <ThumbsUp size={10} /> {msg.respect_votes || 0}
                    </button>
                  </div>
                </div>
              ))
            )}
            <div ref={awayEndRef} />
          </div>

          {/* Input text box - enabled if affinity is away */}
          <div className="border-t-4 border-black p-3 bg-neutral-900 shrink-0">
            {myAffinity === 'away' ? (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-archivo text-gray-500 uppercase">Tip: Use <span className="font-bold text-black bg-yellow-200 px-1">/banter</span> or <span className="font-bold text-black bg-yellow-200 px-1">/stat</span> for AI Copilot</span>
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Chant for ${roomDetails?.away_club_name}...`}
                    className="neu-input flex-1 py-2 text-xs bg-white text-black"
                  />
                  <button type="submit" className="neu-button bg-red-600 text-white py-1 px-3 border-2 border-black text-xs shrink-0 flex items-center gap-1 shadow-[2px_2px_0_0_#000]">
                    <Send size={12} /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center font-archivo text-[10px] uppercase text-neutral-500 py-2 border border-dashed border-neutral-700">
                <span className="inline-flex items-center justify-center gap-2"><AlertTriangle size={14} /> Standing in Home sector. Switch stand to chat.</span>
              </div>
            )}
          </div>
        </section>

      </div>

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

        {/* ── YELLOW CARD WARNING OVERLAY ── */}
        {warningAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-400 border-4 border-black p-4 shadow-[8px_8px_0_0_#000] flex items-center gap-4 max-w-sm"
          >
            <div className="w-12 h-16 bg-yellow-500 border-2 border-black rounded-sm shadow-inner shrink-0" />
            <div>
              <h2 className="font-bebas text-2xl uppercase leading-none">Respect Filter</h2>
              <p className="font-archivo text-xs mt-1 font-bold">{warningAlert}</p>
            </div>
          </motion.div>
        )}

        {/* ── RED CARD BAN OVERLAY ── */}
        {banAlert && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div 
              animate={{ rotate: [-5, 5, -5] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-32 h-44 bg-red-600 border-4 border-white rounded-sm shadow-[0_0_50px_rgba(220,38,38,0.5)] mb-6"
            />
            <h1 className="font-bebas text-6xl text-red-500 tracking-wider">SENT OFF</h1>
            <p className="font-archivo text-white text-lg mt-2 max-w-md text-center">{banAlert}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// COUNTDOWN POLL CARD COMPONENT
const CountdownPoll = ({ poll, onVote, userVotes }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const updateTime = () => {
      const exp = new Date(poll.expires_at).getTime();
      const diff = exp - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  // Default duration calculation helper
  const totalDuration = 5 * 60 * 1000;
  const pct = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));
  
  const formattedTime = () => {
    const seconds = Math.floor(timeLeft / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hasVoted = userVotes[poll.id] !== undefined;

  return (
    <div className="border-2 border-black p-3 bg-gray-50 shadow-[2px_2px_0_0_#000] relative">
      <div className="flex justify-between items-center mb-1">
        <span className="font-archivo text-[8px] bg-red-500 text-white border border-black px-1 uppercase font-bold shrink-0">
          {timeLeft > 0 ? 'Active timed prediction' : 'Expired prediction'}
        </span>
        {timeLeft > 0 && (
          <span className="font-archivo text-[10px] text-black font-bold shrink-0">
            <span className="inline-flex items-center gap-1"><Clock size={12} /> {formattedTime()}</span>
          </span>
        )}
      </div>
      
      <p className="font-archivo text-xs mb-2 text-black leading-tight">{poll.question}</p>
      
      {/* Timed countdown animated progress bar */}
      {timeLeft > 0 && (
        <div className="w-full h-1.5 border border-black bg-gray-200 mb-2 overflow-hidden">
          <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Options & Breakdown fills */}
      <div className="space-y-1">
        {poll.options.map((opt) => {
          const votesCount = poll.votes_count || {};
          const count = votesCount[opt] || 0;
          const total = poll.total_votes || 0;
          const pctVal = total > 0 ? Math.round((count / total) * 100) : 0;
          
          if (hasVoted || timeLeft <= 0) {
            return (
              <div key={opt} className="relative border border-black p-1.5 bg-white flex flex-col justify-center overflow-hidden">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-yellow-200 transition-all duration-500 pointer-events-none"
                  style={{ width: `${pctVal}%`, zIndex: 0 }}
                />
                <div className="flex justify-between items-center text-[10px] font-archivo uppercase relative z-10 text-black font-bold">
                  <span>{opt} {userVotes[poll.id] === opt && <strong className="text-emerald-700">(Your Vote)</strong>}</span>
                  <span>{pctVal}% ({count})</span>
                </div>
              </div>
            );
          }
          
          return (
            <button
              key={opt}
              onClick={() => onVote(poll.id, opt)}
              className="w-full text-left font-archivo text-[10px] uppercase p-1.5 border border-black bg-white text-black hover:bg-yellow-50 shadow-[1px_1px_0_0_#000] active:translate-y-[1px] active:shadow-none cursor-pointer"
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RivalryRoom;
