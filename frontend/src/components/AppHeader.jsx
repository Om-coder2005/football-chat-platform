import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { matchAPI } from '../services/api';
import { formatTime, formatDateParam } from '../utils/formatters';
import {
  Home, Users, Activity, User, Settings, LogOut,
  ChevronLeft, ChevronRight, ShoppingBag, Swords, ArrowLeftRight, Menu, X
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

/* ─── single nav link ─── */
const NavLink = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={[
        'font-archivo text-[13px] uppercase tracking-wider px-3 py-2',
        'flex items-center gap-2 border-2 transition-all duration-150 whitespace-nowrap',
        isActive
          ? 'border-black bg-black text-white shadow-[3px_3px_0_0_var(--accent-primary)]'
          : 'border-transparent text-[var(--text-primary)] hover:border-black hover:bg-[var(--accent-primary)] hover:text-white hover:shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px]',
      ].join(' ')}
    >
      {Icon && <Icon size={15} />}
      {label}
    </Link>
  );
};

/* ─── main component ─── */
const AppHeader = () => {
  const { user, logout } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [matches, setMatches]         = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const cycleRef = useRef(null);

  /* close mobile menu on route change */
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* ── fetch matches ── */
  const fetchMatches = useCallback(async () => {
    try {
      const now  = new Date();
      const prev = new Date(now); prev.setDate(now.getDate() - 1);
      const next = new Date(now); next.setDate(now.getDate() + 1);
      const dateFrom = formatDateParam(prev);
      const dateTo   = formatDateParam(next);
      if (!dateFrom || !dateTo) return;
      const res = await matchAPI.getMatchesByDate(dateFrom, dateTo);
      if (res?.data?.matches) {
        const todayStr = formatDateParam(now);
        const scored = res.data.matches.map(m => {
          const day = (m.utcDate || '').slice(0, 10);
          const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
          let rank = 5;
          if (live)                                       rank = 0;
          else if (day === todayStr && m.status === 'FINISHED') rank = 1;
          else if (day === todayStr)                      rank = 2;
          else if (day < todayStr)                        rank = 3;
          else                                            rank = 4;
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

  /* ── match ticker ── */
  const renderTicker = () => {
    if (!active) return null;
    const isLive  = active.status === 'IN_PLAY' || active.status === 'PAUSED';
    const hs = active.score?.fullTime?.home;
    const as = active.score?.fullTime?.away;
    const hasScore = hs !== null && hs !== undefined && as !== null && as !== undefined;
    const min = getMatchMinute(active);

    return (
      <Link
        to={`/match/${active.id}`}
        className="flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0_0_#000] px-2.5 py-1 bg-white text-black no-underline transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000] max-w-[320px]"
      >
        {matches.length > 1 && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
            className="bg-transparent border-none cursor-pointer text-black flex items-center px-0.5 hover:text-[var(--accent-primary)] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {isLive && (
          <span className="animate-pulse bg-red-500 text-white font-archivo text-[9px] px-1.5 py-0.5 border border-black uppercase shrink-0">
            LIVE
          </span>
        )}

        <span className="flex items-center gap-1 font-archivo text-xs uppercase truncate max-w-[60px]">
          {active.homeTeam?.crest && (
            <img src={active.homeTeam.crest} alt="" className="w-4 h-4 object-contain shrink-0" />
          )}
          <span className="truncate">{active.homeTeam?.tla || active.homeTeam?.shortName || ''}</span>
        </span>

        <span className="font-bebas text-lg bg-black text-white px-1.5 tracking-wider border border-black flex items-center shrink-0">
          {hasScore ? `${hs}-${as}` : (formatTime(active.utcDate) || 'VS')}
          {min && <span className="text-[var(--accent-primary)] text-xs ml-1">{min}</span>}
        </span>

        <span className="flex items-center gap-1 font-archivo text-xs uppercase truncate max-w-[60px]">
          <span className="truncate">{active.awayTeam?.tla || active.awayTeam?.shortName || ''}</span>
          {active.awayTeam?.crest && (
            <img src={active.awayTeam.crest} alt="" className="w-4 h-4 object-contain shrink-0" />
          )}
        </span>

        {matches.length > 1 && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); goNext(); }}
            className="bg-transparent border-none cursor-pointer text-black flex items-center px-0.5 hover:text-[var(--accent-primary)] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </Link>
    );
  };

  /* ── shared nav items list ── */
  const navItems = [
    { to: '/',            icon: Home,          label: 'Home' },
    { to: '/communities', icon: Users,          label: 'Clubs' },
    { to: '/live-scores', icon: Activity,       label: 'Scores' },
    { to: '/stickers/shop', icon: ShoppingBag,  label: 'Shop' },
    { to: '/rivalry',     icon: Swords,         label: 'Rivalry' },
    { to: '/transfers',   icon: ArrowLeftRight, label: 'Transfers' },
  ];

  return (
    <>
      {/* ════════ MAIN HEADER BAR ════════ */}
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)] border-b-4 border-black shadow-[0_5px_0_0_#000]">
        
        {/* ── primary row ── */}
        <div className="px-4 md:px-6 py-2.5 flex items-center gap-3">

          {/* Logo */}
          <Link
            to="/"
            className="font-bebas text-3xl md:text-4xl tracking-widest text-[var(--text-primary)] no-underline leading-none shrink-0"
          >
            CASA ULTRAS
          </Link>

          {/* Ticker — hidden on very small screens, visible md+ */}
          <div className="hidden sm:flex flex-1 justify-center min-w-0 px-2">
            {renderTicker()}
          </div>

          {/* Desktop nav — hidden below lg */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </nav>

          {/* Desktop auth buttons — hidden below lg */}
          {user ? (
            <div className="hidden lg:flex items-center gap-1 shrink-0 ml-1 border-l-2 border-black pl-2">
              <Link
                to="/profile"
                className="font-archivo text-[13px] uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-2 border-black bg-white text-black shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000] transition-all whitespace-nowrap"
              >
                <User size={15} /> Profile
              </Link>
              <Link
                to="/settings"
                className="font-archivo text-[13px] uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-2 border-black bg-white text-black shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000] transition-all whitespace-nowrap"
              >
                <Settings size={15} />
              </Link>
              <button
                onClick={() => { if (logout) logout(); navigate('/'); }}
                className="font-archivo text-[13px] uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-2 border-black bg-red-500 text-white shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000] transition-all cursor-pointer whitespace-nowrap"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden lg:flex font-archivo text-[13px] uppercase tracking-wider px-4 py-2 items-center gap-2 border-2 border-black bg-[var(--accent-primary)] text-white shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#000] transition-all whitespace-nowrap shrink-0"
            >
              Login
            </Link>
          )}

          {/* Hamburger — visible below lg */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden ml-auto border-2 border-black p-2 bg-white shadow-[3px_3px_0_0_#000] hover:bg-yellow-300 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Ticker row on extra-small screens */}
        <div className="sm:hidden px-4 pb-2 flex justify-center">
          {renderTicker()}
        </div>

        {/* ════════ MOBILE DROPDOWN MENU ════════ */}
        {mobileOpen && (
          <div className="lg:hidden border-t-4 border-black bg-[var(--bg-primary)] shadow-[0_8px_0_0_#000]">
            <nav className="flex flex-col p-3 gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => setMobileOpen(false)}
                />
              ))}

              {/* Divider */}
              <div className="border-t-2 border-black my-2" />

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="font-archivo text-[13px] uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-2 border-black bg-white text-black shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all"
                  >
                    <User size={15} /> Profile ({user.username})
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="font-archivo text-[13px] uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-2 border-black bg-white text-black shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all"
                  >
                    <Settings size={15} /> Settings
                  </Link>
                  <button
                    onClick={() => { if (logout) logout(); navigate('/'); setMobileOpen(false); }}
                    className="font-archivo text-[13px] uppercase tracking-wider px-3 py-2 flex items-center gap-2 border-2 border-black bg-red-500 text-white shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all cursor-pointer"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-archivo text-[13px] uppercase tracking-wider px-4 py-2 flex items-center gap-2 border-2 border-black bg-[var(--accent-primary)] text-white shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all"
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default AppHeader;
