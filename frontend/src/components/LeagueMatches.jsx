import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import AppHeader from './AppHeader';
import '../styles/LiveScores.css';

/**
 * Match status filter options for the tab bar
 */
const STATUS_FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'SCHEDULED', label: 'UPCOMING' },
  { key: 'IN_PLAY', label: 'LIVE' },
  { key: 'FINISHED', label: 'RESULTS' },
];

/**
 * LeagueMatches page - displays all matches for a specific competition/league.
 * Users can filter by status (upcoming, live, results).
 * @returns {JSX.Element}
 */
const LeagueMatches = () => {
  const { competitionId } = useParams();
  const [matches, setMatches] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeView, setActiveView] = useState('matches');

  useEffect(() => {
    fetchLeagueData();
  }, [competitionId]);

  /**
   * Fetch matches and standings for this competition
   */
  const fetchLeagueData = async () => {
    setLoading(true);
    try {
      const response = await matchAPI.getCompetitionMatches(competitionId);
      if (response.data.success) {
        const matchList = response.data.matches || [];
        setMatches(matchList);

        // Extract competition info from the first match
        if (matchList.length > 0 && matchList[0].competition) {
          setCompetition(matchList[0].competition);
        }
      }
    } catch (_err) {
      // Matches fetch failed; component will show empty state
    }

    // Fetch standings
    try {
      const standingsRes = await matchAPI.getCompetitionStandings(competitionId);
      if (standingsRes.data.success && standingsRes.data.standings?.length > 0) {
        setStandings(standingsRes.data.standings);

        // If no competition info from matches, try from standings response
        if (!competition && standingsRes.data.competition) {
          setCompetition(standingsRes.data.competition);
        }
      }
    } catch (_err) {
      // Standings may not be available for cups
    }

    setLoading(false);
  };

  /**
   * Format UTC date to readable date/time
   * @param {string} utcDate - ISO date string
   * @returns {string} Formatted date string
   */
  const formatMatchDate = (utcDate) => {
    if (!utcDate) return '';
    const d = new Date(utcDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Format time portion of a date
   * @param {string} utcDate - ISO date string
   * @returns {string} Time string
   */
  const formatMatchTime = (utcDate) => {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get CSS class for match status
   * @param {string} status - API status string
   * @returns {string} CSS class suffix
   */
  const getStatusClass = (status) => {
    if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') return 'live';
    if (status === 'FINISHED') return 'finished';
    return 'scheduled';
  };

  /**
   * Get display label for match status
   * @param {string} status - API status string
   * @returns {string} Readable label
   */
  const getStatusLabel = (status) => {
    const map = {
      SCHEDULED: 'Scheduled',
      TIMED: 'Upcoming',
      IN_PLAY: 'LIVE',
      PAUSED: 'HT',
      FINISHED: 'FT',
      SUSPENDED: 'Susp.',
      POSTPONED: 'Postponed',
      CANCELLED: 'Cancelled',
      AWARDED: 'Awarded',
    };
    return map[status] || status || '';
  };

  /**
   * Filter matches based on active status filter
   * @returns {Array} Filtered match list
   */
  const getFilteredMatches = () => {
    if (activeFilter === 'all') return matches;
    if (activeFilter === 'IN_PLAY') {
      return matches.filter(
        (m) => m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'LIVE'
      );
    }
    return matches.filter((m) => m.status === activeFilter);
  };

  /**
   * Group matches by matchday for better organization
   * @param {Array} matchList - Array of match objects
   * @returns {Array} Array of { matchday, matches } groups
   */
  const groupByMatchday = (matchList) => {
    const groups = {};
    matchList.forEach((match) => {
      const md = match.matchday || 'Other';
      if (!groups[md]) {
        groups[md] = [];
      }
      groups[md].push(match);
    });

    return Object.entries(groups)
      .map(([matchday, dayMatches]) => ({
        matchday: matchday === 'Other' ? matchday : `Matchday ${matchday}`,
        matches: dayMatches.sort(
          (a, b) => new Date(a.utcDate) - new Date(b.utcDate)
        ),
      }))
      .sort((a, b) => {
        const aNum = parseInt(a.matchday.replace('Matchday ', ''));
        const bNum = parseInt(b.matchday.replace('Matchday ', ''));
        if (isNaN(aNum) || isNaN(bNum)) return 0;
        return bNum - aNum;
      });
  };

  const filteredMatches = getFilteredMatches();
  const matchdayGroups = groupByMatchday(filteredMatches);

  /**
   * Get the TOTAL standing (first standings group, typically "TOTAL")
   * @returns {Array} Table rows for the league table
   */
  const getTableRows = () => {
    if (!standings || standings.length === 0) return [];
    const totalStanding = standings.find((s) => s.type === 'TOTAL') || standings[0];
    return totalStanding?.table || [];
  };

  const tableRows = getTableRows();

  return (
    <div className="live-scores-page">
      <AppHeader />

      <div className="live-scores-container">
        {/* Back navigation + League header */}
        <div className="league-page-header">
          <Link to="/live-scores" className="back-link">
            ← Back to Live Scores
          </Link>

          <div className="league-hero">
            {competition?.emblem && (
              <img src={competition.emblem} alt="" className="league-hero-emblem" />
            )}
            <div className="league-hero-info">
              <h1 className="league-hero-name">
                {competition?.name || `Competition ${competitionId}`}
              </h1>
              <p className="league-hero-area">
                {competition?.area?.name || ''}
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle - Matches vs Standings */}
        <div className="view-toggle-bar">
          <button
            className={`view-toggle-btn ${activeView === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveView('matches')}
          >
            MATCHES
          </button>
          {tableRows.length > 0 && (
            <button
              className={`view-toggle-btn ${activeView === 'standings' ? 'active' : ''}`}
              onClick={() => setActiveView('standings')}
            >
              STANDINGS
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading league data...</p>
          </div>
        ) : activeView === 'matches' ? (
          <>
            {/* Status Filter Tabs */}
            <div className="filter-tabs">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  className={`filter-tab ${activeFilter === filter.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Matches grouped by matchday */}
            {filteredMatches.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">⚽</p>
                <p>No matches found for this filter</p>
              </div>
            ) : (
              <div className="matchday-groups">
                {matchdayGroups.map((group) => (
                  <div key={group.matchday} className="matchday-group">
                    <div className="matchday-header">
                      <span className="matchday-label">{group.matchday}</span>
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
                            <span className="match-date-text">
                              {formatMatchDate(match.utcDate)}
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
          </>
        ) : (
          /* Standings Table */
          <div className="standings-table-wrapper">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="st-pos">#</th>
                  <th className="st-team">Team</th>
                  <th className="st-num">P</th>
                  <th className="st-num">W</th>
                  <th className="st-num">D</th>
                  <th className="st-num">L</th>
                  <th className="st-num">GF</th>
                  <th className="st-num">GA</th>
                  <th className="st-num">GD</th>
                  <th className="st-num st-pts">Pts</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.team?.id || row.position}>
                    <td className="st-pos">{row.position}</td>
                    <td className="st-team">
                      <div className="st-team-cell">
                        {row.team?.crest && (
                          <img src={row.team.crest} alt="" className="st-team-crest" />
                        )}
                        <span>{row.team?.shortName || row.team?.name || ''}</span>
                      </div>
                    </td>
                    <td className="st-num">{row.playedGames}</td>
                    <td className="st-num">{row.won}</td>
                    <td className="st-num">{row.draw}</td>
                    <td className="st-num">{row.lost}</td>
                    <td className="st-num">{row.goalsFor}</td>
                    <td className="st-num">{row.goalsAgainst}</td>
                    <td className="st-num">{row.goalDifference}</td>
                    <td className="st-num st-pts">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueMatches;
