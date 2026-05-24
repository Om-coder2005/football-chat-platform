import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityAPI, newsAPI } from '../services/api';
import AppHeader from './AppHeader';
import { motion } from 'framer-motion';
import { MessageSquare, BarChart2, Bot, Shield, Users, Zap, Activity, ArrowRight, Star, Ticket, CircleDot, Flame } from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'Live Fan Chat',    desc: 'Join thousands of fans in real-time during the match. React. Argue. Celebrate.', rotate: '-2deg', color: '#ff3b30' },
  { icon: BarChart2,    title: 'Live Stats',        desc: 'Live scores, xG, possession — updated every minute during play.',               rotate: '3deg',  color: '#3b82f6' },
  { icon: Bot,          title: 'AI Match Summary',  desc: 'Gemini-powered tactical breakdowns and fan sentiment reports.',                  rotate: '-1.5deg', color: '#10b981' },
  { icon: Shield,       title: 'Club Communities',  desc: 'Curated rooms for every major club. Pick your stand, stay loyal.',              rotate: '2deg', color: '#8b5cf6' },
];

const AccentColors = ['var(--highlight-bg)', '#ff3b30', '#3b82f6', '#10b981', '#8b5cf6', '#f97316'];

const CommunityCard = ({ community, index }) => {
  if (!community) return null;
  return (
    <Link 
      to={`/community/${community.id || ''}`} 
      className="group neu-box p-6 block no-underline transition-all duration-300 hover:rotate-0 hover:translate-y-[-8px]"
      style={{ 
        background: AccentColors[index % AccentColors.length],
        boxShadow: '6px 6px 0px 0px #000',
        transform: `rotate(${index % 2 === 0 ? '-1.5deg' : '1.5deg'})`
      }}
    >
      <h3 className="font-archivo text-2xl uppercase text-black mb-1 leading-tight group-hover:scale-105 transition-transform origin-left">{community.name || 'Unknown Community'}</h3>
      <p className="font-inter font-extrabold text-xs text-black/60 uppercase tracking-widest mb-4">{community.club_name || 'General'}</p>
      
      <div className="flex items-center gap-2 bg-black text-white px-3 py-1.5 inline-flex font-archivo text-xs shadow-[3px_3px_0px_0px_#fff] border border-white">
        <Ticket size={14} />
        <span>{community.member_count || 0} SEATS FILLED</span>
      </div>
    </Link>
  );
};

// Marquee CSS will be injected or we can use a repeating div
const Marquee = () => (
  <div className="overflow-hidden whitespace-nowrap bg-yellow-400 border-y-4 border-black py-3 flex items-center shadow-[0_8px_0_0_#000] mb-12 transform -rotate-1">
    <motion.div 
      className="flex gap-10 items-center text-2xl font-archivo uppercase text-black"
      animate={{ x: ["0%", "-50%"] }}
      transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
      style={{ width: "fit-content" }}
    >
      {[...Array(10)].map((_, i) => (
        <span key={i} className="flex items-center gap-4">
          {'CHOOSE YOUR COLORS'} <Star size={20} className="fill-black" /> {'JOIN THE FIRM'} <Star size={20} className="fill-black" />
        </span>
      ))}
    </motion.div>
  </div>
);

