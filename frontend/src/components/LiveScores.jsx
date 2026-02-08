import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import AppHeader from './AppHeader';
import '../styles/LiveScores.css';

/**
 * Free-tier competition IDs on football-data.org.
 * Used as fallback when the API competitions endpoint is unavailable.
 */
const FREE_TIER_LEAGUES = [
  { id: 2021, name: 'Premier League', code: 'PL', country: 'England' },
  { id: 2014, name: 'Primera Division', code: 'PD', country: 'Spain' },
  { id: 2002, name: 'Bundesliga', code: 'BL1', country: 'Germany' },
  { id: 2019, name: 'Serie A', code: 'SA', country: 'Italy' },
  { id: 2015, name: 'Ligue 1', code: 'FL1', country: 'France' },
  { id: 2001, name: 'Champions League', code: 'CL', country: 'Europe' },
  { id: 2003, name: 'Eredivisie', code: 'DED', country: 'Netherlands' },
  { id: 2017, name: 'Primeira Liga', code: 'PPL', country: 'Portugal' },
  { id: 2016, name: 'Championship', code: 'ELC', country: 'England' },
  { id: 2013, name: 'Campeonato Brasileiro Serie A', code: 'BSA', country: 'Brazil' },
];

/**
 * SVG icon for calendar/matches section
 * @returns {JSX.Element}
 */
