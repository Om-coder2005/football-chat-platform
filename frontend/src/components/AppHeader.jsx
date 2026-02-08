import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { matchAPI } from '../services/api';
import './AppHeader.css';

/** @constant {number} Interval in ms for refreshing match data */
const MATCH_REFRESH_INTERVAL = 60_000;

/** @constant {number} Interval in ms for cycling through featured matches */
const MATCH_CYCLE_INTERVAL = 8_000;

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDateParam = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Get the current time formatted as HH:MM:SS
 * @returns {string} Formatted local time
 */
const getCurrentTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Compute a human-readable match-minute label based on status and UTC kickoff.
 * Returns null if the match is not live.
 * @param {object} match - Match object from API
 * @returns {string|null} Match minute string or null
 */
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

/**
 * Get display label for match status (non-live matches)
 * @param {string} status - API status string
 * @returns {string}
 */
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

/**
 * Format a match's kickoff time for the ticker
 * @param {string} utcDate - ISO date string
 * @returns {string} Formatted time like "20:00"
 */
const formatKickoff = (utcDate) => {
  if (!utcDate) return '';
  return new Date(utcDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Global site header: logo, dynamic live score ticker, main nav, real-time clock.
 * Fetches today's matches and cycles through them with live data.
 * Shows Login when unauthenticated, Logout when authenticated.
 * @returns {JSX.Element}
 */
const AppHeader = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [clock, setClock] = useState(getCurrentTime);
  const cycleTimerRef = useRef(null);

  /**
   * Fetch latest matches across a 3-day window (yesterday → tomorrow).
   * Ensures there are always recent scores to display even on quiet days.
   * Priority: live > today finished > today upcoming > yesterday finished > tomorrow upcoming.
   */
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

        /**
         * Score each match for sorting:
         * 0 = live (IN_PLAY / PAUSED)
         * 1 = today finished
         * 2 = today upcoming / scheduled
         * 3 = yesterday finished (recent results)
         * 4 = tomorrow upcoming
         * 5 = everything else
         */
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
          // Within the same rank, sort by kickoff time (most recent first for finished)
          return new Date(b.match.utcDate || 0) - new Date(a.match.utcDate || 0);
        });

        setMatches(scored.map((s) => s.match));
      }
    } catch {
      // Silently ignore – header still functions without live data
    }
  }, []);

  /**
   * Set up data fetching intervals and clock
   */
  useEffect(() => {
    fetchMatches();
    const matchInterval = setInterval(fetchMatches, MATCH_REFRESH_INTERVAL);
    const clockInterval = setInterval(() => setClock(getCurrentTime()), 1000);
    return () => {
      clearInterval(matchInterval);
      clearInterval(clockInterval);
    };
  }, [fetchMatches]);

  /**
   * Auto-cycle through matches
   */
  useEffect(() => {
    if (matches.length <= 1) return;
    cycleTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % matches.length);
    }, MATCH_CYCLE_INTERVAL);
    return () => clearInterval(cycleTimerRef.current);
  }, [matches.length]);

  /**
   * Handle logout action
   */
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /**
   * Navigate to next match in ticker
   */
  const goNext = () => {
    if (matches.length <= 1) return;
    clearInterval(cycleTimerRef.current);
    setActiveIndex((prev) => (prev + 1) % matches.length);
  };

  /**
   * Navigate to previous match in ticker
   */
  const goPrev = () => {
    if (matches.length <= 1) return;
    clearInterval(cycleTimerRef.current);
    setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const activeMatch = matches[activeIndex] || null;

  /**
   * Render the live score ticker for the active match
   * @returns {JSX.Element|null}
   */
  const renderTicker = () => {
    if (!activeMatch) {
      return (
        <div className="header-ticker-empty">
          <span className="header-clock-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span className="header-clock-time">{clock}</span>
        </div>
      );
    }

    const isLive = activeMatch.status === 'IN_PLAY' || activeMatch.status === 'PAUSED';
    const minuteLabel = getMatchMinute(activeMatch);
    const homeScore = activeMatch.score?.fullTime?.home ?? activeMatch.score?.halfTime?.home;
    const awayScore = activeMatch.score?.fullTime?.away ?? activeMatch.score?.halfTime?.away;
    const hasScore = homeScore != null && awayScore != null;

    return (
      <Link to={`/match/${activeMatch.id}`} className="header-ticker-match" aria-label="View match details">
        {/* Nav chevron left */}
        {matches.length > 1 && (
          <button
            className="ticker-nav-btn"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
            aria-label="Previous match"
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Live indicator */}
        {isLive && (
          <span className="ticker-live-badge">
            <span className="ticker-live-dot" />
            LIVE
          </span>
        )}

        {/* Home team */}
        <span className="ticker-team">
          {activeMatch.homeTeam?.crest && (
            <img src={activeMatch.homeTeam.crest} alt="" className="ticker-crest" width={24} height={24} />
          )}
          <span className="ticker-team-name">
            {activeMatch.homeTeam?.tla || activeMatch.homeTeam?.shortName || ''}
          </span>
        </span>

        {/* Score / Time */}
        <span className="ticker-score-block">
          {hasScore ? (
            <span className="ticker-score">{homeScore} - {awayScore}</span>
          ) : (
            <span className="ticker-vs">{formatKickoff(activeMatch.utcDate) || 'vs'}</span>
          )}
          {minuteLabel && (
            <span className="ticker-minute">{minuteLabel}</span>
          )}
          {!isLive && !minuteLabel && (
            <span className="ticker-status">{getStatusText(activeMatch.status)}</span>
          )}
        </span>

        {/* Away team */}
        <span className="ticker-team">
          {activeMatch.awayTeam?.crest && (
            <img src={activeMatch.awayTeam.crest} alt="" className="ticker-crest" width={24} height={24} />
          )}
          <span className="ticker-team-name">
            {activeMatch.awayTeam?.tla || activeMatch.awayTeam?.shortName || ''}
          </span>
        </span>

        {/* Nav chevron right */}
        {matches.length > 1 && (
          <button
            className="ticker-nav-btn"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
            aria-label="Next match"
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        )}

        {/* Match count indicator */}
        {matches.length > 1 && (
          <span className="ticker-counter">{activeIndex + 1}/{matches.length}</span>
        )}
      </Link>
    );
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Link to="/" className="app-header-logo" aria-label="CASA ULTRAS home">
          CASA ULTRAS
        </Link>
        <div className="app-header-clock" aria-live="polite">
          <svg className="clock-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="clock-time">{clock}</span>
        </div>
      </div>

      <div className="app-header-center">
        {renderTicker()}
      </div>

      <nav className="app-header-nav" aria-label="Main navigation">
        <Link to="/" className="app-header-link">HOME</Link>
        <Link to="/communities" className="app-header-link">COMMUNITIES</Link>
        <Link to="/live-scores" className="app-header-link">LIVE SCORES</Link>
        {user ? (
          <button
            type="button"
            className="app-header-link app-header-login"
            onClick={handleLogout}
            aria-label="Log out"
          >
            LOGOUT
          </button>
        ) : (
          <Link to="/login" className="app-header-link app-header-login">LOGIN</Link>
        )}
      </nav>
    </header>
  );
};

export default AppHeader;
