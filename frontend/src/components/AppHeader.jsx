import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { matchAPI } from '../services/api';
import { formatTime, formatDateParam } from '../utils/formatters';
import {
  Home, Users, Activity, User, Settings, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const MATCH_REFRESH_INTERVAL = 60_000;
const MATCH_CYCLE_INTERVAL   = 8_000;

const getMatchMinute = (match) => {
  if (!match) return null;
  if (match.status === 'PAUSED') return 'HT';
  if (match.status !== 'IN_PLAY') return null;
  if (!match.utcDate) return 'LIVE';
  try {
    const el = Math.floor((Date.now() - new Date(match.utcDate).getTime()) / 60_000);
    if (el <= 0) return 'LIVE';
    if (el > 90) return '90+';
    return `${el}'`;
  } catch (e) {
    return 'LIVE';
  }
};

const NavLink = ({ to, children }) => (
  <Link 
    to={to} 
    className="font-archivo text-sm uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-4 border-transparent text-black transition-all duration-200 hover:border-black hover:bg-[var(--accent-primary)] hover:text-white hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000]"
  >
    {children}
  </Link>
);

const AppHeader = () => {
  const { user, logout } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [matches, setMatches]       = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const cycleRef = useRef(null);

  const fetchMatches = useCallback(async () => {
    try {
      const now  = new Date();
      const prev = new Date(now); prev.setDate(now.getDate() - 1);
      const next = new Date(now); next.setDate(now.getDate() + 1);
      
      const dateFrom = formatDateParam(prev);
      const dateTo = formatDateParam(next);
      
      if (!dateFrom || !dateTo) return;
      
      const res  = await matchAPI.getMatchesByDate(dateFrom, dateTo);
      if (res && res.data && res.data.matches) {
        const todayStr = formatDateParam(now);
        const scored = res.data.matches.map(m => {
          const day = (m.utcDate || '').slice(0, 10);
          const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
          let rank = 5;
          if (live) rank = 0;
          else if (day === todayStr && m.status === 'FINISHED') rank = 1;
          else if (day === todayStr) rank = 2;
          else if (day < todayStr) rank = 3;
          else rank = 4;
          return { m, rank };
        });
        scored.sort((a, b) => a.rank - b.rank);
        setMatches(scored.map(s => s.m));
      }
    } catch (err) {
      console.error('Header fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const mi = setInterval(fetchMatches, MATCH_REFRESH_INTERVAL);
    return () => clearInterval(mi);
  }, [fetchMatches]);

  useEffect(() => {
    if (matches.length <= 1) return;
    cycleRef.current = setInterval(() => {
      setActiveIndex(p => (p + 1) % matches.length);
    }, MATCH_CYCLE_INTERVAL);
    return () => clearInterval(cycleRef.current);
  }, [matches.length]);

  const goNext = () => { 
    if (cycleRef.current) clearInterval(cycleRef.current); 
    setActiveIndex(p => (p + 1) % matches.length); 
  };
  const goPrev = () => { 
    if (cycleRef.current) clearInterval(cycleRef.current); 
    setActiveIndex(p => (p - 1 + matches.length) % matches.length); 
  };

  const active = matches.at(activeIndex) || null;

  const renderTicker = () => {
    if (!active) return null;

    const isLive = active.status === 'IN_PLAY' || active.status === 'PAUSED';
    const hs = active.score?.fullTime?.home;
    const as = active.score?.fullTime?.away;
    const hasScore = hs !== null && hs !== undefined && as !== null && as !== undefined;
    const min = getMatchMinute(active);

    return (
      <Link 
        to={`/match/${active.id}`} 
        className="flex items-center gap-2 border-4 border-black shadow-[4px_4px_0_0_#000] px-3 py-1 bg-white text-black no-underline transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]"
      >
        {matches.length > 1 && (
          <button onClick={e=>{e.preventDefault();e.stopPropagation();goPrev();}} className="bg-transparent border-none cursor-pointer text-black flex items-center px-1 hover:text-[var(--accent-primary)] transition-colors">
            <ChevronLeft size={16} />
          </button>
        )}
        
        {isLive && (
          <span className="animate-score-pulse bg-red-500 text-white font-archivo text-[10px] px-2 py-0.5 border-2 border-black uppercase">
            {'LIVE'}
          </span>
        )}
        
        <span className="flex items-center gap-2 font-archivo text-sm uppercase">
          {active.homeTeam?.crest && <img src={active.homeTeam.crest} alt="" className="w-5 h-5 object-contain" />}
          {active.homeTeam?.tla || active.homeTeam?.shortName || ''}
        </span>
        
        <span className="font-bebas text-xl bg-black text-white px-2 tracking-wider border-2 border-black flex items-center">
          {hasScore ? `${hs}-${as}` : (formatTime(active.utcDate) || 'VS')}
          {min && <span className="text-[var(--accent-primary)] text-sm ml-1">{min}</span>}
        </span>
        
        <span className="flex items-center gap-2 font-archivo text-sm uppercase">
          {active.awayTeam?.tla || active.awayTeam?.shortName || ''}
          {active.awayTeam?.crest && <img src={active.awayTeam.crest} alt="" className="w-5 h-5 object-contain" />}
        </span>
        
        {matches.length > 1 && (
          <button onClick={e=>{e.preventDefault();e.stopPropagation();goNext();}} className="bg-transparent border-none cursor-pointer text-black flex items-center px-1 hover:text-[var(--accent-primary)] transition-colors">
            <ChevronRight size={16} />
          </button>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-primary)] border-b-4 border-black shadow-[0_6px_0_0_#000] px-4 py-3 md:px-8 md:py-4 flex flex-wrap items-center justify-between gap-4">
      
      {/* Logo */}
      <Link to="/" className="font-bebas text-4xl tracking-widest text-black no-underline leading-none">
        {'CASA ULTRAS'}
      </Link>

      {/* Ticker - Centered or forced full width on mobile */}
      <div className="w-full lg:w-auto flex flex-1 justify-center order-3 lg:order-2">
        {renderTicker()}
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-2 flex-wrap justify-end order-2 lg:order-3">
        <NavLink to="/"><Home size={16} /> Home</NavLink>
        <NavLink to="/communities"><Users size={16} /> Communities</NavLink>
        <NavLink to="/live-scores"><Activity size={16} /> Scores</NavLink>
        
        {user ? (
          <>
            <Link to="/profile" className="font-archivo text-sm uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-4 border-black bg-white text-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all">
              <User size={16} /> Profile
            </Link>
            <Link to="/settings" className="font-archivo text-sm uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-4 border-black bg-white text-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all">
              <Settings size={16} /> Settings
            </Link>
            <button onClick={() => { if (logout) logout(); navigate('/'); }} className="font-archivo text-sm uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-4 border-black bg-red-500 text-white shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all cursor-pointer">
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="font-archivo text-sm uppercase tracking-wider px-4 py-2 flex items-center gap-2 border-4 border-black bg-[var(--accent-primary)] text-white shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all">
            {'Login'}
          </Link>
        )}
      </nav>
      
    </header>
  );
};

export default AppHeader;
