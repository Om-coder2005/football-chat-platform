import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { matchAPI } from '../services/api';
import AppHeader from './AppHeader';
import '../styles/MatchDetail.css';

/**
 * MatchDetail page - shows full details for a single match including
 * scoreboard, goals, lineups, referees, and match info.
 * Accessed by clicking a match row on LiveScores or LeagueMatches pages.
 * @returns {JSX.Element}
 */
const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  /**
   * Fetch full match details from the backend
   */
  const fetchMatchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await matchAPI.getMatchDetails(matchId);
      if (response.data.success && response.data.match) {
        setMatch(response.data.match);
      } else {
        setError('Match not found');
      }
    } catch (_err) {
      setError('Unable to load match details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format a UTC date string to a full readable date
   * @param {string} utcDate - ISO date string
   * @returns {string} Full formatted date
   */
  const formatFullDate = (utcDate) => {
    if (!utcDate) return '';
    const d = new Date(utcDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Format a UTC date string to time only
   * @param {string} utcDate - ISO date string
   * @returns {string} Time string
   */
  const formatTime = (utcDate) => {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Map API status to a human-readable label
   * @param {string} status - API status code
   * @returns {string} Display label
   */
  const getStatusLabel = (status) => {
    const map = {
      SCHEDULED: 'Scheduled',
      TIMED: 'Upcoming',
      IN_PLAY: 'LIVE',
      PAUSED: 'Half Time',
      FINISHED: 'Full Time',
      SUSPENDED: 'Suspended',
      POSTPONED: 'Postponed',
      CANCELLED: 'Cancelled',
      AWARDED: 'Awarded',
    };
    return map[status] || status || '';
  };

  /**
   * Get CSS modifier class for the status
   * @param {string} status - API status code
   * @returns {string} CSS class
   */
  const getStatusClass = (status) => {
    if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') return 'live';
    if (status === 'FINISHED') return 'finished';
    return 'scheduled';
  };

  const isLive =
    match?.status === 'IN_PLAY' ||
    match?.status === 'PAUSED' ||
    match?.status === 'LIVE';

  /**
   * Separate goals by team (home vs away)
   * @returns {{ homeGoals: Array, awayGoals: Array }}
   */
  const getGoalsByTeam = () => {
    if (!match?.goals || match.goals.length === 0) return { homeGoals: [], awayGoals: [] };
    const homeId = match.homeTeam?.id;
    const homeGoals = [];
    const awayGoals = [];

    match.goals.forEach((goal) => {
      if (goal.team?.id === homeId) {
        homeGoals.push(goal);
      } else {
        awayGoals.push(goal);
      }
    });

    return { homeGoals, awayGoals };
  };

  /**
   * Render a goal event line
   * @param {object} goal - Goal object from API
   * @param {number} idx - Array index
   * @returns {JSX.Element}
   */
  const renderGoal = (goal, idx) => (
    <div key={idx} className="md-goal-event">
      <span className="md-goal-minute">{goal.minute}&apos;</span>
      <span className="md-goal-scorer">{goal.scorer?.name || 'Unknown'}</span>
      {goal.assist?.name && (
        <span className="md-goal-assist">(ast. {goal.assist.name})</span>
      )}
      <span className="md-goal-type">
        {goal.type === 'PENALTY' ? '(P)' : goal.type === 'OWN' ? '(OG)' : ''}
      </span>
    </div>
  );

  const { homeGoals, awayGoals } = match ? getGoalsByTeam() : { homeGoals: [], awayGoals: [] };

  /**
   * Extract team statistics from the match response.
   * The /matches/{id} endpoint returns homeTeam.statistics and awayTeam.statistics
   * with fields like ball_possession, shots, corner_kicks, fouls, saves, etc.
   * @returns {Array|null} Array of stat objects for rendering, or null if unavailable
   */
  const getMatchStats = () => {
    if (!match) return null;
    const home = match.homeTeam?.statistics;
    const away = match.awayTeam?.statistics;
    if (!home || !away) return null;

    return [
      { label: 'Possession', home: home.ball_possession || 0, away: away.ball_possession || 0, suffix: '%', isPct: true },
      { label: 'Total Shots', home: home.total_shots || home.shots || 0, away: away.total_shots || away.shots || 0 },
      { label: 'Shots on Target', home: home.shots_on_target || home.shots_on_goal || 0, away: away.shots_on_target || away.shots_on_goal || 0 },
      { label: 'Shots off Target', home: home.shots_off_target || home.shots_off_goal || 0, away: away.shots_off_target || away.shots_off_goal || 0 },
      { label: 'Corner Kicks', home: home.corner_kicks || 0, away: away.corner_kicks || 0 },
      { label: 'Fouls', home: home.fouls || 0, away: away.fouls || 0 },
      { label: 'Offsides', home: home.offsides || 0, away: away.offsides || 0 },
      { label: 'Saves', home: home.saves || 0, away: away.saves || 0 },
      { label: 'Yellow Cards', home: home.yellow_cards || 0, away: away.yellow_cards || 0 },
      { label: 'Red Cards', home: home.red_cards || 0, away: away.red_cards || 0 },
    ];
  };

  const matchStats = match ? getMatchStats() : null;

  return (
    <div className="match-detail-page">
      <AppHeader />

      <div className="match-detail-container">
        {/* Back navigation */}
        <button className="md-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading match details...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchMatchDetails}>
              Try Again
            </button>
          </div>
        ) : match ? (
          <>
            {/* Competition banner */}
            <div className="md-comp-banner">
              {match.competition?.emblem && (
                <img
                  src={match.competition.emblem}
                  alt=""
                  className="md-comp-emblem"
                />
              )}
              <div className="md-comp-info">
                <Link
                  to={`/league/${match.competition?.id}`}
                  className="md-comp-name"
                >
                  {match.competition?.name || 'Competition'}
                </Link>
                {match.matchday && (
                  <span className="md-comp-matchday">
                    Matchday {match.matchday}
                  </span>
                )}
              </div>
              <span className="md-comp-area">
                {match.area?.name || match.competition?.area?.name || ''}
              </span>
            </div>

            {/* Match date & venue */}
            <div className="md-date-bar">
              <span className="md-date">{formatFullDate(match.utcDate)}</span>
              <span className="md-kickoff">Kick-off: {formatTime(match.utcDate)}</span>
              {match.venue && <span className="md-venue">{match.venue}</span>}
            </div>

            {/* Scoreboard */}
            <div className={`md-scoreboard ${getStatusClass(match.status)}`}>
              {/* Home team */}
              <div className="md-team md-team-home">
                {match.homeTeam?.crest ? (
                  <img src={match.homeTeam.crest} alt="" className="md-team-crest" />
                ) : (
                  <div className="md-team-crest-ph">
                    {match.homeTeam?.tla || match.homeTeam?.name?.charAt(0) || 'H'}
                  </div>
                )}
                <span className="md-team-name">
                  {match.homeTeam?.shortName || match.homeTeam?.name || 'Home'}
                </span>
                {match.homeTeam?.formation && (
                  <span className="md-team-formation">{match.homeTeam.formation}</span>
                )}
              </div>

              {/* Score center */}
              <div className="md-score-center">
                <span className={`md-status-badge ${getStatusClass(match.status)}`}>
                  {isLive && <span className="md-live-pulse" />}
                  {getStatusLabel(match.status)}
                  {match.minute ? ` ${match.minute}'` : ''}
                </span>
                <span className="md-score-big">
                  {match.score?.fullTime?.home ?? '-'} – {match.score?.fullTime?.away ?? '-'}
                </span>
                {match.score?.halfTime?.home != null && (
                  <span className="md-score-ht">
                    HT: {match.score.halfTime.home} – {match.score.halfTime.away}
                  </span>
                )}
              </div>

              {/* Away team */}
              <div className="md-team md-team-away">
                {match.awayTeam?.crest ? (
                  <img src={match.awayTeam.crest} alt="" className="md-team-crest" />
                ) : (
                  <div className="md-team-crest-ph">
                    {match.awayTeam?.tla || match.awayTeam?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <span className="md-team-name">
                  {match.awayTeam?.shortName || match.awayTeam?.name || 'Away'}
                </span>
                {match.awayTeam?.formation && (
                  <span className="md-team-formation">{match.awayTeam.formation}</span>
                )}
              </div>
            </div>

            {/* Goals breakdown */}
            {match.goals && match.goals.length > 0 && (
              <div className="md-card md-goals-card">
                <h3 className="md-card-title">
                  Goals
                  {match._ai_enriched && (
                    <span className="md-ai-badge">AI-Powered</span>
                  )}
                </h3>
                <div className="md-goals-columns">
                  <div className="md-goals-col md-goals-home">
                    <span className="md-goals-team-label">
                      {match.homeTeam?.shortName || match.homeTeam?.name || 'Home'}
                    </span>
                    {homeGoals.length > 0
                      ? homeGoals.map((g, i) => renderGoal(g, i))
                      : <span className="md-no-goals">–</span>}
                  </div>
                  <div className="md-goals-divider" />
                  <div className="md-goals-col md-goals-away">
                    <span className="md-goals-team-label">
                      {match.awayTeam?.shortName || match.awayTeam?.name || 'Away'}
                    </span>
                    {awayGoals.length > 0
                      ? awayGoals.map((g, i) => renderGoal(g, i))
                      : <span className="md-no-goals">–</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Match Statistics */}
            {matchStats ? (
              <div className="md-card md-stats-card">
                <h3 className="md-card-title">
                  Match Statistics
                  {match._ai_enriched && (
                    <span className="md-ai-badge">AI-Powered</span>
                  )}
                </h3>
                <div className="md-stats-list">
                  {matchStats.map((stat) => {
                    const total = stat.home + stat.away || 1;
                    const leftPct = stat.isPct ? stat.home : (stat.home / total) * 100;
                    const rightPct = stat.isPct ? stat.away : (stat.away / total) * 100;
                    return (
                      <div key={stat.label} className="md-stat-row">
                        <span className="md-stat-home-val">
                          {stat.home}{stat.suffix || ''}
                        </span>
                        <div className="md-stat-bar-wrapper">
                          <div className="md-stat-bar-track">
                            <div
                              className="md-stat-bar-fill md-stat-bar-home"
                              style={{ width: `${Math.max(leftPct, 2)}%` }}
                            />
                            <div
                              className="md-stat-bar-fill md-stat-bar-away"
                              style={{ width: `${Math.max(rightPct, 2)}%` }}
                            />
                          </div>
                          <span className="md-stat-label">{stat.label}</span>
                        </div>
                        <span className="md-stat-away-val">
                          {stat.away}{stat.suffix || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : match?.status !== 'SCHEDULED' && match?.status !== 'TIMED' ? (
              <div className="md-card">
                <h3 className="md-card-title">Match Statistics</h3>
                <p className="md-no-data">Statistics not available for this match</p>
              </div>
            ) : null}

            {/* Lineups */}
            {(match.homeTeam?.lineup?.length > 0 || match.awayTeam?.lineup?.length > 0) && (
              <div className="md-card md-lineups-card">
                <h3 className="md-card-title">
                  Starting XI
                  {match._ai_enriched && (
                    <span className="md-ai-badge">AI-Powered</span>
                  )}
                </h3>
                <div className="md-lineups-columns">
                  {/* Home lineup */}
                  <div className="md-lineup-col">
                    <div className="md-lineup-header">
                      {match.homeTeam?.crest && (
                        <img src={match.homeTeam.crest} alt="" className="md-lineup-crest" />
                      )}
                      <span className="md-lineup-team-name">
                        {match.homeTeam?.shortName || match.homeTeam?.name || 'Home'}
                      </span>
                      {match.homeTeam?.formation && (
                        <span className="md-lineup-formation">({match.homeTeam.formation})</span>
                      )}
                    </div>
                    {match.homeTeam?.lineup?.map((player, i) => (
                      <div key={i} className="md-player-row">
                        <span className="md-player-number">{player.shirtNumber || ''}</span>
                        <span className="md-player-name">{player.name}</span>
                        <span className="md-player-pos">{player.position || ''}</span>
                      </div>
                    ))}

                    {/* Home bench */}
                    {match.homeTeam?.bench?.length > 0 && (
                      <>
                        <div className="md-bench-label">Substitutes</div>
                        {match.homeTeam.bench.map((player, i) => (
                          <div key={`hb-${i}`} className="md-player-row md-bench-player">
                            <span className="md-player-number">{player.shirtNumber || ''}</span>
                            <span className="md-player-name">{player.name}</span>
                            <span className="md-player-pos">{player.position || ''}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Home coach */}
                    {match.homeTeam?.coach?.name && (
                      <div className="md-coach-row">
                        <span className="md-coach-label">Coach:</span>
                        <span className="md-coach-name">{match.homeTeam.coach.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Away lineup */}
                  <div className="md-lineup-col">
                    <div className="md-lineup-header">
                      {match.awayTeam?.crest && (
                        <img src={match.awayTeam.crest} alt="" className="md-lineup-crest" />
                      )}
                      <span className="md-lineup-team-name">
                        {match.awayTeam?.shortName || match.awayTeam?.name || 'Away'}
                      </span>
                      {match.awayTeam?.formation && (
                        <span className="md-lineup-formation">({match.awayTeam.formation})</span>
                      )}
                    </div>
                    {match.awayTeam?.lineup?.map((player, i) => (
                      <div key={i} className="md-player-row">
                        <span className="md-player-number">{player.shirtNumber || ''}</span>
                        <span className="md-player-name">{player.name}</span>
                        <span className="md-player-pos">{player.position || ''}</span>
                      </div>
                    ))}

                    {/* Away bench */}
                    {match.awayTeam?.bench?.length > 0 && (
                      <>
                        <div className="md-bench-label">Substitutes</div>
                        {match.awayTeam.bench.map((player, i) => (
                          <div key={`ab-${i}`} className="md-player-row md-bench-player">
                            <span className="md-player-number">{player.shirtNumber || ''}</span>
                            <span className="md-player-name">{player.name}</span>
                            <span className="md-player-pos">{player.position || ''}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Away coach */}
                    {match.awayTeam?.coach?.name && (
                      <div className="md-coach-row">
                        <span className="md-coach-label">Coach:</span>
                        <span className="md-coach-name">{match.awayTeam.coach.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Substitutions */}
            {match.substitutions && match.substitutions.length > 0 && (
              <div className="md-card">
                <h3 className="md-card-title">Substitutions</h3>
                <div className="md-subs-list">
                  {match.substitutions.map((sub, i) => (
                    <div key={i} className="md-sub-row">
                      <span className="md-sub-minute">{sub.minute}&apos;</span>
                      <span className="md-sub-in">↑ {sub.playerIn?.name || '?'}</span>
                      <span className="md-sub-out">↓ {sub.playerOut?.name || '?'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            {match.bookings && match.bookings.length > 0 && (
              <div className="md-card">
                <h3 className="md-card-title">Bookings</h3>
                <div className="md-bookings-list">
                  {match.bookings.map((booking, i) => (
                    <div key={i} className="md-booking-row">
                      <span className="md-booking-minute">{booking.minute}&apos;</span>
                      <span
                        className={`md-booking-card-icon ${
                          booking.card === 'YELLOW' ? 'yellow' : 'red'
                        }`}
                      />
                      <span className="md-booking-player">
                        {booking.player?.name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referees */}
            {match.referees && match.referees.length > 0 && (
              <div className="md-card">
                <h3 className="md-card-title">Officials</h3>
                <div className="md-referees-list">
                  {match.referees.map((ref, i) => (
                    <div key={i} className="md-referee-row">
                      <span className="md-referee-role">
                        {ref.type === 'REFEREE'
                          ? 'Referee'
                          : ref.type === 'ASSISTANT_REFEREE_N1'
                            ? 'Assistant 1'
                            : ref.type === 'ASSISTANT_REFEREE_N2'
                              ? 'Assistant 2'
                              : ref.type === 'FOURTH_OFFICIAL'
                                ? 'Fourth Official'
                                : ref.type === 'VIDEO_ASSISTANT_REFEREE_N1'
                                  ? 'VAR'
                                  : ref.type || 'Official'}
                      </span>
                      <span className="md-referee-name">{ref.name}</span>
                      {ref.nationality && (
                        <span className="md-referee-nat">{ref.nationality}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match Info */}
            <div className="md-card md-info-card">
              <h3 className="md-card-title">Match Info</h3>
              <div className="md-info-grid">
                {match.competition?.name && (
                  <div className="md-info-item">
                    <span className="md-info-label">Competition</span>
                    <span className="md-info-value">{match.competition.name}</span>
                  </div>
                )}
                {match.season?.startDate && (
                  <div className="md-info-item">
                    <span className="md-info-label">Season</span>
                    <span className="md-info-value">
                      {new Date(match.season.startDate).getFullYear()}/
                      {new Date(match.season.endDate || match.season.startDate).getFullYear()}
                    </span>
                  </div>
                )}
                {match.matchday && (
                  <div className="md-info-item">
                    <span className="md-info-label">Matchday</span>
                    <span className="md-info-value">{match.matchday}</span>
                  </div>
                )}
                {match.stage && (
                  <div className="md-info-item">
                    <span className="md-info-label">Stage</span>
                    <span className="md-info-value">
                      {match.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {match.group && (
                  <div className="md-info-item">
                    <span className="md-info-label">Group</span>
                    <span className="md-info-value">
                      {match.group.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                <div className="md-info-item">
                  <span className="md-info-label">Match ID</span>
                  <span className="md-info-value">{match.id}</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MatchDetail;
