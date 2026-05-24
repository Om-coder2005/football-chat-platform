import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { transferAPI } from '../services/api';
import AppHeader from './AppHeader';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, X, AlertCircle, RefreshCw, ThumbsUp, DollarSign, HelpCircle, Award, Zap, ArrowRight, BadgeCheck, BadgeAlert, CircleDollarSign, Crown, Shield, Tag, Search } from 'lucide-react';

const moneyValue = (value) => String(value || '').trim();

const uniqueValuationRows = (rumor) => {
  const seen = new Set();
  return [
    { key: 'release_clause', label: 'Release Clause', value: moneyValue(rumor.release_clause), icon: Tag, className: 'bg-lime-100' },
    { key: 'asking_price', label: 'Club Demand', value: moneyValue(rumor.asking_price), icon: CircleDollarSign, className: 'bg-orange-100' },
    { key: 'transfer_value', label: 'Transfer Value', value: moneyValue(rumor.transfer_value), icon: DollarSign, className: 'bg-blue-100' },
    { key: 'estimated_fee', label: 'Reported Fee', value: moneyValue(rumor.estimated_fee), icon: DollarSign, className: 'bg-yellow-100' },
  ].filter((item) => {
    const normalized = item.value.toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const clubInitials = (name = '') => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const ClubLogo = ({ club, fallbackName }) => {
  const name = club?.shortName || club?.name || fallbackName;
  const initials = clubInitials(name);

  return (
  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white overflow-hidden shadow-[1px_1px_0_0_#000]">
    {club?.crest && (
      <img
        src={club.crest}
        alt={`${name || 'Club'} crest`}
        className="h-5 w-5 object-contain"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
          event.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
    )}
    <span className={club?.crest ? 'hidden' : 'flex h-full w-full items-center justify-center bg-[#ccff00] font-archivo text-[9px] font-black leading-none text-black'}>
      {initials || <Shield size={14} strokeWidth={3} className="text-black" />}
    </span>
  </span>
  );
};

const ClubChip = ({ club, fallbackName }) => {
  const name = club?.shortName || club?.name || fallbackName;
  if (!name) return null;

  return (
    <span className="inline-flex items-center gap-1.5 bg-green-100 text-black border-2 border-black font-archivo text-xs font-black uppercase px-2 py-1">
      <ClubLogo club={club} fallbackName={name} />
      <span>{name}</span>
    </span>
  );
};

const ValuationGrid = ({ rows }) => {
  if (!rows.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {rows.map(({ key, label, value, icon: Icon, className }) => (
        <div
          key={key}
          className={`${className} border-2 border-black px-2.5 py-2 font-archivo uppercase shadow-[2px_2px_0_0_#000]`}
        >
          <div className="flex items-center gap-1.5 text-[9px] font-black text-black/60">
            {React.createElement(Icon, { size: 13, strokeWidth: 3 })}
            {label}
          </div>
          <div className="text-sm font-black leading-tight mt-1">{value}</div>
        </div>
      ))}
    </div>
  );
};

const TransferMarket = () => {
  const PAGE_SIZE = 9;
  const { user } = useContext(AuthContext) || {};
  const toast = useToast();
  const [rumors, setRumors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searchingNews, setSearchingNews] = useState(false);
  const loadMoreRef = useRef(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [fromClub, setFromClub] = useState('');
  const [toClub, setToClub] = useState('');
  const [estimatedFee, setEstimatedFee] = useState('');
  const [releaseClause, setReleaseClause] = useState('');
  const [transferValue, setTransferValue] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [source, setSource] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [importingNews, setImportingNews] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRumors = useCallback(async ({ reset = false } = {}) => {
    const offset = reset ? 0 : nextOffset;
    if (!reset && (!hasMore || loadingMore)) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      const res = await transferAPI.getRumors({ limit: PAGE_SIZE, offset });
      if (res.data && res.data.rumors) {
        setRumors(prev => reset ? res.data.rumors : [...prev, ...res.data.rumors]);
        setNextOffset(res.data.next_offset ?? offset + res.data.rumors.length);
        setHasMore(Boolean(res.data.has_more));
      }
    } catch (err) {
      console.error('Error fetching transfer rumors:', err);
      setError('Could not load the transfer deck. The agents are holding back!');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextOffset]);

  useEffect(() => {
    fetchRumors({ reset: true });
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fetchRumors();
      }
    }, { rootMargin: '300px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchRumors, hasMore, loading]);

  const handleRate = async (rumorId, ratingType) => {
    if (!user) {
      toast.info('You must sign in to cast your consensus rating.');
      return;
    }

    try {
      const res = await transferAPI.rateRumor(rumorId, ratingType);
      if (res.data && res.data.success) {
        // Update local rumors state with the newly cast/updated vote
        setRumors(prevRumors => 
          prevRumors.map(rumor => {
            if (rumor.id === rumorId) {
              const updatedCounts = res.data.counts;
              return {
                ...rumor,
                reliable_count: updatedCounts.reliable,
                fake_news_count: updatedCounts.fake_news,
                overpriced_count: updatedCounts.overpriced,
                masterclass_count: updatedCounts.masterclass,
                total_votes: updatedCounts.total_votes,
                user_rating: ratingType
              };
            }
            return rumor;
          })
        );
      }
    } catch (err) {
      console.error('Error casting vote:', err);
      const status = err.response?.status;
      const serverMessage = err.response?.data?.msg || err.response?.data?.message;
      if (status === 401 || status === 422) {
        toast.error(serverMessage || 'Your session could not be validated. Please sign in again before voting.');
        return;
      }
      toast.error(serverMessage || 'Failed to submit your rating.');
    }
  };

  const handleSubmitRumor = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('You must be signed in to report rumors.');
      return;
    }

    if (!playerName || !fromClub || !toClub) {
      setFormError('Player, current club, and destination are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await transferAPI.createRumor({
        player_name: playerName,
        from_club: fromClub,
        to_club: toClub,
        estimated_fee: estimatedFee,
        release_clause: releaseClause,
        transfer_value: transferValue,
        asking_price: askingPrice,
        source: source,
        details: details
      });

      if (res.data && res.data.success) {
        // Clear fields
        setPlayerName('');
        setFromClub('');
        setToClub('');
        setEstimatedFee('');
        setReleaseClause('');
        setTransferValue('');
        setAskingPrice('');
        setSource('');
        setDetails('');
        setShowForm(false);
        // Refresh deck
        fetchRumors({ reset: true });
      }
    } catch (err) {
      console.error('Error submitting rumor:', err);
      setFormError(err.response?.data?.message || 'Failed to file rumor report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportNews = async () => {
    if (!user) {
      toast.info('You must sign in to import transfer news.');
      return;
    }

    try {
      setImportingNews(true);
      setError('');
      const res = await transferAPI.importNews({ page_size: 24 });
      if ((res.data?.imported || 0) > 0 || (res.data?.updated || 0) > 0) {
        toast.success(res.data?.message || 'Transfer news import complete.');
      } else {
        const reasons = res.data?.rejection_reasons
          ? Object.entries(res.data.rejection_reasons).map(([key, value]) => `${key}: ${value}`).join(', ')
          : 'No eligible articles returned.';
        toast.info(`No soccer transfer items imported. ${reasons}`, 'Import Complete');
      }
      await fetchRumors({ reset: true });
    } catch (err) {
      console.error('Error importing transfer news:', err);
      const serverMessage = err.response?.data?.message || err.response?.data?.msg;
      toast.error(serverMessage || 'Could not import transfer news.');
    } finally {
      setImportingNews(false);
    }
  };

  const handleSearchRumors = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setActiveSearch('');
      fetchRumors({ reset: true });
      return;
    }

    if (!user) {
      toast.info('You must sign in to search live transfer news.');
      return;
    }

    try {
      setSearchingNews(true);
      setLoading(true);
      setError('');
      setActiveSearch(query);
      setHasMore(false);
      const res = await transferAPI.searchRumors({ query, page_size: 12 });
      const foundRumors = res.data?.rumors || [];
      setRumors(foundRumors);
      setNextOffset(foundRumors.length);
      if (foundRumors.length) {
        toast.success(res.data?.message || `Found transfer cards for ${query}.`);
      } else {
        toast.info(`No live transfer cards found for ${query}.`);
      }
    } catch (err) {
      console.error('Error searching transfer news:', err);
      const serverMessage = err.response?.data?.message || err.response?.data?.msg;
      setError(serverMessage || 'Could not search live transfer news.');
    } finally {
      setLoading(false);
      setSearchingNews(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    fetchRumors({ reset: true });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-black pb-16">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        
        {/* Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-8 border-black pb-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-yellow-300 text-black border-2 border-black font-archivo text-xs uppercase px-3 py-1 font-bold shadow-[2px_2px_0_0_#000]">
                <Zap size={14} className="inline-block mr-1 align-[-2px]" /> LIVE RUMOR DECK
              </span>
            </div>
            <h1 className="font-archivo text-4xl md:text-7xl font-black uppercase tracking-tight leading-none">
              TRANSFER MARKET
            </h1>
            <p className="font-inter font-bold text-black/70 mt-2 text-sm md:text-base">
              Cast your vote. Do you trust the source or is it classic fake news hype?
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleImportNews}
              disabled={importingNews}
              className="neu-button-secondary bg-white text-black hover:bg-yellow-300 font-archivo text-base md:text-lg py-3 px-6 shadow-[4px_4px_0_0_#000] flex items-center gap-2 border-4 border-black disabled:opacity-60"
            >
              <RefreshCw size={20} className={importingNews ? 'animate-spin' : ''} />
              {importingNews ? 'IMPORTING NEWS' : 'IMPORT LIVE NEWS'}
            </button>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="neu-button bg-[var(--accent-primary)] text-white hover:bg-black font-archivo text-base md:text-lg py-3 px-6 shadow-[4px_4px_0_0_#000] flex items-center gap-2 border-4 border-black"
            >
              {showForm ? <X size={20} /> : <Plus size={20} />}
              {showForm ? 'CLOSE DRAWER' : 'SUBMIT HOT RUMOR'}
            </button>
            
            <button 
              onClick={() => fetchRumors({ reset: true })} 
              className="border-4 border-black bg-white p-3 hover:bg-yellow-300 transition-colors shadow-[4px_4px_0_0_#000]"
              title="Refresh deck"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchRumors} className="mb-10 border-4 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <label htmlFor="transfer-search" className="block font-archivo text-xs uppercase font-black text-black/60 mb-2">
            Live Transfer Search
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={22} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 text-black" />
              <input
                id="transfer-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search any player or manager name..."
                className="w-full border-4 border-black bg-yellow-50 py-3 pl-11 pr-4 font-inter font-black outline-none focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={searchingNews}
              className="border-4 border-black bg-[#ccff00] px-6 py-3 font-archivo text-sm uppercase font-black shadow-[3px_3px_0_0_#000] hover:bg-black hover:text-white disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {searchingNews ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
              {searchingNews ? 'Searching' : 'Search News'}
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="border-4 border-black bg-white px-5 py-3 font-archivo text-sm uppercase font-black shadow-[3px_3px_0_0_#000] hover:bg-red-100"
              >
                Clear
              </button>
            )}
          </div>
          {activeSearch && (
            <p className="mt-3 font-archivo text-[11px] uppercase font-black text-black/60">
              Showing live search cards for: <span className="text-black">{activeSearch}</span>
            </p>
          )}
        </form>

        {/* Create Rumor Drawer / Modal Form */}
        <AnimatePresence>
          {showForm && (
            <Motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0_0_#000] mb-12 relative"
            >
              <h2 className="font-archivo text-3xl font-black uppercase mb-6 border-b-4 border-black pb-2">
                REPORT TRANSFER RUMOR
              </h2>
              
              {!user ? (
                <div className="border-4 border-dashed border-red-500 bg-red-50 p-6 text-center font-archivo uppercase text-red-500 font-bold mb-4">
                  <AlertCircle size={32} className="mx-auto mb-2" />
                  YOU MUST BE LOGGED IN TO REPORT NEW RUMORS!
                </div>
              ) : (
                <form onSubmit={handleSubmitRumor} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formError && (
                    <div className="col-span-full border-4 border-black bg-red-400 p-4 font-archivo uppercase text-white font-bold flex items-center gap-2">
                      <AlertCircle size={20} /> {formError}
                    </div>
                  )}

                  <div>
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Player Name *</label>
                    <input 
                      type="text" 
                      required
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="e.g. Viktor Gyökeres"
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-archivo uppercase font-black text-sm mb-2">From Club *</label>
                      <input 
                        type="text" 
                        required
                        value={fromClub}
                        onChange={(e) => setFromClub(e.target.value)}
                        placeholder="e.g. Sporting CP"
                        className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-archivo uppercase font-black text-sm mb-2">To Club *</label>
                      <input 
                        type="text" 
                        required
                        value={toClub}
                        onChange={(e) => setToClub(e.target.value)}
                        placeholder="e.g. Arsenal"
                        className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Estimated Fee</label>
                    <input 
                      type="text" 
                      value={estimatedFee}
                      onChange={(e) => setEstimatedFee(e.target.value)}
                      placeholder="e.g. GBP 85M"
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Release Clause</label>
                    <input
                      type="text"
                      value={releaseClause}
                      onChange={(e) => setReleaseClause(e.target.value)}
                      placeholder="e.g. GBP 100M clause"
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Transfer Value</label>
                    <input
                      type="text"
                      value={transferValue}
                      onChange={(e) => setTransferValue(e.target.value)}
                      placeholder="e.g. GBP 65M market value"
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Club Demand</label>
                    <input
                      type="text"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      placeholder="e.g. Club wants GBP 80M"
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Source Reporter</label>
                    <input 
                      type="text" 
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g. Fabrizio Romano"
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-archivo uppercase font-black text-sm mb-2">Report Details / Banter Context</label>
                    <textarea 
                      rows="3"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Give us the scoop! Contract length, wages, release clauses, or pure stand speculation."
                      className="w-full border-4 border-black p-3 font-inter font-bold focus:bg-yellow-100 outline-none resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-4 mt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="border-4 border-black bg-white hover:bg-gray-100 font-archivo text-base py-3 px-6 shadow-[4px_4px_0_0_#000] uppercase font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="border-4 border-black bg-[#ccff00] hover:bg-black hover:text-white font-archivo text-base py-3 px-8 shadow-[4px_4px_0_0_#000] uppercase font-black disabled:opacity-50"
                    >
                      {submitting ? 'FILING...' : 'PUBLISH RUMOR'}
                    </button>
                  </div>
                </form>
              )}
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Load / Error Indicators */}
        {loading && (
          <div className="text-center py-20">
            <RefreshCw className="animate-spin text-[var(--accent-primary)] mx-auto mb-4" size={48} />
            <p className="font-archivo text-xl uppercase font-black">Shuffling the transfer deck...</p>
          </div>
        )}

        {error && (
          <div className="border-4 border-black bg-red-400 text-white p-6 shadow-[6px_6px_0_0_#000] text-center my-12">
            <AlertCircle className="mx-auto mb-3" size={40} />
            <p className="font-archivo text-2xl uppercase font-black">{error}</p>
          </div>
        )}

        {/* Rumor Trading Cards Grid */}
        {!loading && !error && (
          rumors.length === 0 ? (
            <div className="border-4 border-dashed border-black bg-white p-16 text-center shadow-[6px_6px_0_0_#000]">
              <Flame size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="font-archivo text-2xl uppercase font-black">
                {activeSearch ? 'NO LIVE SEARCH RESULTS' : 'DEADLINE SILENCE'}
              </h3>
              <p className="font-inter font-bold text-black/60 mt-2">
                {activeSearch
                  ? `No live transfer cards found for "${activeSearch}". Try another player or manager name.`
                  : 'No transfer rumors have been reported yet. Got clean leaks? Be the first to drop one!'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rumors.map((rumor) => {
                const isImportedNews = String(rumor.import_source || '').startsWith('newsapi') || Boolean(rumor.article_url);
                const total = rumor.total_votes || 0;
                const getPct = (count) => {
                  if (total === 0) return 0;
                  return Math.round((count / total) * 100);
                };

                const relPct = getPct(rumor.reliable_count);
                const fakePct = getPct(rumor.fake_news_count);
                const pricePct = getPct(rumor.overpriced_count);
                const classPct = getPct(rumor.masterclass_count);
                const currentClub = String(rumor.from_club || '').trim();
                const hasCurrentClub = currentClub && !/^not specified/i.test(currentClub);
                const valuationRows = uniqueValuationRows(rumor);
                const headerValuation = valuationRows[0];
                const currentClubMeta = rumor.current_club_meta;
                const interestedClubs = Array.isArray(rumor.interested_clubs_meta) && rumor.interested_clubs_meta.length
                  ? rumor.interested_clubs_meta
                  : String(rumor.to_club || '').split(',').map((name) => ({ name: name.trim(), shortName: name.trim(), crest: null })).filter((club) => club.name);

                return (
                  <Motion.div
                    layout
                    key={rumor.id}
                    className="group border-4 border-black bg-white rounded-none flex flex-col justify-between overflow-hidden shadow-[6px_6px_0_0_#000] hover:shadow-[10px_10px_0_0_#000] hover:translate-y-[-4px] transition-all duration-300"
                  >
                    {/* Header */}
                    <div className="bg-black text-white p-4 border-b-4 border-black flex justify-between items-center">
                      <span className="font-archivo text-xs uppercase font-black tracking-widest text-[#ccff00]">
                        <Zap size={14} className="inline-block mr-1 align-[-2px]" /> ULTRAS SPECULATION
                      </span>
                      {headerValuation && (
                        <span className="bg-yellow-400 text-black border border-black font-archivo text-[11px] font-black uppercase px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
                          {headerValuation.value}
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div>
                        {isImportedNews ? (
                          <div className="mb-4 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {hasCurrentClub && (
                                <span className="bg-blue-100 text-black border-2 border-black font-archivo text-xs font-black uppercase px-2 py-1">
                                  <span className="inline-flex items-center gap-1.5">
                                    <ClubLogo club={currentClubMeta} fallbackName={currentClub} />
                                    Current: {currentClub}
                                  </span>
                                </span>
                              )}
                              <span className="font-archivo text-[10px] uppercase font-black text-black/50">Interested clubs:</span>
                              {interestedClubs.map((club) => (
                                <ClubChip key={`${rumor.id}-${club.name}`} club={club} fallbackName={club.name} />
                              ))}
                            </div>
                            <span className="inline-block bg-yellow-100 text-black border-2 border-black font-archivo text-[10px] font-black uppercase px-2 py-0.5">
                              Source: {rumor.source || 'NewsAPI'}
                            </span>
                            {valuationRows.length > 0 && (
                              <ValuationGrid rows={valuationRows} />
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {rumor.transfer_status && (
                                <span className="inline-block bg-black text-white border-2 border-black font-archivo text-[10px] font-black uppercase px-2 py-0.5">
                                  {rumor.transfer_status}
                                </span>
                              )}
                              {rumor.ai_confidence != null && (
                                <span className="inline-block bg-white text-black border-2 border-black font-archivo text-[10px] font-black uppercase px-2 py-0.5">
                                  AI confidence {Math.round(Number(rumor.ai_confidence) * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <span className="bg-blue-100 text-black border-2 border-black font-archivo text-xs font-black uppercase px-2 py-1">
                              <span className="inline-flex items-center gap-1.5">
                                <ClubLogo club={currentClubMeta} fallbackName={rumor.from_club} />
                                {rumor.from_club}
                              </span>
                            </span>
                            <ArrowRight size={20} className="shrink-0" />
                            {interestedClubs.map((club) => (
                              <ClubChip key={`${rumor.id}-${club.name}`} club={club} fallbackName={club.name} />
                            ))}
                            {valuationRows.length > 0 && (
                              <div className="basis-full mt-1">
                                <ValuationGrid rows={valuationRows} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Player name */}
                        <h3 className="font-archivo text-3xl md:text-4xl font-black uppercase leading-tight mb-2 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">
                          {rumor.player_name}
                        </h3>

                        {/* Details */}
                        <p className="font-inter font-semibold text-black/75 text-sm mb-6 leading-relaxed bg-gray-50 border-2 border-black p-3 italic">
                          "{rumor.details || 'No details provided.'}"
                        </p>

                        {/* Source Tag */}
                        {rumor.source && (
                          <div className="flex items-center gap-2 mb-6">
                            <span className="font-archivo text-[11px] font-bold text-black/50 uppercase">REPORTED BY:</span>
                            <span className="bg-pink-100 text-pink-700 border-2 border-black font-archivo text-[10px] font-black uppercase px-2 py-0.5">
                              {rumor.source}
                            </span>
                          </div>
                        )}

                        {rumor.article_url && (
                          <a
                            href={rumor.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mb-6 border-2 border-black bg-white px-3 py-1.5 font-archivo text-[10px] uppercase font-black shadow-[2px_2px_0_0_#000] hover:bg-yellow-200"
                          >
                            Read Original Source <ArrowRight size={14} />
                          </a>
                        )}
                      </div>

                      {/* Consensus Meters */}
                      <div className="border-t-4 border-black pt-6">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-archivo text-xs font-black uppercase">Consensus Ratios</span>
                          <span className="font-archivo text-xs font-bold text-black/60 uppercase">{total} votes cast</span>
                        </div>

                        <div className="flex flex-col gap-3.5 mb-6">
                          {/* Reliable Meter */}
                          <div>
                            <div className="flex justify-between font-archivo text-[10px] uppercase font-black mb-1">
                              <span>Reliable</span>
                              <span>{relPct}%</span>
                            </div>
                            <div className="h-4 border-2 border-black bg-gray-100 overflow-hidden relative">
                              <div className="h-full bg-emerald-400 border-r-2 border-black transition-all duration-500" style={{ width: `${relPct}%` }} />
                            </div>
                          </div>

                          {/* Fake News Meter */}
                          <div>
                            <div className="flex justify-between font-archivo text-[10px] uppercase font-black mb-1">
                              <span>Fake News</span>
                              <span>{fakePct}%</span>
                            </div>
                            <div className="h-4 border-2 border-black bg-gray-100 overflow-hidden relative">
                              <div className="h-full bg-red-400 border-r-2 border-black transition-all duration-500" style={{ width: `${fakePct}%` }} />
                            </div>
                          </div>

                          {/* Overpriced Meter */}
                          <div>
                            <div className="flex justify-between font-archivo text-[10px] uppercase font-black mb-1">
                              <span>Overpriced</span>
                              <span>{pricePct}%</span>
                            </div>
                            <div className="h-4 border-2 border-black bg-gray-100 overflow-hidden relative">
                              <div className="h-full bg-orange-400 border-r-2 border-black transition-all duration-500" style={{ width: `${pricePct}%` }} />
                            </div>
                          </div>

                          {/* Masterclass Meter */}
                          <div>
                            <div className="flex justify-between font-archivo text-[10px] uppercase font-black mb-1">
                              <span>Masterclass</span>
                              <span>{classPct}%</span>
                            </div>
                            <div className="h-4 border-2 border-black bg-gray-100 overflow-hidden relative">
                              <div className="h-full bg-purple-400 border-r-2 border-black transition-all duration-500" style={{ width: `${classPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Interactive Vote Actions */}
                    <div className="border-t-4 border-black bg-gray-50 p-3 grid grid-cols-2 gap-2">
                      {[
                        { key: 'reliable',    icon: BadgeCheck,        label: 'Reliable',    active: 'bg-emerald-400', hover: 'hover:bg-emerald-100' },
                        { key: 'fake_news',   icon: BadgeAlert,        label: 'Fake News',   active: 'bg-red-400',     hover: 'hover:bg-red-100' },
                        { key: 'overpriced',  icon: CircleDollarSign,  label: 'Overpriced',  active: 'bg-orange-400',  hover: 'hover:bg-orange-100' },
                        { key: 'masterclass', icon: Crown,             label: 'Masterclass', active: 'bg-purple-400',  hover: 'hover:bg-purple-100' },
                      ].map(({ key, icon: Icon, label, active, hover }) => {
                        const isActive = rumor.user_rating === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleRate(rumor.id, key)}
                            className={[
                              'border-2 border-black py-2 px-1 font-archivo text-[10px] uppercase font-black',
                              'flex flex-col items-center justify-center gap-0.5 min-h-[52px]',
                              'transition-all duration-150 leading-tight text-center',
                              isActive
                                ? `${active} text-black shadow-none translate-x-px translate-y-px`
                                : `bg-white text-black ${hover} shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px]`,
                            ].join(' ')}
                          >
                            {React.createElement(Icon, { size: 18, strokeWidth: 3 })}
                            <span className="break-words w-full text-center">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                  </Motion.div>
                );
                })}
              </div>

              <div ref={loadMoreRef} className="flex justify-center py-12">
                {loadingMore ? (
                  <div className="flex items-center gap-3 font-archivo uppercase font-black text-black">
                    <RefreshCw size={22} className="animate-spin" /> Loading more rumors...
                  </div>
                ) : hasMore ? (
                  <button
                    onClick={() => fetchRumors()}
                    className="neu-button-secondary bg-white text-black px-8 py-3 border-4 border-black shadow-[4px_4px_0_0_#000] font-archivo uppercase font-black flex items-center gap-2"
                  >
                    <Plus size={18} /> Load More Rumors
                  </button>
                ) : (
                  <p className="font-archivo text-xs uppercase font-black text-black/50">End of the rumor deck</p>
                )}
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
};

export default TransferMarket;