const Landing = () => {
  const [communities, setCommunities] = useState([]);
  const [globalNews, setGlobalNews] = useState([]);

  useEffect(() => {
    let isMounted = true;
    communityAPI.getAll()
      .then(r => {
        if (isMounted && r.data && r.data.communities) {
          setCommunities(r.data.communities.slice(0, 6));
        }
      })
      .catch(err => console.error('Landing communities fetch error:', err));

    newsAPI.getGlobalNews(6)
      .then(r => {
        if (isMounted && r.data && r.data.articles) {
          setGlobalNews(r.data.articles);
        }
      })
      .catch(err => console.error('Landing news fetch error:', err));

    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-0">
      <AppHeader />

      {/* ── HERO ── */}
      <section className="border-b-4 border-black py-20 lg:py-32 px-6 relative overflow-hidden bg-[var(--bg-primary)]">
        {/* Kinetic Background */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#000 2px, transparent 2px)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
          className="absolute -top-32 -right-32 opacity-10 hidden lg:block"
        >
           <Zap size={400} fill="var(--accent-primary)" stroke="none" />
        </motion.div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-wrap gap-4 mb-8">
            <motion.span 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="comic-sticker rotate-[-3deg] text-sm md:text-lg px-6 py-2 shadow-[4px_4px_0_0_#000]"
            >
              <CircleDot size={18} className="inline-block mr-2 align-[-2px]" /> {'MATCHDAY LIVE'}
            </motion.span>
            <motion.span 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
              className="comic-sticker bg-black text-white rotate-[2deg] text-sm md:text-lg px-6 py-2 shadow-[4px_4px_0_0_var(--accent-primary)]"
            >
              {'NO PLASTIC FANS'}
            </motion.span>
          </div>

          <h1 className="neu-heading text-[clamp(4rem,12vw,9rem)] mb-6 leading-[0.85] tracking-tighter mix-blend-difference text-white">
            <span className="text-[var(--accent-primary)]">{'CASA'}</span><br />{'ULTRAS'}
          </h1>

          <div className="max-w-xl mb-12 group">
            <div className="font-inter font-bold text-xl md:text-2xl bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] rotate-[-2deg] transition-all duration-300 group-hover:rotate-0 group-hover:shadow-[12px_12px_0px_0px_#000] group-hover:scale-[1.02]">
              {'The only digital pub where live scores meet real fan banter.'} <span className="text-[var(--accent-primary)] bg-black px-2 py-0.5 ml-1">{'Pick your club.'}</span> {'Join the chant.'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-6">
            <Link to="/communities" className="neu-button text-lg md:text-xl py-4 md:py-6 px-6 md:px-12 group bg-[var(--accent-primary)] text-white shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] hover:translate-y-[-4px] transition-all">
              <Users size={24} /> {'FIND YOUR CLUB'} <ArrowRight className="group-hover:translate-x-3 transition-transform" />
            </Link>
            <Link to="/live-scores" className="neu-button-secondary text-lg md:text-xl py-4 md:py-6 px-6 md:px-12 bg-white shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] hover:translate-y-[-4px] transition-all">
              <Activity size={24} /> {'LIVE SCORES'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 border-b-4 border-black bg-[var(--bg-tertiary)] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <h2 className="neu-heading text-5xl md:text-7xl">{'WHY CASA ULTRAS?'}</h2>
            <div className="h-2 flex-1 bg-black"></div>
            <Star size={48} className="text-[var(--accent-primary)] fill-current animate-spin-slow" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div 
                  key={f.title} 
                  className="group bg-white border-4 border-black p-8 transition-all duration-300 hover:rotate-0 hover:translate-y-[-8px] hover:shadow-[12px_12px_0px_0px_#000]"
                  style={{ transform: `rotate(${f.rotate})`, boxShadow: '6px 6px 0px 0px #000' }}
                >
                  <div 
                    className="border-4 border-black w-20 h-20 flex items-center justify-center mb-8 shadow-[4px_4px_0px_0px_#000] transition-transform group-hover:scale-110"
                    style={{ backgroundColor: f.color }}
                  >
                    <Icon size={40} color="#fff" />
                  </div>
                  <h3 className="font-archivo text-3xl uppercase mb-4 leading-tight">{f.title}</h3>
                  <p className="font-inter font-bold text-black/70 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ACTIVE STANDS ── */}
      {communities.length > 0 && (
        <section className="py-24 px-0 border-b-4 border-black bg-white">
          <Marquee />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12 gap-6">
              <h2 className="neu-heading text-5xl md:text-7xl">{'ACTIVE STANDS'}</h2>
              <Link to="/communities" className="neu-button-secondary py-3 px-8 text-sm flex items-center gap-2 hover:bg-black hover:text-white transition-colors">
                {'VIEW ALL'} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {communities.map((c, i) => <CommunityCard key={c.id || i} community={c} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── WORLD CUP FOOTBALL TELEGRAPH (Aggregate Global News) ── */}
      <section className="py-24 px-6 border-b-4 border-black bg-[#f4f1ea] text-black">
        <div className="max-w-7xl mx-auto">
          {/* Newspaper Header */}
          <div className="text-center border-b-8 double border-black pb-8 mb-12">
            <p className="font-inter font-black text-xs md:text-sm tracking-[0.25em] uppercase mb-2 text-black/70">
              <Zap size={14} className="inline-block mr-2 align-[-2px]" /> DAILY BANTER & MATCHDAY CHRONICLES <Zap size={14} className="inline-block ml-2 align-[-2px]" />
            </p>
            <h2 className="font-archivo text-5xl md:text-8xl tracking-tight leading-none uppercase my-2 font-black border-y-4 border-black py-4 select-none">
              WORLD CUP FOOTBALL TELEGRAPH
            </h2>
            <div className="flex justify-between items-center mt-3 font-archivo text-xs md:text-sm uppercase font-bold tracking-wider px-2 text-black/60">
              <span>VOL. XCIV... NO. 302</span>
              <span>LONDON, PARIS, MADRID</span>
              <span>PRICE £0.50 / FREE STICKER INSIDE!</span>
            </div>
          </div>

          {/* Newspaper Grid */}
          {globalNews.length === 0 ? (
            <div className="border-4 border-dashed border-black p-12 text-center bg-white shadow-[6px_6px_0_0_#000]">
              <p className="font-archivo text-xl uppercase font-black">STOP THE PRESSES!</p>
              <p className="font-inter font-bold text-black/60 mt-2">No news stories are currently cached. The presses will roll shortly!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Headline Article (Spans 2 columns on desktop) */}
              <div className="lg:col-span-2">
                {globalNews[0] && (
                  <a 
                    href={globalNews[0].article_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group border-4 border-black bg-white p-6 block no-underline text-black transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[10px_10px_0_0_#000]"
                    style={{ boxShadow: '8px 8px 0px 0px #000' }}
                  >
                    {globalNews[0].image_url && (
                      <div className="border-4 border-black overflow-hidden mb-6 h-64 md:h-96 relative">
                        <img 
                          src={globalNews[0].image_url} 
                          alt={globalNews[0].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter contrast-[1.05]"
                        />
                        <span className="absolute top-4 left-4 bg-yellow-300 text-black border-2 border-black font-archivo text-xs uppercase px-3 py-1 font-bold shadow-[2px_2px_0_0_#000]">
                          <Flame size={14} className="inline-block mr-1 align-[-2px]" /> HEADLINE NEWS
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 mb-3">
                      <span className="bg-black text-white font-archivo text-xs uppercase px-2.5 py-1 font-bold tracking-wider">
                        {globalNews[0].source_name || 'TELEGRAPH SPECIAL'}
                      </span>
                      <span className="bg-red-500 text-white font-archivo text-xs uppercase px-2.5 py-1 font-bold tracking-wider">
                        {globalNews[0].club_name.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-archivo text-3xl md:text-5xl uppercase font-black mb-4 leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
                      {globalNews[0].title}
                    </h3>
                    <p className="font-inter font-bold text-black/75 text-sm md:text-base leading-relaxed mb-6">
                      {globalNews[0].description}
                    </p>
                    <div className="flex justify-between items-center border-t-2 border-black pt-4 font-archivo text-xs md:text-sm font-black uppercase text-black/70">
                      <span className="text-[var(--accent-primary)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">READ FULL ARTICLE <ArrowRight size={14} /></span>
                      <span>
                        PUBLISHED: {new Date(globalNews[0].published_at).toLocaleDateString()}
                      </span>
                    </div>
                  </a>
                )}
              </div>

              {/* Sidebar list of articles */}
              <div className="flex flex-col gap-8">
                {globalNews.slice(1, 4).map((article, idx) => (
                  <a 
                    key={article.news_id || idx}
                    href={article.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border-4 border-black bg-white p-5 block no-underline text-black transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000]"
                    style={{ boxShadow: '6px 6px 0px 0px #000' }}
                  >
                    <div className="flex gap-2 mb-2">
                      <span className="bg-yellow-400 text-black border border-black font-archivo text-[10px] uppercase px-2 py-0.5 font-bold tracking-wider">
                        {article.source_name || 'FOOTBALL DAILY'}
                      </span>
                      <span className="bg-blue-400 text-white border border-black font-archivo text-[10px] uppercase px-2 py-0.5 font-bold tracking-wider">
                        {article.club_name.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="font-archivo text-xl uppercase font-black mb-2 leading-tight group-hover:text-[var(--accent-primary)] transition-colors">
                      {article.title}
                    </h4>
                    <p className="font-inter text-xs font-bold text-black/70 mb-4 line-clamp-3">
                      {article.description}
                    </p>
                    <div className="flex justify-between items-center border-t border-black/20 pt-3 font-archivo text-[10px] uppercase font-bold text-black/50">
                      <span className="inline-flex items-center gap-1">READ MORE <ArrowRight size={12} /></span>
                      <span>{new Date(article.published_at).toLocaleDateString()}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 bg-black text-white text-center relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-700 group-hover:opacity-40">
           <div className="flex flex-wrap gap-20 p-20 justify-center">
             {[...Array(20)].map((_, i) => <Activity key={i} size={100} className="text-yellow-400" />)}
           </div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="font-bebas text-[6rem] md:text-[10rem] text-[#ccff00] mb-4 leading-[0.8] tracking-tight drop-shadow-[6px_6px_0_rgba(255,255,255,0.2)]">
            {'THE TERRACE IS CALLING'}
          </h2>
          <p className="font-archivo text-xl md:text-2xl mb-12 uppercase tracking-widest text-white/80 border-y-2 border-white/20 py-4 inline-block">
            {'Join 10,000+ fans already in the stands.'}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 justify-center">
            <Link to="/register" className="neu-button bg-white text-black text-2xl md:text-3xl py-6 px-12 shadow-[8px_8px_0px_0px_#ccff00] border-black hover:bg-[#ccff00] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#fff] transition-all">
              <Zap size={32} className="fill-black" /> {'CREATE ACCOUNT'}
            </Link>
            <Link to="/login" className="neu-button-secondary border-white text-white bg-transparent text-2xl md:text-3xl py-6 px-12 hover:bg-white hover:text-black transition-colors">
              {'SIGN IN'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
