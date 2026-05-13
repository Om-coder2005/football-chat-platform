import os

header_jsx = """import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { matchAPI } from '../services/api';

const MATCH_REFRESH_INTERVAL = 60_000;
const MATCH_CYCLE_INTERVAL = 8_000;

const formatDateParam = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getCurrentTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getMatchMinute = (match) => {
  if (match.status === 'PAUSED') return 'HT';
  if (match.status !== 'IN_PLAY') return null;
  if (!match.utcDate) return 'LIVE';
  const kickoff = new Date(match.utcDate).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - kickoff) / 60_000);
  if (elapsed <= 0) return 'LIVE';
  if (elapsed > 45 && elapsed < 47) return '45+';
  if (elapsed > 90) return '90+';
  return `${elapsed}'`;
};

const getStatusText = (status) => {
  const map = {
    SCHEDULED: 'Scheduled',
    TIMED: 'Upcoming',
    FINISHED: 'FT',
    SUSPENDED: 'Suspended',
    POSTPONED: 'Postponed',
    CANCELLED: 'Cancelled',
    AWARDED: 'Awarded',
  };
  return map[status] || status || '';
};

const formatKickoff = (utcDate) => {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AppHeader = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [clock, setClock] = useState(getCurrentTime);
  const cycleTimerRef = useRef(null);

  const fetchMatches = useCallback(async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      const dateFrom = formatDateParam(yesterday);
      const dateTo = formatDateParam(tomorrow);
      const todayStr = formatDateParam(now);

      const response = await matchAPI.getMatchesByDate(dateFrom, dateTo);
      if (response.data.success) {
        const allMatches = response.data.matches || [];

        const scored = allMatches.map((m) => {
          const matchDay = m.utcDate ? m.utcDate.slice(0, 10) : '';
          const isToday = matchDay === todayStr;
          const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED';
          const isFinished = m.status === 'FINISHED';

          let rank = 5;
          if (isLive) rank = 0;
          else if (isToday && isFinished) rank = 1;
          else if (isToday) rank = 2;
          else if (matchDay < todayStr && isFinished) rank = 3;
          else if (matchDay > todayStr) rank = 4;

          return { match: m, rank };
        });

        scored.sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          return new Date(b.match.utcDate || 0) - new Date(a.match.utcDate || 0);
        });

        setMatches(scored.map((s) => s.match));
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const matchInterval = setInterval(fetchMatches, MATCH_REFRESH_INTERVAL);
    const clockInterval = setInterval(() => setClock(getCurrentTime()), 1000);
    return () => {
      clearInterval(matchInterval);
      clearInterval(clockInterval);
    };
  }, [fetchMatches]);

  useEffect(() => {
    if (matches.length <= 1) return;
    cycleTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % matches.length);
    }, MATCH_CYCLE_INTERVAL);
    return () => clearInterval(cycleTimerRef.current);
  }, [matches.length]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const goNext = () => {
    if (matches.length <= 1) return;
    clearInterval(cycleTimerRef.current);
    setActiveIndex((prev) => (prev + 1) % matches.length);
  };

  const goPrev = () => {
    if (matches.length <= 1) return;
    clearInterval(cycleTimerRef.current);
    setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const activeMatch = matches[activeIndex] || null;

  const renderTicker = () => {
    if (!activeMatch) {
      return (
        <div className="flex items-center gap-2 bg-[var(--bg-primary)] border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_#000] rotate-1 font-['Archivo_Black']">
          <span>{clock}</span>
        </div>
      );
    }

    const isLive = activeMatch.status === 'IN_PLAY' || activeMatch.status === 'PAUSED';
    const minuteLabel = getMatchMinute(activeMatch);
    const homeScore = activeMatch.score?.fullTime?.home ?? activeMatch.score?.halfTime?.home;
    const awayScore = activeMatch.score?.fullTime?.away ?? activeMatch.score?.halfTime?.away;
    const hasScore = homeScore != null && awayScore != null;

    return (
      <Link to={`/match/${activeMatch.id}`} className="flex flex-col sm:flex-row items-center gap-4 bg-[var(--bg-secondary)] border-4 border-[var(--border-color)] px-4 py-2 shadow-[6px_6px_0px_0px_var(--shadow-color)] hover:-translate-y-1 transition-transform group relative -rotate-1 min-w-[300px] justify-center">
        {matches.length > 1 && (
          <button className="absolute left-2 hover:text-[var(--accent-primary)] z-10 hidden sm:block" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}>
            ◀
          </button>
        )}

        {isLive && (
          <span className="absolute -top-3 -right-3 neu-badge bg-red-500 text-white animate-pulse shadow-none text-xs">LIVE</span>
        )}

        <div className="flex items-center gap-4 w-full justify-center px-6">
          <span className="flex items-center gap-2 font-['Archivo_Black'] uppercase text-sm sm:text-base whitespace-nowrap">
            {activeMatch.homeTeam?.crest && <img src={activeMatch.homeTeam.crest} className="w-6 h-6 object-contain" alt="" />}
            <span className="hidden sm:inline">{activeMatch.homeTeam?.tla || activeMatch.homeTeam?.shortName}</span>
          </span>

          <span className="bg-black text-white font-['Archivo_Black'] text-lg px-3 py-1 border-2 border-[var(--bg-secondary)] shadow-[2px_2px_0px_0px_var(--accent-primary)] whitespace-nowrap">
            {hasScore ? `${homeScore} - ${awayScore}` : (formatKickoff(activeMatch.utcDate) || 'VS')}
            {minuteLabel && <span className="text-yellow-400 text-xs ml-2">{minuteLabel}</span>}
          </span>

          <span className="flex items-center gap-2 font-['Archivo_Black'] uppercase text-sm sm:text-base whitespace-nowrap">
            <span className="hidden sm:inline">{activeMatch.awayTeam?.tla || activeMatch.awayTeam?.shortName}</span>
            {activeMatch.awayTeam?.crest && <img src={activeMatch.awayTeam.crest} className="w-6 h-6 object-contain" alt="" />}
          </span>
        </div>

        {matches.length > 1 && (
          <button className="absolute right-2 hover:text-[var(--accent-primary)] z-10 hidden sm:block" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}>
            ▶
          </button>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-primary)] border-b-4 border-[var(--border-color)] px-4 py-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_4px_0px_0px_var(--shadow-color)]">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-['Bebas_Neue'] text-4xl md:text-5xl tracking-widest text-[var(--text-primary)] uppercase drop-shadow-[2px_2px_0px_var(--shadow-color)] hover:text-[var(--accent-primary)] transition-colors">
          CASA ULTRAS
        </Link>
      </div>

      <div className="flex-1 flex justify-center w-full md:w-auto">
        {renderTicker()}
      </div>

      <nav className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 justify-center">
        <Link to="/" className="font-['Archivo_Black'] text-sm sm:text-base hover:bg-[var(--accent-primary)] hover:text-[var(--bg-secondary)] border-2 border-transparent hover:border-black px-2 sm:px-3 py-1 transition-all">HOME</Link>
        <Link to="/communities" className="font-['Archivo_Black'] text-sm sm:text-base hover:bg-[var(--accent-primary)] hover:text-[var(--bg-secondary)] border-2 border-transparent hover:border-black px-2 sm:px-3 py-1 transition-all">COMMUNITIES</Link>
        <Link to="/live-scores" className="font-['Archivo_Black'] text-sm sm:text-base hover:bg-[var(--accent-primary)] hover:text-[var(--bg-secondary)] border-2 border-transparent hover:border-black px-2 sm:px-3 py-1 transition-all">SCORES</Link>
        {user ? (
          <>
            <Link to="/profile" className="font-['Archivo_Black'] text-sm sm:text-base bg-[var(--bg-secondary)] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-2 sm:px-4 py-1 hover:-translate-y-1 transition-transform">PROFILE</Link>
            <Link to="/settings" className="font-['Archivo_Black'] text-sm sm:text-base bg-[var(--bg-secondary)] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-2 sm:px-4 py-1 hover:-translate-y-1 transition-transform">SETTINGS</Link>
            <button
              type="button"
              onClick={handleLogout}
              className="font-['Archivo_Black'] text-sm sm:text-base bg-red-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] px-2 sm:px-4 py-1 hover:-translate-y-1 transition-transform"
            >
              LOGOUT
            </button>
          </>
        ) : (
          <Link to="/login" className="font-['Archivo_Black'] text-sm sm:text-base bg-[var(--accent-primary)] text-[var(--bg-secondary)] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-2 sm:px-4 py-1 hover:-translate-y-1 transition-transform">LOGIN</Link>
        )}
      </nav>
    </header>
  );
};

export default AppHeader;
"""

with open("d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/AppHeader.jsx", "w", encoding="utf-8") as f:
    f.write(header_jsx)

css_file = "d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/AppHeader.css"
if os.path.exists(css_file):
    os.remove(css_file)

print("AppHeader.jsx updated to Neubrutalism design and AppHeader.css removed.")
