import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { matchAPI } from '../services/api';
import AppHeader from './AppHeader';
import { ChevronLeft, AlertTriangle, Activity, Shield, Info, Calendar, Clock, Trophy, Sparkles, RefreshCw } from 'lucide-react';

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => { fetchMatchDetails(); }, [matchId]);

  useEffect(() => {
    if (match && !aiSummary) {
      fetchTacticalSummary();
    }
  }, [match]);

  const fetchTacticalSummary = async () => {
    if (!matchId) return;
    setLoadingAI(true);
    try {
      // For global MatchDetail, we pass communityId as null or a special value if we don't have context
      // The backend will handle empty chat messages
      const res = await matchAPI.getTacticalSummary(matchId, null);
      if (res.data.success) {
        setAiSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Tactical summary error:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const fetchMatchDetails = async () => {
    setLoading(true); setError('');
    try {
      const response = await matchAPI.getMatchDetails(matchId);
      if (response.data.success && response.data.match) setMatch(response.data.match);
      else setError('Match not found');
    } catch { setError('Unable to load match details. Please try again.'); }
    finally { setLoading(false); }
  };

  const formatFullDate = (utcDate) => {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (utcDate) => {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusLabel = (status) => {
    const map = { SCHEDULED: 'Scheduled', TIMED: 'Upcoming', IN_PLAY: 'LIVE', PAUSED: 'Half Time', FINISHED: 'Full Time', SUSPENDED: 'Suspended', POSTPONED: 'Postponed', CANCELLED: 'Cancelled', AWARDED: 'Awarded' };
    return map[status] || status || '';
  };

  const isLive = match?.status === 'IN_PLAY' || match?.status === 'PAUSED';

  const getGoalsByTeam = () => {
    if (!match?.goals?.length) return { homeGoals: [], awayGoals: [] };
    const homeId = match.homeTeam?.id;
    const homeGoals = [], awayGoals = [];
    match.goals.forEach((g) => { if (g.team?.id === homeId) homeGoals.push(g); else awayGoals.push(g); });
    return { homeGoals, awayGoals };
  };

  const getMatchStats = () => {
    if (!match) return null;
    const home = match.homeTeam?.statistics, away = match.awayTeam?.statistics;
    if (!home || !away) return null;
    return [
      { label: 'Possession', home: home.ball_possession || 0, away: away.ball_possession || 0, suffix: '%', isPct: true },
      { label: 'Total Shots', home: home.total_shots || home.shots || 0, away: away.total_shots || away.shots || 0 },
      { label: 'Shots on Target', home: home.shots_on_target || home.shots_on_goal || 0, away: away.shots_on_target || away.shots_on_goal || 0 },
      { label: 'Corner Kicks', home: home.corner_kicks || 0, away: away.corner_kicks || 0 },
      { label: 'Fouls', home: home.fouls || 0, away: away.fouls || 0 },
      { label: 'Yellow Cards', home: home.yellow_cards || 0, away: away.yellow_cards || 0 },
      { label: 'Red Cards', home: home.red_cards || 0, away: away.red_cards || 0 },
    ];
  };

  const { homeGoals, awayGoals } = match ? getGoalsByTeam() : { homeGoals: [], awayGoals: [] };
  const matchStats = match ? getMatchStats() : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="neu-button-secondary mb-8 py-2 px-6 flex items-center gap-2 text-sm"
        >
          <ChevronLeft size={16} /> BACK
        </button>

        {loading ? (
          <div className="neu-card bg-white text-center py-24">
            <p className="neu-heading text-5xl animate-pulse">LOADING...</p>
          </div>
        ) : error ? (
          <div className="neu-card bg-red-100 text-center py-16 flex flex-col items-center">
            <AlertTriangle size={48} className="text-red-800 mb-4" />
            <p className="font-archivo text-3xl uppercase text-red-800 mb-6">{error}</p>
            <button className="neu-button bg-red-500 text-white" onClick={fetchMatchDetails}>TRY AGAIN</button>
          </div>
        ) : match ? (
          <div className="flex flex-col gap-8">
            {/* Competition Banner */}
            <div className="neu-card bg-black text-white flex items-center gap-4 py-4">
              {match.competition?.emblem && (
                <img src={match.competition.emblem} alt="" className="w-12 h-12 object-contain" />
              )}
              <div>
                <Link to={`/league/${match.competition?.id}`} className="font-bebas text-3xl tracking-widest hover:text-yellow-400 transition-colors">
                  {match.competition?.name || 'Competition'}
                </Link>
                {match.matchday && <span className="font-archivo text-yellow-400 text-sm ml-4">MATCHDAY {match.matchday}</span>}
              </div>
              <span className="ml-auto font-inter font-bold opacity-60">{match.area?.name || match.competition?.area?.name}</span>
            </div>

            {/* Date Bar */}
            <div className="flex flex-wrap gap-4 items-center">
              <span className="font-archivo text-xl uppercase bg-yellow-300 px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000]">{formatFullDate(match.utcDate)}</span>
              <span className="font-inter font-bold bg-white border-2 border-black px-4 py-2 shadow-[3px_3px_0px_0px_#000]">KO: {formatTime(match.utcDate)}</span>
              {match.venue && <span className="font-inter font-bold bg-gray-100 border-2 border-black px-4 py-2 shadow-[3px_3px_0px_0px_#000]">📍 {match.venue}</span>}
            </div>

            {/* SCOREBOARD — Hero Card */}
            <div className={`neu-card bg-white relative overflow-hidden ${isLive ? 'ring-4 ring-red-500' : ''}`}>
              {isLive && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500 animate-pulse"></div>
              )}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-8">
                {/* Home Team */}
                <div className="flex flex-col items-center gap-4 flex-1">
                  {match.homeTeam?.crest ? (
                    <img src={match.homeTeam.crest} alt="" className="w-24 h-24 object-contain drop-shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 border-4 border-black flex items-center justify-center font-bebas text-4xl">
                      {match.homeTeam?.tla || 'H'}
                    </div>
                  )}
                  <h2 className="font-archivo text-2xl uppercase text-center">{match.homeTeam?.shortName || match.homeTeam?.name}</h2>
                  {match.homeTeam?.formation && <span className="font-inter font-bold text-sm bg-gray-100 border-2 border-black px-2 py-0.5">{match.homeTeam.formation}</span>}
                </div>

                {/* Score */}
                <div className="flex flex-col items-center gap-3">
                  <span className={`font-archivo text-sm uppercase px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000] ${isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-black text-white'}`}>
                    {getStatusLabel(match.status)}
                    {match.minute ? ` ${match.minute}'` : ''}
                  </span>
                  <span className="font-bebas text-8xl leading-none bg-black text-white px-8 py-4 border-4 border-black shadow-[8px_8px_0px_0px_#ff3b30]">
                    {match.score?.fullTime?.home ?? '-'} – {match.score?.fullTime?.away ?? '-'}
                  </span>
                  {match.score?.halfTime?.home != null && (
                    <span className="font-archivo text-sm bg-gray-200 border-2 border-black px-3 py-1">
                      HT: {match.score.halfTime.home} – {match.score.halfTime.away}
                    </span>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-4 flex-1">
                  {match.awayTeam?.crest ? (
                    <img src={match.awayTeam.crest} alt="" className="w-24 h-24 object-contain drop-shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 border-4 border-black flex items-center justify-center font-bebas text-4xl">
                      {match.awayTeam?.tla || 'A'}
                    </div>
                  )}
                  <h2 className="font-archivo text-2xl uppercase text-center">{match.awayTeam?.shortName || match.awayTeam?.name}</h2>
                  {match.awayTeam?.formation && <span className="font-inter font-bold text-sm bg-gray-100 border-2 border-black px-2 py-0.5">{match.awayTeam.formation}</span>}
                </div>
              </div>
            </div>

            {/* Tactical Insight Card */}
            {(isLive || match.status === 'FINISHED') && (
              <div className="neu-card bg-black text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
                <div className="relative z-10">
                  <h3 className="font-bebas text-3xl mb-4 flex items-center gap-2 text-yellow-400">
                    <Sparkles size={24} /> AI TACTICAL INSIGHT
                  </h3>
                  
                  {loadingAI ? (
                    <div className="flex items-center gap-3 py-4 text-gray-400 animate-pulse">
                      <RefreshCw size={20} className="animate-spin" />
                      <span className="font-archivo uppercase text-xl">Analyzing Match Data...</span>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-6">
                      <div className="border-l-4 border-yellow-400 pl-6">
                        <p className="font-archivo text-sm text-yellow-400 uppercase mb-2 tracking-widest">Manager's Tactical Report</p>
                        <p className="font-inter text-xl leading-relaxed italic text-gray-100 font-bold">
                          "{aiSummary.tactical_analysis}"
                        </p>
                      </div>
                      
                      {aiSummary.fan_sentiment && (
                        <div className="bg-white/5 p-4 border border-white/10 rounded-sm">
                          <p className="font-archivo text-xs text-gray-400 uppercase mb-1">Community Pulse</p>
                          <p className="font-inter text-sm text-gray-300">{aiSummary.fan_sentiment}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 font-inter">Tactical analysis will be available once the match reaches key milestones.</p>
                  )}
                </div>
              </div>
            )}

            {/* Goals */}
            {match.goals?.length > 0 && (
              <div className="neu-card bg-white">
                <h3 className="font-bebas text-4xl uppercase border-b-4 border-black pb-3 mb-4">⚽ Goals</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-archivo uppercase text-sm mb-3 bg-black text-white px-3 py-1 inline-block">{match.homeTeam?.shortName}</h4>
                    {homeGoals.length > 0 ? homeGoals.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2 font-inter font-bold text-sm">
                        <span className="bg-yellow-300 border border-black px-2 py-0.5 font-archivo text-xs">{g.minute}'</span>
                        <span>{g.scorer?.name || 'Unknown'}</span>
                        {g.assist?.name && <span className="opacity-60 text-xs">(ast. {g.assist.name})</span>}
                        {g.type === 'PENALTY' && <span className="text-xs text-red-600 font-bold">(P)</span>}
                        {g.type === 'OWN' && <span className="text-xs text-orange-600 font-bold">(OG)</span>}
                      </div>
                    )) : <p className="font-inter opacity-40 font-bold">–</p>}
                  </div>
                  <div>
                    <h4 className="font-archivo uppercase text-sm mb-3 bg-black text-white px-3 py-1 inline-block">{match.awayTeam?.shortName}</h4>
                    {awayGoals.length > 0 ? awayGoals.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2 font-inter font-bold text-sm justify-end">
                        {g.type === 'OWN' && <span className="text-xs text-orange-600 font-bold">(OG)</span>}
                        {g.type === 'PENALTY' && <span className="text-xs text-red-600 font-bold">(P)</span>}
                        {g.assist?.name && <span className="text-gray-500 text-xs">(ast. {g.assist.name})</span>}
                        <span>{g.scorer?.name || 'Unknown'}</span>
                        <span className="bg-yellow-300 border border-black px-2 py-0.5 font-archivo text-xs">{g.minute}'</span>
                      </div>
                    )) : <p className="font-inter opacity-40 font-bold text-right">–</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Match Stats */}
            {matchStats && (
              <div className="neu-card bg-white">
                <h3 className="font-bebas text-4xl uppercase border-b-4 border-black pb-3 mb-6">MATCH STATISTICS</h3>
                <div className="flex flex-col gap-4">
                  {matchStats.map((stat) => {
                    const total = stat.home + stat.away || 1;
                    const leftPct = stat.isPct ? stat.home : (stat.home / total) * 100;
                    const rightPct = stat.isPct ? stat.away : (stat.away / total) * 100;
                    return (
                      <div key={stat.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-archivo text-lg">{stat.home}{stat.suffix || ''}</span>
                          <span className="font-inter font-bold text-sm opacity-60 uppercase">{stat.label}</span>
                          <span className="font-archivo text-lg">{stat.away}{stat.suffix || ''}</span>
                        </div>
                        <div className="h-4 bg-gray-200 border-2 border-black flex overflow-hidden">
                          <div className="bg-black transition-all" style={{ width: `${Math.max(leftPct, 2)}%` }}></div>
                          <div className="bg-red-500 transition-all" style={{ width: `${Math.max(rightPct, 2)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lineups */}
            {(match.homeTeam?.lineup?.length > 0 || match.awayTeam?.lineup?.length > 0) && (
              <div className="neu-card bg-white">
                <h3 className="font-bebas text-4xl uppercase border-b-4 border-black pb-3 mb-4">STARTING XI</h3>
                <div className="grid grid-cols-2 gap-6">
                  {[{ team: match.homeTeam }, { team: match.awayTeam }].map(({ team }) => (
                    <div key={team?.id}>
                      <div className="flex items-center gap-3 mb-4">
                        {team?.crest && <img src={team.crest} alt="" className="w-8 h-8 object-contain" />}
                        <h4 className="font-archivo uppercase">{team?.shortName || team?.name}</h4>
                        {team?.formation && <span className="font-inter font-bold text-xs bg-gray-100 border border-black px-2 py-0.5">{team.formation}</span>}
                      </div>
                      {team?.lineup?.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-100">
                          <span className="font-archivo w-6 text-center text-sm bg-black text-white">{p.shirtNumber || '-'}</span>
                          <span className="font-inter font-bold text-sm flex-1">{p.name}</span>
                          <span className="font-inter text-xs opacity-60">{p.position || ''}</span>
                        </div>
                      ))}
                      {team?.bench?.length > 0 && (
                        <div className="mt-3">
                          <p className="font-archivo text-xs uppercase opacity-60 mb-2 border-t border-black pt-2">SUBSTITUTES</p>
                          {team.bench.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 py-1 opacity-70">
                              <span className="font-archivo w-6 text-center text-xs bg-gray-400 text-white">{p.shirtNumber || '-'}</span>
                              <span className="font-inter font-bold text-xs flex-1">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {team?.coach?.name && (
                        <p className="mt-3 font-inter font-bold text-sm border-t-2 border-black pt-2">
                          <span className="font-archivo uppercase text-xs">Coach: </span>{team.coach.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            {match.bookings?.length > 0 && (
              <div className="neu-card bg-white">
                <h3 className="font-bebas text-4xl uppercase border-b-4 border-black pb-3 mb-4">BOOKINGS</h3>
                <div className="flex flex-col gap-2">
                  {match.bookings.map((b, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-100">
                      <span className="font-archivo text-sm bg-gray-100 border border-black px-2 py-0.5">{b.minute}'</span>
                      <span className={`w-4 h-6 border border-black ${b.card === 'YELLOW' ? 'bg-yellow-400' : 'bg-red-600'}`}></span>
                      <span className="font-inter font-bold text-sm">{b.player?.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referees */}
            {match.referees?.length > 0 && (
              <div className="neu-card bg-white">
                <h3 className="font-bebas text-4xl uppercase border-b-4 border-black pb-3 mb-4">OFFICIALS</h3>
                <div className="grid grid-cols-2 gap-4">
                  {match.referees.map((ref, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="font-archivo text-xs uppercase opacity-60">
                        {ref.type === 'REFEREE' ? 'Referee' : ref.type === 'ASSISTANT_REFEREE_N1' ? 'Assistant 1' : ref.type === 'FOURTH_OFFICIAL' ? 'Fourth Official' : ref.type === 'VIDEO_ASSISTANT_REFEREE_N1' ? 'VAR' : ref.type}
                      </span>
                      <span className="font-inter font-bold">{ref.name}</span>
                      {ref.nationality && <span className="font-inter text-xs opacity-60">{ref.nationality}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match Info */}
            <div className="neu-card bg-yellow-50">
              <h3 className="font-bebas text-4xl uppercase border-b-4 border-black pb-3 mb-4">MATCH INFO</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  match.competition?.name && { label: 'Competition', value: match.competition.name },
                  match.matchday && { label: 'Matchday', value: match.matchday },
                  match.stage && { label: 'Stage', value: match.stage.replace(/_/g, ' ') },
                  match.group && { label: 'Group', value: match.group.replace(/_/g, ' ') },
                  { label: 'Match ID', value: match.id },
                ].filter(Boolean).map((item) => (
                  <div key={item.label} className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
                    <p className="font-archivo text-xs uppercase opacity-60">{item.label}</p>
                    <p className="font-inter font-bold text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MatchDetail;
