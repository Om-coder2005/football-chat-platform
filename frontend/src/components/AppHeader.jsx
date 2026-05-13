import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { matchAPI } from '../services/api';
import {
  Home, Users, Activity, User, Settings, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const MATCH_REFRESH_INTERVAL = 60_000;
const MATCH_CYCLE_INTERVAL   = 8_000;

const fmt = (date) => {
  try {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    return '';
  }
};

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

const fmtTime = (utcDate) => {
  if (!utcDate) return '';
  try {
    return new Date(utcDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  } catch (e) {
    return '';
  }
};

const S = {
  header: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'var(--bg-primary)',
    borderBottom: '4px solid var(--border-color)',
    boxShadow: '0 4px 0 var(--shadow-color)',
    padding: '0.6rem 1.25rem',
    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
    justifyContent: 'space-between', gap: '0.6rem',
  },
  logo: {
    fontFamily: '"Bebas Neue", sans-serif',
    fontSize: '2.25rem', letterSpacing: '0.08em',
    color: 'var(--text-primary)', textDecoration: 'none',
    lineHeight: 1,
  },
  navLink: {
    fontFamily: '"Archivo Black", sans-serif',
    fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '0.35rem 0.7rem', textDecoration: 'none',
    color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem',
    border: '2px solid transparent', transition: 'all 0.15s',
  },
  actionBtn: {
    fontFamily: '"Archivo Black", sans-serif',
    fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '0.35rem 0.9rem',
    background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
    border: '2px solid var(--border-color)',
    boxShadow: '2px 2px 0 var(--shadow-color)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    textDecoration: 'none', transition: 'transform 0.1s',
  },
  iconBtn: {
    fontFamily: '"Archivo Black", sans-serif',
    fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em',
    padding: '0.35rem 0.7rem',
    background: 'var(--card-bg)', color: 'var(--text-primary)',
    border: '2px solid var(--border-color)',
    boxShadow: '2px 2px 0 var(--shadow-color)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    textDecoration: 'none', transition: 'transform 0.1s',
  },
};

const NavLink = ({ to, children }) => (
  <Link to={to} style={S.navLink}
    onMouseEnter={e => { 
      e.currentTarget.style.background='var(--accent-primary)'; 
      e.currentTarget.style.color='var(--text-on-accent)'; 
      e.currentTarget.style.borderColor='var(--border-color)'; 
    }}
    onMouseLeave={e => { 
      e.currentTarget.style.background='transparent'; 
      e.currentTarget.style.color='var(--text-primary)'; 
      e.currentTarget.style.borderColor='transparent'; 
    }}
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
      
      const dateFrom = fmt(prev);
      const dateTo = fmt(next);
      
      if (!dateFrom || !dateTo) return;
      
      const res  = await matchAPI.getMatchesByDate(dateFrom, dateTo);
      if (res && res.data && res.data.matches) {
        const todayStr = fmt(now);
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

  const active = matches[activeIndex] || null;

  const renderTicker = () => {
    if (!active) return null;

    const isLive = active.status === 'IN_PLAY' || active.status === 'PAUSED';
    const hs = active.score?.fullTime?.home;
    const as = active.score?.fullTime?.away;
    const hasScore = hs !== null && hs !== undefined && as !== null && as !== undefined;
    const min = getMatchMinute(active);

    return (
      <Link to={`/match/${active.id}`} style={{ display:'flex', alignItems:'center', gap:'0.4rem', border:'3px solid var(--border-color)', boxShadow:'4px 4px 0 var(--shadow-color)', padding:'0.3rem 0.6rem', background:'var(--card-bg)', textDecoration:'none', color:'var(--text-primary)' }}>
        {matches.length > 1 && (
          <button onClick={e=>{e.preventDefault();e.stopPropagation();goPrev();}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',display:'flex',alignItems:'center',padding:'0 2px'}}>
            <ChevronLeft size={14} />
          </button>
        )}
        {isLive && (
          <span style={{background:'#ef4444',color:'#fff',fontFamily:'"Archivo Black",sans-serif',fontSize:'0.6rem',padding:'1px 5px',border:'1px solid var(--border-color)'}}>LIVE</span>
        )}
        <span style={{display:'flex',alignItems:'center',gap:'0.3rem',fontFamily:'"Archivo Black",sans-serif',fontSize:'0.8rem',textTransform:'uppercase'}}>
          {active.homeTeam?.crest && <img src={active.homeTeam.crest} alt="" style={{width:18,height:18,objectFit:'contain'}} />}
          {active.homeTeam?.tla || active.homeTeam?.shortName || ''}
        </span>
        <span style={{fontFamily:'"Bebas Neue",sans-serif',fontSize:'1.25rem',background:'var(--accent-secondary)',color:'var(--bg-primary)',padding:'0 0.5rem',letterSpacing:'0.05em',border:'1px solid var(--border-color)'}}>
          {hasScore ? `${hs}-${as}` : (fmtTime(active.utcDate) || 'VS')}
          {min && <span style={{color:'var(--accent-primary)',fontSize:'0.7rem',marginLeft:'3px'}}>{min}</span>}
        </span>
        <span style={{display:'flex',alignItems:'center',gap:'0.3rem',fontFamily:'"Archivo Black",sans-serif',fontSize:'0.8rem',textTransform:'uppercase'}}>
          {active.awayTeam?.tla || active.awayTeam?.shortName || ''}
          {active.awayTeam?.crest && <img src={active.awayTeam.crest} alt="" style={{width:18,height:18,objectFit:'contain'}} />}
        </span>
        {matches.length > 1 && (
          <button onClick={e=>{e.preventDefault();e.stopPropagation();goNext();}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-primary)',display:'flex',alignItems:'center',padding:'0 2px'}}>
            <ChevronRight size={14} />
          </button>
        )}
      </Link>
    );
  };

  return (
    <header style={S.header}>
      <Link to="/" style={S.logo}>CASA ULTRAS</Link>

      <div style={{flex:1,display:'flex',justifyContent:'center',minWidth:0}}>
        {renderTicker()}
      </div>

      <nav style={{display:'flex',alignItems:'center',gap:'0.4rem',flexWrap:'wrap'}}>
        <NavLink to="/"><Home size={14} /> Home</NavLink>
        <NavLink to="/communities"><Users size={14} /> Communities</NavLink>
        <NavLink to="/live-scores"><Activity size={14} /> Scores</NavLink>
        {user ? (
          <>
            <Link to="/profile"  style={S.iconBtn}><User size={14} /> Profile</Link>
            <Link to="/settings" style={S.iconBtn}><Settings size={14} /> Settings</Link>
            <button style={{ ...S.actionBtn, background:'#ef4444', color:'#fff' }} onClick={() => { if (logout) logout(); navigate('/'); }}>
              <LogOut size={14} /> Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={S.actionBtn}>Login</Link>
        )}
      </nav>
    </header>
  );
};

export default AppHeader;
