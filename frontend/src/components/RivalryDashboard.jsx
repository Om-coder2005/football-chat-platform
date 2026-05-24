import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rivalryAPI } from '../services/api';
import AppHeader from './AppHeader';
import { Plus, Swords, Calendar, Play, CheckCircle2, Award, Trophy, Clock, Shield, Sparkles } from 'lucide-react';

const clubInitials = (name = '') => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const ClubMark = ({ club, fallbackName }) => {
  const name = club?.shortName || club?.name || fallbackName;
  const initials = clubInitials(name);

  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0_0_#000]">
      {club?.crest && (
        <img
          src={club.crest}
          alt={`${name || 'Club'} crest`}
          className="h-7 w-7 object-contain"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            event.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      )}
      <span className={club?.crest ? 'hidden' : 'flex h-full w-full items-center justify-center bg-yellow-400 font-archivo text-xs font-black leading-none text-black'}>
        {initials || <Shield size={18} strokeWidth={3} />}
      </span>
    </span>
  );
};

const formatKickoff = (value) => {
  if (!value) return { date: 'Date TBC', time: '' };
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return { date: 'Date TBC', time: '' };
  return {
    date: dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse border-2 border-black bg-gray-200 ${className}`} />
);

const SuggestionSkeletonCard = () => (
  <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
    <div className="flex items-center justify-between gap-3 mb-4">
      <SkeletonBlock className="h-5 w-28" />
      <SkeletonBlock className="h-6 w-24 bg-yellow-200" />
    </div>
    <div className="flex items-center justify-between gap-3 border-b-4 border-black pb-4 mb-3">
      <div className="flex flex-col items-start gap-2 flex-1 min-w-0">
        <SkeletonBlock className="h-10 w-10 rounded-full bg-yellow-200" />
        <SkeletonBlock className="h-7 w-28" />
      </div>
      <SkeletonBlock className="h-8 w-10 bg-red-200" />
      <div className="flex flex-col items-end gap-2 flex-1 min-w-0">
        <SkeletonBlock className="h-10 w-10 rounded-full bg-yellow-200" />
        <SkeletonBlock className="h-7 w-28" />
      </div>
    </div>
    <SkeletonBlock className="h-6 w-40 mb-2" />
    <SkeletonBlock className="h-4 w-full mb-4" />
    <div className="border-2 border-black bg-gray-100 p-3 mb-4">
      <SkeletonBlock className="h-3 w-16 mb-2" />
      <SkeletonBlock className="h-7 w-44" />
    </div>
    <SkeletonBlock className="h-10 w-full bg-black/20" />
  </div>
);

const ArenaSkeletonCard = () => (
  <div className="neu-card bg-white border-4 border-black shadow-[8px_8px_0_0_#000] p-6">
    <div className="flex items-center justify-between mb-4">
      <SkeletonBlock className="h-7 w-28 bg-yellow-200" />
      <SkeletonBlock className="h-4 w-14" />
    </div>
    <div className="flex items-center justify-between gap-2 border-b-4 border-black pb-4 mb-4">
      <div className="flex-1">
        <SkeletonBlock className="h-8 w-28 mb-2" />
        <SkeletonBlock className="h-4 w-14" />
      </div>
      <SkeletonBlock className="h-8 w-10 bg-red-200" />
      <div className="flex-1 flex flex-col items-end">
        <SkeletonBlock className="h-8 w-28 mb-2" />
        <SkeletonBlock className="h-4 w-14" />
      </div>
    </div>
    <div className="border-2 border-black bg-gray-100 p-3 mb-4">
      <SkeletonBlock className="h-3 w-28 mx-auto mb-2" />
      <SkeletonBlock className="h-8 w-44 mx-auto" />
    </div>
    <SkeletonBlock className="h-6 w-full mb-4" />
    <SkeletonBlock className="h-10 w-full bg-black/20" />
  </div>
);

const RivalryDashboard = () => {
  const navigate = useNavigate();
  
  // State
  const [rivalries, setRivalries] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState('');
  const [startingSuggestion, setStartingSuggestion] = useState('');
  
  // Form State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [homeClub, setHomeClub] = useState('');
  const [awayClub, setAwayClub] = useState('');
  const [kickoff, setKickoff] = useState('');
  const [matchId, setMatchId] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all scheduled rivalry sessions
  const fetchRivalries = async () => {
    try {
      setLoading(true);
      const res = await rivalryAPI.getAll();
      if (res.data && res.data.success) {
        setRivalries(res.data.rivalries || []);
      } else {
        setError('Failed to fetch rivalry sessions.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading matches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const res = await rivalryAPI.getSuggestions();
      if (res.data && res.data.success) {
        setSuggestions(res.data.suggestions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchRivalries();
    fetchSuggestions();
  }, []);

  // Handle schedule submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!homeClub || !awayClub || !kickoff) {
      setFormError('Please fill out all required fields.');
      return;
    }
    
    try {
      setSubmitting(true);
      const payload = {
        home_club_name: homeClub,
        away_club_name: awayClub,
        scheduled_kickoff: kickoff,
        match_id: matchId ? parseInt(matchId, 10) : null
      };
      
      const res = await rivalryAPI.schedule(payload);
      if (res.data && res.data.success) {
        // Reset form fields
        setHomeClub('');
        setAwayClub('');
        setKickoff('');
        setMatchId('');
        setShowScheduleForm(false);
        // Refresh list
        fetchRivalries();
        fetchSuggestions();
      } else {
        setFormError(res.data.message || 'Failed to schedule match.');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (suggestion.existing_room_id) {
      navigate(`/rivalry/${suggestion.existing_room_id}`);
      return;
    }

    try {
      setStartingSuggestion(suggestion.slug);
      setError('');
      const res = await rivalryAPI.schedule({
        home_club_name: suggestion.home_club_name,
        away_club_name: suggestion.away_club_name,
        scheduled_kickoff: suggestion.scheduled_kickoff,
        match_id: suggestion.match_id || null,
        status: 'scheduled',
      });
      if (res.data?.success && res.data?.rivalry_room?.id) {
        await fetchRivalries();
        await fetchSuggestions();
        navigate(`/rivalry/${res.data.rivalry_room.id}`);
      } else {
        setError(res.data?.message || 'Could not start this suggested arena.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Sign in to start a suggested rivalry arena.');
    } finally {
      setStartingSuggestion('');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return (
          <span className="flex items-center gap-1 bg-red-500 text-white font-archivo text-xs px-3 py-1 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] uppercase animate-pulse">
            <Play size={12} fill="white" /> Live Arena
          </span>
        );
      case 'finished':
        return (
          <span className="flex items-center gap-1 bg-gray-500 text-white font-archivo text-xs px-3 py-1 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] uppercase">
            <CheckCircle2 size={12} /> Finished
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-yellow-400 text-black font-archivo text-xs px-3 py-1 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] uppercase">
            <Calendar size={12} /> Scheduled
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        
        {/* Banner Card */}
        <div className="neu-card bg-red-500 text-white mb-8 border-4 border-black shadow-[8px_8px_0_0_#000] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 translate-y-[-10px] rotate-12">
            <Swords size={280} color="white" />
          </div>
          <div className="z-10 flex-1">
            <div className="neu-badge bg-black text-yellow-400 border-2 border-black mb-3">
              Flagship Matchday Experience
            </div>
            <h1 className="font-bebas text-5xl md:text-7xl tracking-wider uppercase mb-3 text-white">
              Rivalry Arena duels
            </h1>
            <p className="font-medium text-lg max-w-2xl text-red-100">
              Welcome to the ultimate fan showdown. Home vs Away split chats, live timed prediction polls, and banter respect upvoting. Pick your club affinity and carry them to clout victory!
            </p>
          </div>
          <div className="z-10 w-full md:w-auto">
            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="neu-button bg-yellow-400 text-black border-4 border-black font-archivo font-bold w-full md:w-auto flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Schedule Derby Match
            </button>
          </div>
        </div>

        {/* Schedule Form */}
        {showScheduleForm && (
          <div className="neu-card bg-white border-4 border-black shadow-[8px_8px_0_0_#000] p-6 mb-8 max-w-2xl">
            <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-4">
              <h2 className="font-bebas text-3xl text-black">Schedule Rivalry Arena</h2>
              <button 
                onClick={() => setShowScheduleForm(false)} 
                className="font-archivo text-xs uppercase px-2 py-1 bg-red-500 text-white border-2 border-black shadow-[2px_2px_0_0_#000]"
              >
                Cancel
              </button>
            </div>
            
            {formError && (
              <div className="border-4 border-black bg-red-100 text-red-800 p-3 mb-4 font-bold">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-archivo text-sm uppercase mb-1 text-black">Home Club Name *</label>
                  <input
                    type="text"
                    value={homeClub}
                    onChange={(e) => setHomeClub(e.target.value)}
                    placeholder="e.g. Real Madrid"
                    className="neu-input"
                    required
                  />
                </div>
                <div>
                  <label className="block font-archivo text-sm uppercase mb-1 text-black">Away Club Name *</label>
                  <input
                    type="text"
                    value={awayClub}
                    onChange={(e) => setAwayClub(e.target.value)}
                    placeholder="e.g. FC Barcelona"
                    className="neu-input"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-archivo text-sm uppercase mb-1 text-black">Scheduled Kickoff (Local Time) *</label>
                  <input
                    type="datetime-local"
                    value={kickoff}
                    onChange={(e) => setKickoff(e.target.value)}
                    className="neu-input"
                    required
                  />
                </div>
                <div>
                  <label className="block font-archivo text-sm uppercase mb-1 text-black">Match ID (Optional external API link)</label>
                  <input
                    type="number"
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    placeholder="e.g. 439001"
                    className="neu-input"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="neu-button w-full bg-emerald-500 text-white font-bold"
              >
                {submitting ? 'Scheduling Match...' : 'Initialize Arena Duel'}
              </button>
            </form>
          </div>
        )}

        {(loadingSuggestions || suggestions.length > 0) && (
          <section className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-yellow-400 border-2 border-black px-3 py-1 shadow-[2px_2px_0_0_#000] font-archivo text-xs uppercase font-black text-black mb-2">
                  <Sparkles size={14} strokeWidth={3} /> Suggested Arenas
                </div>
                <h2 className="font-bebas text-4xl md:text-5xl uppercase tracking-wide text-black">
                  Jump Into A Derby
                </h2>
              </div>
              <p className="font-medium text-black/65 max-w-xl">
                Pick from real upcoming derby fixtures. If an arena already exists, you can enter it straight away.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {loadingSuggestions ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <SuggestionSkeletonCard key={`suggestion-skeleton-${index}`} />
                ))
              ) : suggestions.map((suggestion) => {
                const kickoff = formatKickoff(suggestion.scheduled_kickoff);

                return (
                  <div
                    key={suggestion.slug}
                    className="border-4 border-black bg-white p-4 shadow-[6px_6px_0_0_#000] flex flex-col justify-between"
                  >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="font-archivo text-[10px] uppercase font-black text-black/50">
                        {suggestion.existing_room_id ? 'Arena open' : 'Suggested matchup'}
                      </span>
                      {suggestion.existing_status && getStatusBadge(suggestion.existing_status)}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-b-4 border-black pb-4 mb-3">
                      <div className="flex flex-col items-start gap-2 min-w-0">
                        <ClubMark club={suggestion.home_club_meta} fallbackName={suggestion.home_club_name} />
                        <h3 className="font-bebas text-2xl text-black truncate w-full" title={suggestion.home_club_name}>
                          {suggestion.home_club_name}
                        </h3>
                      </div>
                      <div className="font-bebas text-3xl text-red-500 italic shrink-0">VS</div>
                      <div className="flex flex-col items-end gap-2 min-w-0 text-right">
                        <ClubMark club={suggestion.away_club_meta} fallbackName={suggestion.away_club_name} />
                        <h3 className="font-bebas text-2xl text-black truncate w-full" title={suggestion.away_club_name}>
                          {suggestion.away_club_name}
                        </h3>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="font-archivo text-lg uppercase font-black text-black leading-tight">{suggestion.title}</p>
                      <p className="font-medium text-sm text-black/65 mt-1">{suggestion.reason}</p>
                    </div>

                    <div className="bg-[var(--bg-tertiary)] border-2 border-black p-3 mb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-archivo text-[10px] uppercase font-black text-black/50">Kickoff</div>
                          <div className="font-bebas text-2xl text-black">
                            {kickoff.date}{kickoff.time ? ` @ ${kickoff.time}` : ''}
                          </div>
                        </div>
                        {suggestion.competition?.name && (
                          <div className="text-right font-archivo text-[10px] uppercase font-black text-black/60 max-w-[140px]">
                            {suggestion.competition.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={startingSuggestion === suggestion.slug}
                    className="neu-button-secondary w-full text-center justify-center bg-black text-white hover:bg-red-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 py-2 disabled:opacity-60"
                  >
                    {startingSuggestion === suggestion.slug ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                        Starting Arena
                      </>
                    ) : (
                      <>
                        <Swords size={14} />
                        {suggestion.existing_room_id ? 'Enter Suggested Arena' : 'Start Suggested Arena'}
                      </>
                    )}
                  </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="border-4 border-black bg-red-100 text-red-800 p-4 mb-8 font-bold text-center">
            {error}
          </div>
        )}

        {/* Matches List Container */}
        {loading ? (
          <div>
            <div className="flex items-center justify-between gap-4 mb-5">
              <SkeletonBlock className="h-10 w-48 bg-yellow-200" />
              <SkeletonBlock className="h-5 w-28" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <ArenaSkeletonCard key={`arena-skeleton-${index}`} />
              ))}
            </div>
          </div>
        ) : rivalries.length === 0 ? (
          <div className="neu-card bg-yellow-100 text-center py-16 border-4 border-black shadow-[8px_8px_0_0_#000]">
            <Trophy size={64} className="mx-auto mb-4 text-yellow-500" />
            <h3 className="font-bebas text-3xl uppercase mb-2 text-black">No Duel Sessions Active</h3>
            <p className="font-medium text-gray-700 max-w-md mx-auto mb-6">
              There are no derbies scheduled at the moment. Take the lead, fill out the form above, and start the clash!
            </p>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="neu-button bg-black text-white"
            >
              Initialize First Match
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rivalries.map((room) => {
              const dateObj = new Date(room.scheduled_kickoff);
              const formattedDate = dateObj.toLocaleDateString(undefined, { 
                weekday: 'short', month: 'short', day: 'numeric' 
              });
              const formattedTime = dateObj.toLocaleTimeString(undefined, { 
                hour: '2-digit', minute: '2-digit' 
              });
              
              const totalRespect = room.home_respect_score + room.away_respect_score;
              const homePct = totalRespect > 0 ? Math.round((room.home_respect_score / totalRespect) * 100) : 50;
              const awayPct = totalRespect > 0 ? 100 - homePct : 50;

              return (
                <div 
                  key={room.id}
                  onClick={() => navigate(`/rivalry/${room.id}`)}
                  className="neu-card bg-white border-4 border-black shadow-[8px_8px_0_0_#000] p-6 hover:translate-y-[-6px] hover:shadow-[12px_12px_0_0_#000] cursor-pointer transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      {getStatusBadge(room.status)}
                      <span className="font-archivo text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} /> ID #{room.id}
                      </span>
                    </div>

                    {/* Main Versus Title */}
                    <div className="flex items-center justify-between gap-2 border-b-4 border-black pb-4 mb-4">
                      <div className="flex-1 text-left">
                        <h3 className="font-bebas text-2xl text-black truncate" title={room.home_club_name}>
                          {room.home_club_name}
                        </h3>
                        <span className="font-archivo text-[10px] bg-white text-black border border-black px-1 uppercase">Home</span>
                      </div>
                      <div className="font-bebas text-2xl text-red-500 px-2 italic font-bold">VS</div>
                      <div className="flex-1 text-right">
                        <h3 className="font-bebas text-2xl text-black truncate" title={room.away_club_name}>
                          {room.away_club_name}
                        </h3>
                        <span className="font-archivo text-[10px] bg-black text-white px-1 uppercase">Away</span>
                      </div>
                    </div>

                    {/* Time Schedule Details */}
                    <div className="bg-[var(--bg-tertiary)] border-2 border-black p-3 mb-4 text-center">
                      <div className="font-archivo text-xs text-gray-700 uppercase tracking-wide">Kickoff Schedule</div>
                      <div className="font-bebas text-2xl text-black mt-1">
                        {formattedDate} @ {formattedTime}
                      </div>
                    </div>
                  </div>

                  {/* Respect Score Clout scoreboard meter */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-archivo uppercase mb-1">
                      <span className="text-black font-bold">{room.home_club_name}: {room.home_respect_score}</span>
                      <span className="text-gray-500">Respect Clout</span>
                      <span className="text-black font-bold">{room.away_respect_score} :{room.away_club_name}</span>
                    </div>
                    {/* Neubrutalist dual bar */}
                    <div className="w-full h-6 border-3 border-black flex overflow-hidden bg-gray-200">
                      <div 
                        className="bg-yellow-400 border-r-2 border-black transition-all duration-300"
                        style={{ width: `${homePct}%` }}
                      />
                      <div 
                        className="bg-black transition-all duration-300"
                        style={{ width: `${awayPct}%` }}
                      />
                    </div>

                    {/* Join Button */}
                    <button className="neu-button-secondary w-full mt-4 text-center justify-center bg-black text-white hover:bg-red-500 font-bold uppercase tracking-widest text-xs flex items-center gap-1 py-2">
                      <Swords size={14} /> Enter Arena Gate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RivalryDashboard;
