import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import AppHeader from './AppHeader';
import { formatTime, formatDateParam, getStatusLabel, getStatusColor } from '../utils/formatters';
import { Activity, Calendar, ChevronLeft, ChevronRight, Trophy, AlertTriangle, ArrowRight } from 'lucide-react';

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



const LiveScores = () => {
  const [groupedMatches, setGroupedMatches] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [matchError, setMatchError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDisplayDate = () => {
    const today = new Date();
    const sel = selectedDate;
    const isToday = sel.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = sel.toDateString() === yesterday.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = sel.toDateString() === tomorrow.toDateString();

    let prefix = '';
    if (isToday) prefix = 'TODAY — ';
    else if (isYesterday) prefix = 'YESTERDAY — ';
    else if (isTomorrow) prefix = 'TOMORROW — ';

    return prefix + sel.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).toUpperCase();
  };

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => setSelectedDate(new Date());

  useEffect(() => { fetchMatchesForDate(); }, [selectedDate]);
  useEffect(() => { fetchCompetitions(); }, []);

  const fetchMatchesForDate = async () => {
    setLoadingMatches(true);
    setMatchError('');
    setGroupedMatches([]);
    try {
      const dateStr = formatDateParam(selectedDate);
      const response = await matchAPI.getMatchesByDate(dateStr, dateStr);
      if (response.data.success) {
        const matches = response.data.matches || [];
        const groups = {};
        matches.forEach((match) => {
          const comp = match.competition || {};
          const compId = comp.id || 0;
          if (!groups[compId]) groups[compId] = { competition: comp, matches: [] };
          groups[compId].matches.push(match);
        });
        const grouped = Object.values(groups).sort((a, b) =>
          (a.competition?.name || '').localeCompare(b.competition?.name || '')
        );
        setGroupedMatches(grouped);
      }
    } catch {
      setMatchError('Unable to load matches. Please try again later.');
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchCompetitions = async () => {
    try {
      const response = await matchAPI.getAvailableCompetitions();
      if (response.data.success && response.data.competitions?.length > 0) {
        setCompetitions(response.data.competitions);
      } else {
        setCompetitions(FREE_TIER_LEAGUES);
      }
    } catch {
      setCompetitions(FREE_TIER_LEAGUES);
    } finally {
      setLoadingLeagues(false);
    }
  };



  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12 border-b-8 border-black pb-8 relative overflow-hidden">
          <div className="comic-sticker-abs top-0 right-4 rotate-[-8deg] bg-red-500 text-white text-xl px-4 py-2 hidden md:flex items-center gap-2">
            <Activity size={24} /> MATCHDAY
          </div>
          <h1 className="neu-heading text-7xl md:text-[110px] tracking-tight">LIVE SCORES</h1>
          <p className="font-poppins font-bold text-2xl bg-yellow-300 inline-block px-5 py-3 border-4 border-black rotate-2 shadow-[6px_6px_0px_0px_#000] mt-4">
            The Terraces' Source of Truth
          </p>
        </div>

        {/* Date Nav */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={goToPreviousDay}
            className="neu-button-secondary py-3 px-5 text-2xl"
            aria-label="Previous day"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="flex-1 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-5 text-center">
            <span className="font-archivo text-2xl uppercase tracking-widest flex items-center justify-center gap-3">
              <Calendar size={24} /> {getDisplayDate()}
            </span>
          </div>
          <button
            onClick={goToNextDay}
            className="neu-button-secondary py-3 px-5 text-2xl"
            aria-label="Next day"
          >
            <ChevronRight size={24} />
          </button>
          {formatDateParam(selectedDate) !== formatDateParam(new Date()) && (
            <button
              onClick={goToToday}
              className="neu-button bg-yellow-400 text-black py-3 px-4 text-sm"
            >
              TODAY
            </button>
          )}
        </div>

        {/* Matches Section */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-bebas text-6xl tracking-widest uppercase">FIXTURES & RESULTS</h2>
            <div className="h-2 flex-1 bg-black"></div>
          </div>

          {loadingMatches ? (
            <div className="neu-card bg-white text-center py-16">
              <p className="neu-heading text-5xl animate-pulse">LOADING MATCHES...</p>
            </div>
          ) : matchError ? (
            <div className="neu-card bg-red-100 text-center py-16">
              <p className="font-archivo text-3xl mb-6 text-red-800 uppercase">⚠️ {matchError}</p>
              <button className="neu-button bg-red-500 text-white" onClick={fetchMatchesForDate}>
                TRY AGAIN
              </button>
            </div>
          ) : groupedMatches.length === 0 ? (
            <div className="neu-card bg-yellow-100 text-center py-16 flex flex-col items-center">
              <div className="w-28 h-28 bg-yellow-400 border-4 border-black flex items-center justify-center shadow-[8px_8px_0px_0px_#000] mb-8 rotate-3">
                <Activity size={56} color="#000" />
              </div>
              <p className="font-archivo text-4xl uppercase mb-3">No Matches On This Date</p>
              <p className="font-poppins font-bold text-lg opacity-70">Try a different date or browse the leagues below</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {groupedMatches.map((group) => (
                <div key={group.competition?.id || Math.random()} className="neu-card bg-white overflow-visible">
                  {/* League Header */}
                  <div className="flex items-center gap-4 mb-6 border-b-4 border-black pb-4 -mx-6 px-6 -mt-6 pt-6 bg-black text-white">
                    {group.competition?.emblem && (
                      <img src={group.competition.emblem} alt="" className="w-10 h-10 object-contain" />
                    )}
                    <span className="font-bebas text-3xl tracking-widest">
                      {group.competition?.name || 'Unknown League'}
                    </span>
                    <span className="font-archivo text-sm text-yellow-400 ml-auto uppercase">
                      {group.competition?.area?.name || ''}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {group.matches.map((match) => (
                      <Link
                        key={match.id}
                        to={`/match/${match.id}`}
                        className="flex items-center gap-4 bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all group"
                      >
                        {/* Status */}
                        <div className="w-20 flex-shrink-0 text-center">
                          <span className={`font-archivo text-sm px-3 py-1 border-2 border-black ${getStatusColor(match.status)}`}>
                            {getStatusLabel(match.status)}
                          </span>
                          <p className="font-poppins font-bold text-sm mt-2 opacity-70">{formatTime(match.utcDate)}</p>
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="font-archivo text-base uppercase text-right hidden sm:block">
                            {match.homeTeam?.shortName || match.homeTeam?.name || 'Home'}
                          </span>
                          {match.homeTeam?.crest && (
                            <img src={match.homeTeam.crest} alt="" className="w-8 h-8 object-contain" />
                          )}
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0 w-28 text-center">
                          <span className="font-bebas text-4xl bg-black text-white px-5 py-2 border-2 border-black shadow-[4px_4px_0px_0px_#ff3b30] group-hover:shadow-[6px_6px_0px_0px_#ff3b30] transition-shadow">
                            {match.score?.fullTime?.home != null
                              ? `${match.score.fullTime.home}-${match.score.fullTime.away}`
                              : 'VS'}
                          </span>
                          {match.score?.halfTime?.home != null && (
                            <p className="font-poppins text-xs opacity-70 mt-2 font-bold">HT: {match.score.halfTime.home}-{match.score.halfTime.away}</p>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-3 flex-1">
                          {match.awayTeam?.crest && (
                            <img src={match.awayTeam.crest} alt="" className="w-8 h-8 object-contain" />
                          )}
                          <span className="font-archivo text-base uppercase hidden sm:block">
                            {match.awayTeam?.shortName || match.awayTeam?.name || 'Away'}
                          </span>
                        </div>

                        <span className="font-archivo opacity-40 group-hover:opacity-100 transition-opacity hidden md:block">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Browse Leagues Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-bebas text-6xl tracking-widest uppercase">BROWSE LEAGUES</h2>
            <div className="h-2 flex-1 bg-black"></div>
          </div>
          <p className="font-poppins font-bold text-xl mb-8 bg-white border-4 border-black inline-block px-5 py-3 shadow-[6px_6px_0px_0px_#000] -rotate-2">
            Select a league to view all fixtures and results
          </p>

          {loadingLeagues ? (
            <div className="neu-card bg-white text-center py-16">
              <p className="neu-heading text-4xl animate-pulse">LOADING LEAGUES...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitions.map((comp, i) => (
                <Link
                  key={comp.id}
                  to={`/league/${comp.id}`}
                  className="neu-box bg-white flex items-center gap-4 p-5 group"
                  style={{ transform: `rotate(${i % 3 === 0 ? '-1deg' : i % 3 === 1 ? '0.5deg' : '1deg'})` }}
                >
                  <div className="w-16 h-16 border-4 border-black flex items-center justify-center flex-shrink-0 bg-gray-100">
                    {comp.emblem ? (
                      <img src={comp.emblem} alt="" className="w-12 h-12 object-contain" />
                    ) : (
                      <Trophy size={32} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-archivo uppercase text-lg group-hover:underline line-clamp-1">{comp.name}</h3>
                    <span className="font-poppins font-bold text-sm opacity-70">{comp.area?.name || comp.country || ''}</span>
                  </div>
                  <span className="font-archivo text-xl group-hover:translate-x-2 transition-transform">→</span>
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