const CalendarIcon = () => (
  <svg className="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/**
 * SVG icon for stadium/leagues section
 * @returns {JSX.Element}
 */
const StadiumIcon = () => (
  <svg className="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="5" />
    <path d="M2 12v4c0 2.76 4.48 5 10 5s10-2.24 10-5v-4" />
    <path d="M2 8c0-2.76 4.48-5 10-5s10 2.24 10 5" />
  </svg>
);

/**
 * SVG icon for football (empty state)
 * @returns {JSX.Element}
 */
const FootballIcon = () => (
  <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12h20" />
  </svg>
);

/**
 * SVG icon for trophy (league fallback)
 * @returns {JSX.Element}
 */
const TrophyIcon = () => (
  <svg className="league-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

/**
 * SVG chevron-left icon
 * @returns {JSX.Element}
 */
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

/**
 * SVG chevron-right icon
 * @returns {JSX.Element}
 */
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

/**
 * SVG arrow-right icon for league cards
 * @returns {JSX.Element}
 */
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/**
 * Format a Date object to YYYY-MM-DD string for API queries
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
 * LiveScores page - displays matches for the selected date across all leagues
 * and a grid of league cards for browsing individual competitions.
 * Supports date navigation (previous day, today, next day).
 * @returns {JSX.Element}
 */
const LiveScores = () => {
  const [groupedMatches, setGroupedMatches] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [matchError, setMatchError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  /**
   * Format the selected date for display
   * @returns {string} Human-readable date string
   */
  const getDisplayDate = () => {
    const today = new Date();
    const sel = selectedDate;
    const isToday =
      sel.getFullYear() === today.getFullYear() &&
      sel.getMonth() === today.getMonth() &&
      sel.getDate() === today.getDate();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      sel.getFullYear() === yesterday.getFullYear() &&
      sel.getMonth() === yesterday.getMonth() &&
      sel.getDate() === yesterday.getDate();

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow =
      sel.getFullYear() === tomorrow.getFullYear() &&
      sel.getMonth() === tomorrow.getMonth() &&
      sel.getDate() === tomorrow.getDate();

    let prefix = '';
    if (isToday) prefix = 'Today — ';
    else if (isYesterday) prefix = 'Yesterday — ';
    else if (isTomorrow) prefix = 'Tomorrow — ';

    return (
      prefix +
      sel.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  };

  /**
   * Navigate to previous day
   */
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  /**
   * Navigate to next day
   */
  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  /**
   * Jump back to today
   */
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  useEffect(() => {
    fetchMatchesForDate();
  }, [selectedDate]);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  /**
   * Fetch matches for the selected date, grouped by competition.
   * Uses the /matches endpoint with dateFrom/dateTo params.
   */
  const fetchMatchesForDate = async () => {
    setLoadingMatches(true);
    setMatchError('');
    setGroupedMatches([]);
    try {
      const dateStr = formatDateParam(selectedDate);
      const response = await matchAPI.getMatchesByDate(dateStr, dateStr);
      if (response.data.success) {
        const matches = response.data.matches || [];

        // Group matches by competition
        const groups = {};
        matches.forEach((match) => {
          const comp = match.competition || {};
          const compId = comp.id || 0;
          if (!groups[compId]) {
            groups[compId] = { competition: comp, matches: [] };
          }
          groups[compId].matches.push(match);
        });

        const grouped = Object.values(groups).sort((a, b) =>
          (a.competition?.name || '').localeCompare(b.competition?.name || '')
        );
        setGroupedMatches(grouped);
      }
    } catch (_err) {
      setMatchError('Unable to load matches. Please try again later.');
    } finally {
      setLoadingMatches(false);
    }
  };

  /**
   * Fetch available competitions for the league cards
   */
  const fetchCompetitions = async () => {
    try {
      const response = await matchAPI.getAvailableCompetitions();
      if (response.data.success && response.data.competitions?.length > 0) {
        setCompetitions(response.data.competitions);
      } else {
        setCompetitions(FREE_TIER_LEAGUES);
      }
    } catch (_err) {
      setCompetitions(FREE_TIER_LEAGUES);
    } finally {
      setLoadingLeagues(false);
    }
  };

  /**
   * Format UTC date to a readable local time string
   * @param {string} utcDate - ISO date string
   * @returns {string} Formatted time like "20:00"
   */
  const formatMatchTime = (utcDate) => {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get display label for match status
   * @param {string} status - API status string
   * @returns {string} Human-readable label
   */
  const getStatusLabel = (status) => {
    const map = {
      SCHEDULED: 'Scheduled',
      TIMED: 'Upcoming',
      IN_PLAY: 'LIVE',
      PAUSED: 'HT',
      FINISHED: 'FT',
      SUSPENDED: 'Suspended',
      POSTPONED: 'Postponed',
      CANCELLED: 'Cancelled',
      AWARDED: 'Awarded',
    };
    return map[status] || status || '';
  };

  /**
   * Determine CSS class for match status badge
   * @param {string} status - API status string
   * @returns {string} CSS class suffix
   */
  const getStatusClass = (status) => {
    if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') return 'live';
    if (status === 'FINISHED') return 'finished';
    return 'scheduled';
  };

  return (
    <div className="live-scores-page">
      <AppHeader />

      <div className="live-scores-container">
        {/* Page Title */}
        <div className="live-scores-hero">
          <h1 className="live-scores-title">Live Scores</h1>
        </div>

        {/* Date Navigation */}
        <div className="date-nav">
          <button className="date-nav-btn" onClick={goToPreviousDay} aria-label="Previous day">
            <ChevronLeft />
          </button>
          <div className="date-nav-center">
            <span className="date-nav-label">{getDisplayDate()}</span>
            {formatDateParam(selectedDate) !== formatDateParam(new Date()) && (
              <button className="date-nav-today-btn" onClick={goToToday}>
                Go to Today
              </button>
            )}
          </div>
          <button className="date-nav-btn" onClick={goToNextDay} aria-label="Next day">
            <ChevronRight />
          </button>
        </div>

        {/* Section 1: Matches for selected date */}
        <section className="today-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon"><CalendarIcon /></span>
              Matches
            </h2>
          </div>

          {loadingMatches ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading matches...</p>
            </div>
          ) : matchError ? (
            <div className="error-state">
              <p>{matchError}</p>
              <button className="retry-btn" onClick={fetchMatchesForDate}>
                Try Again
              </button>
            </div>
          ) : groupedMatches.length === 0 ? (
            <div className="empty-state">
              <FootballIcon />
              <p>No matches on this date</p>
              <p className="empty-hint">Try a different date or browse the leagues below</p>
            </div>
          ) : (
            <div className="matches-by-league">
              {groupedMatches.map((group) => (
                <div key={group.competition?.id || Math.random()} className="league-group">
                  <div className="league-group-header">
                    {group.competition?.emblem && (
                      <img
                        src={group.competition.emblem}
                        alt=""
                        className="league-group-emblem"
                      />
                    )}
                    <span className="league-group-name">
                      {group.competition?.name || 'Unknown League'}
                    </span>
                    <span className="league-group-area">
                      {group.competition?.area?.name || ''}
                    </span>
                  </div>

                  <div className="match-list">
                    {group.matches.map((match) => (
                      <Link
                        key={match.id}
                        to={`/match/${match.id}`}
                        className={`match-row match-row-link status-${getStatusClass(match.status)}`}
                      >
                        <div className="match-time-col">
                          <span className={`match-status-badge ${getStatusClass(match.status)}`}>
                            {getStatusLabel(match.status)}
                          </span>
                          <span className="match-time-text">
                            {formatMatchTime(match.utcDate)}
                          </span>
                        </div>

                        <div className="match-teams-col">
                          <div className="match-team home">
                            <span className="team-name">
                              {match.homeTeam?.shortName || match.homeTeam?.name || 'Home'}
                            </span>
                            {match.homeTeam?.crest && (
                              <img
                                src={match.homeTeam.crest}
                                alt=""
                                className="team-crest-small"
                              />
                            )}
                          </div>

                          <div className="match-score-col">
                            {match.score?.fullTime?.home != null ? (
                              <span className="match-score-display">
                                {match.score.fullTime.home} - {match.score.fullTime.away}
                              </span>
                            ) : (
                              <span className="match-vs">vs</span>
                            )}
                          </div>

                          <div className="match-team away">
                            {match.awayTeam?.crest && (
                              <img
                                src={match.awayTeam.crest}
                                alt=""
                                className="team-crest-small"
                              />
                            )}
                            <span className="team-name">
                              {match.awayTeam?.shortName || match.awayTeam?.name || 'Away'}
                            </span>
                          </div>
                        </div>

                        {match.score?.halfTime?.home != null && (
                          <div className="match-ht-col">
                            HT: {match.score.halfTime.home}-{match.score.halfTime.away}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Browse Leagues */}
        <section className="leagues-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon"><StadiumIcon /></span>
              Browse Leagues
            </h2>
            <p className="section-subtitle">
              Select a league to view all fixtures and results
            </p>
          </div>

          {loadingLeagues ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading leagues...</p>
            </div>
          ) : (
            <div className="leagues-grid">
              {competitions.map((comp) => (
                <Link
                  key={comp.id}
                  to={`/league/${comp.id}`}
                  className="league-card"
                >
                  <div className="league-card-emblem">
                    {comp.emblem ? (
                      <img src={comp.emblem} alt="" className="league-emblem-img" />
                    ) : (
                      <TrophyIcon />
                    )}
                  </div>
                  <div className="league-card-info">
                    <h3 className="league-card-name">{comp.name}</h3>
                    <span className="league-card-country">
                      {comp.area?.name || comp.country || ''}
                    </span>
                  </div>
                  <div className="league-card-arrow"><ArrowRight /></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LiveScores;
