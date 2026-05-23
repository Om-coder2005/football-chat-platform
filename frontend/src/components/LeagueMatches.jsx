import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchAPI } from '../services/api';
import { formatTime, getStatusLabel, getStatusColor } from '../utils/formatters';
import AppHeader from './AppHeader';

const STATUS_FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'SCHEDULED', label: 'UPCOMING' },
  { key: 'IN_PLAY', label: 'LIVE' },
  { key: 'FINISHED', label: 'RESULTS' },
];

const LeagueMatches = () => {
  const { competitionId } = useParams();
  const [matches, setMatches] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeView, setActiveView] = useState('matches');

  useEffect(() => { fetchLeagueData(); }, [competitionId]);

  const fetchLeagueData = async () => {
    setLoading(true);
    try {
      const response = await matchAPI.getCompetitionMatches(competitionId);
      if (response.data.success) {
        const matchList = response.data.matches || [];
        setMatches(matchList);
        if (matchList.length > 0 && matchList[0].competition) setCompetition(matchList[0].competition);
      }
    } catch {}

    try {
      const standingsRes = await matchAPI.getCompetitionStandings(competitionId);
      if (standingsRes.data.success && standingsRes.data.standings?.length > 0) {
        setStandings(standingsRes.data.standings);
        if (!competition && standingsRes.data.competition) setCompetition(standingsRes.data.competition);
      }
    } catch {}

    setLoading(false);
  };



  const getFilteredMatches = () => {
    if (activeFilter === 'all') return matches;
    if (activeFilter === 'IN_PLAY') return matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED');
    return matches.filter((m) => m.status === activeFilter);
  };

  const groupByMatchday = (matchList) => {
    const groups = {};
    matchList.forEach((m) => {
      const md = m.matchday || 'Other';
      if (!groups[md]) groups[md] = [];
      groups[md].push(m);
    });
    return Object.entries(groups)
      .map(([matchday, dayMatches]) => ({
        matchday: matchday === 'Other' ? matchday : `MATCHDAY ${matchday}`,
        matches: dayMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)),
      }))
      .sort((a, b) => {
        const aNum = parseInt(a.matchday.replace('MATCHDAY ', ''));
        const bNum = parseInt(b.matchday.replace('MATCHDAY ', ''));
        if (isNaN(aNum) || isNaN(bNum)) return 0;
        return bNum - aNum;
      });
  };

  const filteredMatches = getFilteredMatches();
  const matchdayGroups = groupByMatchday(filteredMatches);
  const getTableRows = () => {
    if (!standings?.length) return [];
    const totalStanding = standings.find((s) => s.type === 'TOTAL') || standings[0];
    return totalStanding?.table || [];
  };
  const tableRows = getTableRows();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* League Hero */}
        <div className="neu-card bg-black text-white mb-8 flex flex-col md:flex-row items-center gap-6 border-4 border-black shadow-[8px_8px_0px_0px_#ff3b30]">
          <Link to="/live-scores" className="font-archivo text-sm uppercase hover:text-yellow-400 self-start transition-colors">
            ← BACK TO SCORES
          </Link>
          <div className="flex items-center gap-6 flex-1">
            {competition?.emblem && (
              <img src={competition.emblem} alt="" className="w-24 h-24 object-contain drop-shadow-md" />
            )}
            <div>
              <h1 className="neu-heading text-6xl text-white">{competition?.name || `Competition ${competitionId}`}</h1>
              <p className="font-archivo text-xl text-yellow-400 uppercase tracking-widest">{competition?.area?.name}</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex border-4 border-black mb-10 shadow-[8px_8px_0px_0px_#000]">
          <button
            className={`flex-1 py-5 font-archivo text-2xl uppercase transition-colors ${activeView === 'matches' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
            onClick={() => setActiveView('matches')}
          >
            MATCHES
          </button>
          {tableRows.length > 0 && (
            <button
              className={`flex-1 py-5 font-archivo text-2xl uppercase border-l-4 border-black transition-colors ${activeView === 'standings' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
              onClick={() => setActiveView('standings')}
            >
              STANDINGS
            </button>
          )}
        </div>

        {loading ? (
          <div className="neu-card bg-white text-center py-24">
            <p className="neu-heading text-5xl animate-pulse">LOADING...</p>
          </div>
        ) : activeView === 'matches' ? (
          <>
            {/* Status Filters */}
            <div className="flex gap-4 mb-10 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`font-archivo text-base uppercase border-4 border-black px-5 py-3 transition-transform hover:-translate-y-1 ${activeFilter === f.key ? 'bg-black text-white shadow-[6px_6px_0px_0px_#ff3b30] scale-105' : 'bg-white shadow-[6px_6px_0px_0px_#000]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredMatches.length === 0 ? (
              <div className="neu-card bg-yellow-100 text-center py-20 border-4 border-black shadow-[8px_8px_0px_0px_#000] rotate-1">
                <p className="text-7xl mb-6">⚽</p>
                <p className="font-archivo text-4xl uppercase">No Matches Found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {matchdayGroups.map((group) => (
                  <div key={group.matchday} className="neu-card bg-white overflow-visible">
                    <div className="flex items-center gap-4 -mx-6 px-6 -mt-6 pt-4 pb-4 mb-4 bg-black text-white border-b-4 border-black">
                      <span className="font-bebas text-3xl tracking-widest">{group.matchday}</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {group.matches.map((match) => (
                        <Link
                          key={match.id}
                          to={`/match/${match.id}`}
                          className="flex items-center gap-4 bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] transition-all group"
                        >
                          <div className="w-24 flex-shrink-0 text-center">
                            <span className={`font-archivo text-sm px-3 py-1 border-2 border-black ${getStatusColor(match.status)}`}>
                              {getStatusLabel(match.status)}
                            </span>
                            <p className="font-poppins text-xs text-gray-500 mt-2 font-bold">{match.utcDate ? new Date(match.utcDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}</p>
                            <p className="font-poppins text-xs text-gray-500 font-bold">{formatTime(match.utcDate)}</p>
                          </div>

                          <div className="flex items-center gap-3 flex-1 justify-end">
                            <span className="font-archivo text-base uppercase text-right hidden sm:block">
                              {match.homeTeam?.shortName || match.homeTeam?.name}
                            </span>
                            {match.homeTeam?.crest && <img src={match.homeTeam.crest} alt="" className="w-8 h-8 object-contain" />}
                          </div>

                          <div className="flex-shrink-0 w-28 text-center">
                            <span className="font-bebas text-3xl bg-black text-white px-4 py-1 border-2 border-black group-hover:bg-red-500 transition-colors">
                              {match.score?.fullTime?.home != null ? `${match.score.fullTime.home}-${match.score.fullTime.away}` : 'VS'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-1">
                            {match.awayTeam?.crest && <img src={match.awayTeam.crest} alt="" className="w-8 h-8 object-contain" />}
                            <span className="font-archivo text-base uppercase hidden sm:block">
                              {match.awayTeam?.shortName || match.awayTeam?.name}
                            </span>
                          </div>

                          <span className="font-archivo text-2xl text-gray-300 group-hover:text-black group-hover:translate-x-2 transition-all hidden md:block">→</span>
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
          <div className="neu-card bg-white overflow-x-auto border-4 border-black shadow-[8px_8px_0px_0px_#000]">
            <h3 className="font-bebas text-5xl uppercase border-b-4 border-black pb-4 mb-6 tracking-wide">LEAGUE TABLE</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white border-4 border-black">
                  {['#', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map((h) => (
                    <th key={h} className="font-archivo text-lg py-4 px-3 text-center first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => (
                  <tr key={row.team?.id || row.position} className={`border-b-4 border-black hover:bg-yellow-200 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="font-archivo text-xl py-4 px-3 text-left font-bold">{row.position}</td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        {row.team?.crest && <img src={row.team.crest} alt="" className="w-8 h-8 object-contain" />}
                        <span className="font-archivo text-base uppercase">{row.team?.shortName || row.team?.name}</span>
                      </div>
                    </td>
                    {[row.playedGames, row.won, row.draw, row.lost, row.goalsFor, row.goalsAgainst, row.goalDifference].map((v, i) => (
                      <td key={i} className="font-poppins font-bold text-base text-center py-4 px-3">{v}</td>
                    ))}
                    <td className="font-archivo text-2xl text-center py-4 px-3 bg-yellow-300 border-l-4 border-black">{row.points}</td>
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
