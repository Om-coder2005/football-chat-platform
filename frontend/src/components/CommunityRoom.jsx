import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { messageAPI, communityAPI, matchAPI } from '../services/api';
import AppHeader from './AppHeader';
import '../styles/CommunityRoom.css';

const CommunityRoom = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [community, setCommunity] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'members'
  const [matchData, setMatchData] = useState(null);
  const [matchSource, setMatchSource] = useState('none');
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('access_token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Handle Authentication and Data Fetching
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCommunityAndMessages();
    fetchAllCommunities();
  }, [communityId]);

  // Fetch match data
  useEffect(() => {
    if (community) {
      fetchMatchData();
    }
  }, [community]);

  // Handle Socket Lifecycle
  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'], // More robust for real-time
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

    newSocket.on('error', (data) => {
      alert(data.message);
      if (data.message.includes('join')) navigate('/communities');
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

  /**
   * Fetch all available communities for the sidebar navigation
   */
  const fetchAllCommunities = async () => {
    try {
      const response = await communityAPI.getAll();
      setCommunities(response.data.communities || []);
    } catch (_error) {
      // Silently handle - sidebar will show empty
    }
  };

  const fetchCommunityAndMessages = async () => {
    try {
      const commResponse = await communityAPI.getAll();
      const comm = commResponse.data.communities.find((c) => c.id === parseInt(communityId));
      setCommunity(comm);

      const msgResponse = await messageAPI.getHistory(communityId, 50, 0);
      if (msgResponse.data.success) {
        setMessages(msgResponse.data.messages);
      }
    } catch (error) {
      if (error.response?.status === 403) navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch match data specific to the community's club.
   * Uses the community's club_name to find matches for that team today,
   * falling back to the team's closest recent/upcoming match.
   * Then fetches the full match details (including statistics, lineups, bookings)
   * from the single-match endpoint.
   */
  const fetchMatchData = async () => {
    const clubName = community?.club_name || community?.name || '';

    if (!clubName) {
      setMatchData(null);
      return;
    }

    try {
      const response = await matchAPI.getTeamMatchesByName(clubName);

      if (response.data.success && response.data.matches && response.data.matches.length > 0) {
        const summaryMatch = response.data.matches[0];
        setMatchSource(response.data.source || 'today');

        // Fetch full match details (with statistics, lineups, bookings, etc.)
        if (summaryMatch.id) {
          try {
            const detailRes = await matchAPI.getMatchDetails(summaryMatch.id);
            if (detailRes.data.success && detailRes.data.match) {
              setMatchData(detailRes.data.match);
              return;
            }
          } catch (_detailErr) {
            // Fall through to summary data if detail fetch fails
          }
        }

        setMatchData(summaryMatch);
        return;
      }
    } catch (_error) {
      // Silently fall through to placeholder when API is unreachable
    }

    // Fallback: show "no match" placeholder for the community's team
    setMatchData({
      competition: { name: '' },
      matchday: null,
      score: { fullTime: { home: null, away: null } },
      homeTeam: { name: clubName, id: 0 },
      awayTeam: { name: 'No match today', id: 0 },
      status: 'SCHEDULED'
    });
    setMatchSource('none');
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    socket.emit('send_message', {
      room: communityId,
      message: inputMessage.trim(),
      token,
    });
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMatchDate = (utcDate) => {
    if (!utcDate) return '';
    const d = new Date(utcDate);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Extract real stats from football-data.org v4 match response.
   * The API provides homeTeam.statistics and awayTeam.statistics
   * with fields like ball_possession, shots, corner_kicks, yellow_cards, red_cards.
   * Falls back to 0 if data is missing (e.g. match hasn't started yet).
   */
  const getMatchStats = () => {
    if (!matchData) return null;

    const homeStat = matchData.homeTeam?.statistics;
    const awayStat = matchData.awayTeam?.statistics;

    // If the API returned embedded statistics objects, use them
    if (homeStat && awayStat) {
      return {
        possession: { home: homeStat.ball_possession || 0, away: awayStat.ball_possession || 0 },
        totalShots: { home: homeStat.total_shots || homeStat.shots || 0, away: awayStat.total_shots || awayStat.shots || 0 },
        shotsOnTarget: { home: homeStat.shots_on_target || homeStat.shots_on_goal || 0, away: awayStat.shots_on_target || awayStat.shots_on_goal || 0 },
        corners: { home: homeStat.corner_kicks || 0, away: awayStat.corner_kicks || 0 },
        fouls: { home: homeStat.fouls || 0, away: awayStat.fouls || 0 },
        saves: { home: homeStat.saves || 0, away: awayStat.saves || 0 },
        offsides: { home: homeStat.offsides || 0, away: awayStat.offsides || 0 },
        yellowCards: { home: homeStat.yellow_cards || 0, away: awayStat.yellow_cards || 0 },
        redCards: { home: homeStat.red_cards || 0, away: awayStat.red_cards || 0 },
      };
    }

    // No stats available yet (match not started or free tier doesn't include stats)
    return null;
  };

  const matchStats = getMatchStats();

  /**
   * Get the match status label for display
   */
  const getStatusLabel = (status) => {
    const statusMap = {
      'SCHEDULED': 'Scheduled',
      'TIMED': 'Upcoming',
      'IN_PLAY': 'LIVE',
      'PAUSED': 'Half Time',
      'FINISHED': 'Full Time',
      'SUSPENDED': 'Suspended',
      'POSTPONED': 'Postponed',
      'CANCELLED': 'Cancelled',
      'AWARDED': 'Awarded',
    };
    return statusMap[status] || status || '';
  };

  const isMatchLive = matchData?.status === 'IN_PLAY' || matchData?.status === 'PAUSED' || matchData?.status === 'LIVE';

  /**
   * Get a human-readable label for the match source
   * @returns {string} Source label like "Today", "Last Match", etc.
   */
  const getSourceLabel = () => {
    if (matchSource === 'live') return 'LIVE NOW';
    if (matchSource === 'today' || matchSource === 'team_today') return "TODAY'S MATCH";
    if (matchSource === 'closest') {
      if (!matchData?.utcDate) return 'NEAREST MATCH';
      const matchDate = new Date(matchData.utcDate);
      const now = new Date();
      return matchDate > now ? 'NEXT MATCH' : 'LAST RESULT';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="chat-view-wrapper">
        <AppHeader />
        <div className="loading-screen" aria-live="polite">Initializing…</div>
      </div>
    );
  }

  return (
    <div className="chat-view-wrapper">
      <AppHeader />
      <div className="chat-room-layout">
        {/* Left Sidebar - Channels/Teams */}
        <aside className="chat-sidebar-left">
          <div className="sidebar-header">
            <div className="app-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            {isConnected && <span className="status-dot" aria-label="Online" />}
          </div>
          
          <div className="channels-list">
            {communities.slice(0, 4).map((comm) => (
              <button
                key={comm.id}
                className={`channel-item ${comm.id === parseInt(communityId) ? 'active' : ''}`}
                onClick={() => navigate(`/community/${comm.id}`)}
                aria-label={`${comm.name} channel`}
              >
                <div className="channel-logo">
                  {comm.club_name ? (
                    <span className="channel-logo-text">{comm.club_name.charAt(0)}</span>
                  ) : (
                    <span className="channel-logo-text">{comm.name.charAt(0)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button className="add-channel-btn" aria-label="Add new channel">
            <span>+</span>
          </button>

          <button className="user-profile-btn" aria-label="User profile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </aside>

        {/* Center - Chat Area */}
        <main className="chat-main-area">
          <div className="chat-header-bar">
            <div className="chat-header-line" />
          </div>
          
          <div className="messages-viewport">
            {messages.length === 0 ? (
              <div className="empty-chat-placeholder">
                <p>Pitch is empty. Start the play! ⚽</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`msg-row ${msg.user_id === currentUser.id ? 'msg-own' : 'msg-other'}`}
                >
                  <div className="msg-bubble">
                    <div className="msg-meta">
                      <span className="msg-user">{msg.username}</span>
                      <span className="msg-time">{formatTime(msg.created_at)}</span>
                    </div>
                    <div className="msg-text">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <div className="input-wrapper">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Send a message…" : "Waiting for connection…"}
                disabled={!isConnected}
              />
              <button 
                className="send-trigger" 
                onClick={sendMessage} 
                disabled={!isConnected || !inputMessage.trim()}
              >
                SEND
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Match Stats */}
        <aside className="chat-sidebar-right">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              MATCH STATS
            </button>
            <button
              className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              MEMBERS
            </button>
          </div>

          {activeTab === 'stats' && (
            <div className="match-stats-content">
              {matchData ? (
                <>
                  {/* Source badge & Competition */}
                  {getSourceLabel() && (
                    <div className="match-source-badge">
                      <span className={`source-label ${matchSource === 'live' ? 'source-live' : ''}`}>
                        {getSourceLabel()}
                      </span>
                    </div>
                  )}
                  <div className="match-header">
                    <span className="match-league">
                      {matchData.competition?.name || ''}
                    </span>
                    {matchData.matchday && (
                      <span className="match-matchday">MATCHDAY {matchData.matchday}</span>
                    )}
                  </div>

                  {/* Scoreboard */}
                  <div className="match-scoreboard">
                    <div className="scoreboard-team">
                      {matchData.homeTeam?.crest ? (
                        <img src={matchData.homeTeam.crest} alt="" className="scoreboard-crest" />
                      ) : (
                        <div className="scoreboard-crest-placeholder">
                          {(matchData.homeTeam?.tla || matchData.homeTeam?.name?.charAt(0) || 'H')}
                        </div>
                      )}
                      <span className="scoreboard-team-name">
                        {matchData.homeTeam?.shortName || matchData.homeTeam?.name || 'Home'}
                      </span>
                    </div>

                    <div className="scoreboard-score-area">
                      <span className={`scoreboard-status ${isMatchLive ? 'live' : ''}`}>
                        {isMatchLive && <span className="live-pulse" />}
                        {getStatusLabel(matchData.status)}
                        {matchData.minute ? ` ${matchData.minute}'` : ''}
                      </span>
                      <span className="scoreboard-score">
                        {matchData.score?.fullTime?.home ?? '-'} - {matchData.score?.fullTime?.away ?? '-'}
                      </span>
                      {matchData.score?.halfTime?.home != null && (
                        <span className="scoreboard-halftime">
                          HT: {matchData.score.halfTime.home} - {matchData.score.halfTime.away}
                        </span>
                      )}
                      {matchData.utcDate && (
                        <span className="scoreboard-date">{formatMatchDate(matchData.utcDate)}</span>
                      )}
                    </div>

                    <div className="scoreboard-team">
                      {matchData.awayTeam?.crest ? (
                        <img src={matchData.awayTeam.crest} alt="" className="scoreboard-crest" />
                      ) : (
                        <div className="scoreboard-crest-placeholder">
                          {(matchData.awayTeam?.tla || matchData.awayTeam?.name?.charAt(0) || 'A')}
                        </div>
                      )}
                      <span className="scoreboard-team-name">
                        {matchData.awayTeam?.shortName || matchData.awayTeam?.name || 'Away'}
                      </span>
                    </div>
                  </div>

                  {/* Goals */}
                  {matchData.goals && matchData.goals.length > 0 && (
                    <div className="goals-section">
                      <h3 className="stats-title">GOALS</h3>
                      {matchData.goals.map((goal, i) => (
                        <div key={i} className="goal-event">
                          <span className="goal-minute">{goal.minute}'</span>
                          <span className="goal-scorer">{goal.scorer?.name || 'Unknown'}</span>
                          <span className="goal-type">
                            {goal.type === 'PENALTY' ? '(P)' : goal.type === 'OWN' ? '(OG)' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats bars */}
                  {matchStats ? (
                    <div className="stats-section">
                      <h3 className="stats-title">STATS</h3>
                      {[
                        { label: 'Possession', home: matchStats.possession.home, away: matchStats.possession.away, suffix: '%', isPct: true },
                        { label: 'Total Shots', home: matchStats.totalShots.home, away: matchStats.totalShots.away },
                        { label: 'On Target', home: matchStats.shotsOnTarget.home, away: matchStats.shotsOnTarget.away },
                        { label: 'Corners', home: matchStats.corners.home, away: matchStats.corners.away },
                        { label: 'Fouls', home: matchStats.fouls.home, away: matchStats.fouls.away },
                        { label: 'Saves', home: matchStats.saves.home, away: matchStats.saves.away },
                        { label: 'Offsides', home: matchStats.offsides.home, away: matchStats.offsides.away },
                        { label: 'Yellow Cards', home: matchStats.yellowCards.home, away: matchStats.yellowCards.away },
                        { label: 'Red Cards', home: matchStats.redCards.home, away: matchStats.redCards.away },
                      ].map((stat) => {
                        const total = stat.home + stat.away || 1;
                        const leftPct = stat.isPct ? stat.home : (stat.home / total) * 100;
                        const rightPct = stat.isPct ? stat.away : (stat.away / total) * 100;
                        return (
                          <div key={stat.label} className="stat-item">
                            <div className="stat-bar">
                              <div className="stat-bar-left" style={{ width: `${leftPct}%` }}>
                                <span className="stat-value">{stat.home}{stat.suffix || ''}</span>
                              </div>
                              <span className="stat-label">{stat.label}</span>
                              <div className="stat-bar-right" style={{ width: `${rightPct}%` }}>
                                <span className="stat-value">{stat.away}{stat.suffix || ''}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="stats-section">
                      <h3 className="stats-title">STATS</h3>
                      <p className="no-stats-msg">
                        {matchData.status === 'SCHEDULED' || matchData.status === 'TIMED'
                          ? 'Stats will be available once the match kicks off'
                          : matchData.status === 'FINISHED'
                            ? 'Detailed stats not available for this match'
                            : 'No stats available'}
                      </p>
                    </div>
                  )}

                  {/* Starting XI */}
                  {(matchData.homeTeam?.lineup?.length > 0 || matchData.awayTeam?.lineup?.length > 0) && (
                    <div className="starting-xi-section">
                      <h3 className="stats-title">
                        STARTING XI
                        {matchData._ai_enriched && (
                          <span className="ai-badge-sm">AI</span>
                        )}
                      </h3>
                      <div className="lineup-columns">
                        <div className="lineup-col">
                          <span className="lineup-team-label">
                            {matchData.homeTeam?.shortName || matchData.homeTeam?.name || 'Home'}
                            {matchData.homeTeam?.formation && ` (${matchData.homeTeam.formation})`}
                          </span>
                          {matchData.homeTeam?.lineup?.map((p, i) => (
                            <div key={i} className="lineup-player">
                              <span className="lineup-number">{p.shirtNumber || ''}</span>
                              <span className="lineup-name">{p.name}</span>
                            </div>
                          ))}
                          {matchData.homeTeam?.coach?.name && (
                            <div className="lineup-coach">
                              Coach: {matchData.homeTeam.coach.name}
                            </div>
                          )}
                        </div>
                        <div className="lineup-col">
                          <span className="lineup-team-label">
                            {matchData.awayTeam?.shortName || matchData.awayTeam?.name || 'Away'}
                            {matchData.awayTeam?.formation && ` (${matchData.awayTeam.formation})`}
                          </span>
                          {matchData.awayTeam?.lineup?.map((p, i) => (
                            <div key={i} className="lineup-player">
                              <span className="lineup-number">{p.shirtNumber || ''}</span>
                              <span className="lineup-name">{p.name}</span>
                            </div>
                          ))}
                          {matchData.awayTeam?.coach?.name && (
                            <div className="lineup-coach">
                              Coach: {matchData.awayTeam.coach.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Referees */}
                  {matchData.referees && matchData.referees.length > 0 && (
                    <div className="referees-section">
                      <h3 className="stats-title">REFEREE</h3>
                      <span className="referee-name">
                        {matchData.referees.find(r => r.type === 'REFEREE')?.name || matchData.referees[0]?.name}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-stats-msg">Loading match data...</p>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="members-content">
              <div className="members-header">
                <span className="members-count">{community?.member_count || 0} members</span>
              </div>
              <p className="members-placeholder">Member list coming soon</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CommunityRoom;