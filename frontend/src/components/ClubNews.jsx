import React, { useState, useEffect, useCallback } from 'react';
import { newsAPI } from '../services/api';
import { motion } from 'framer-motion';
import { Newspaper, Clock, ExternalLink, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';

const ClubNews = ({ clubName }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = useCallback(async () => {
    if (!clubName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await newsAPI.getClubNews(clubName);
      if (response.data && response.data.success) {
        setNews(response.data.articles);
      } else {
        setError('Failed to load news');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Could not connect to news service');
    } finally {
      setLoading(false);
    }
  }, [clubName]);

  useEffect(() => {
    fetchNews();
    const intervalId = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchNews]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw size={48} className="animate-spin text-[var(--accent-primary)]" />
      <p className="neu-heading text-2xl uppercase">{'SCOUTING NEWS...'}</p>
    </div>
  );

  if (error) return (
    <div className="neu-card bg-red-100 p-8 text-center flex flex-col items-center">
      <AlertTriangle size={48} className="text-red-600 mb-4" />
      <p className="font-archivo text-xl uppercase text-red-800">{error}</p>
      <button className="neu-button bg-red-600 text-white mt-4" onClick={fetchNews}>RETRY SCOUTING</button>
    </div>
  );

  return (
    <div className="club-news-container flex-1 overflow-y-auto flex flex-col gap-8 p-6 bg-[#f0f0f0] custom-scrollbar">
      <div className="flex items-center justify-between border-b-4 border-black pb-6 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-[var(--accent-primary)] p-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Newspaper size={32} />
          </div>
          <h2 className="neu-heading text-5xl tracking-tighter uppercase">{clubName} <span className="text-[var(--accent-primary)]">GAZETTE</span></h2>
        </div>
        <div className="hidden md:block">
          <Calendar size={24} className="opacity-20" />
        </div>
      </div>

      {news.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20 grayscale">
          <Newspaper size={64} strokeWidth={1} />
          <p className="font-archivo text-2xl uppercase mt-4">NO NEWS FROM THE FRONT</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10">
          {news.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              key={item.news_id || idx} 
              className="group relative"
            >
              <div className="neu-card bg-white p-0 overflow-hidden flex flex-col hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 border-[3px] border-black">
                
                {/* Image Section with Overlay Tags */}
                <div className="relative w-full h-56 overflow-hidden border-b-[3px] border-black bg-gray-200">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                      <Newspaper size={80} />
                    </div>
                  )}
                  
                  {/* Floating Tags */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                    <span className="comic-sticker bg-black text-white text-[11px] py-1 px-3 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                       <Clock size={12} /> {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'RECENT'}
                    </span>
                    <span className="comic-sticker bg-yellow-400 text-black text-[11px] py-1 px-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase font-archivo">
                      {item.source_name || item.source || 'ULTRAS DAILY'}
                    </span>
                  </div>

                  {/* Gradient Overlay for Title Visibility if needed */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* Content Section */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="font-archivo text-2xl mb-4 leading-[1.1] group-hover:bg-yellow-200 transition-colors inline">
                      {item.title}
                    </h3>
                  </div>
                  
                  <p className="font-poppins text-lg leading-relaxed text-gray-700 mb-6 line-clamp-3 font-bold">
                    {item.description}
                  </p>

                  <div className="mt-auto pt-4 border-t-2 border-black/5 flex items-center justify-between">
                    <a 
                      href={item.url || item.article_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="neu-button bg-black text-white py-4 px-8 text-base flex items-center gap-3 hover:bg-[var(--accent-primary)] hover:text-black transition-all group/btn shadow-[4px_4px_0px_0px_#000] border-2 border-black"
                    >
                      <span className="font-archivo uppercase tracking-wider font-bold">READ FULL REPORT</span>
                      <ExternalLink size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </a>
                    
                    <div className="opacity-10 group-hover:opacity-40 transition-opacity">
                      <Newspaper size={32} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Corner Element */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-black border-2 border-white rotate-45 z-[-1] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubNews;
