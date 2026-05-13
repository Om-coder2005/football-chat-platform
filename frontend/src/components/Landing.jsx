import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityAPI } from '../services/api';
import AppHeader from './AppHeader';
import { MessageSquare, BarChart2, Bot, Shield, Users, Zap, Activity, ArrowRight, Star } from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'Live Fan Chat',    desc: 'Join thousands of fans in real-time during the match. React. Argue. Celebrate.', rotate: '-1.5deg' },
  { icon: BarChart2,    title: 'Live Stats',        desc: 'Live scores, xG, possession — updated every minute during play.',               rotate: '1deg'   },
  { icon: Bot,          title: 'AI Match Summary',  desc: 'Gemini-powered tactical breakdowns and fan sentiment reports.',                  rotate: '-0.5deg'},
  { icon: Shield,       title: 'Club Communities',  desc: 'Curated rooms for every major club. Pick your stand, stay loyal.',              rotate: '1.5deg' },
];

const AccentColors = ['var(--highlight-bg)', '#ff3b30', '#3b82f6', '#10b981', '#8b5cf6', '#f97316'];

const CommunityCard = ({ community, index }) => {
  if (!community) return null;
  return (
    <Link 
      to={`/community/${community.id || ''}`} 
      className="neu-box p-6 block no-underline transition-transform hover:-translate-y-1"
      style={{ 
        background: AccentColors[index % AccentColors.length],
        boxShadow: '6px 6px 0px 0px #000'
      }}
    >
      <h3 className="font-archivo text-xl uppercase text-black mb-1 leading-tight">{community.name || 'Unknown Community'}</h3>
      <p className="font-inter font-extrabold text-xs text-black/60 uppercase tracking-widest mb-4">{community.club_name || 'General'}</p>
      <div className="flex items-center gap-2 bg-white/30 border border-black/20 px-3 py-1 inline-flex rounded-sm">
        <Users size={14} color="#000" />
        <span className="font-archivo text-xs text-black">{community.member_count || 0} FANS</span>
      </div>
    </Link>
  );
};

const Landing = () => {
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    let isMounted = true;
    communityAPI.getAll()
      .then(r => {
        if (isMounted && r.data && r.data.communities) {
          setCommunities(r.data.communities.slice(0, 6));
        }
      })
      .catch(err => console.error('Landing communities fetch error:', err));
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-0">
      <AppHeader />

      {/* ── HERO ── */}
      <section className="border-b-4 border-black py-20 px-6 relative overflow-hidden bg-[linear-gradient(135deg,var(--bg-primary)_0%,var(--bg-tertiary)_100%)]">
        <div className="absolute top-10 right-10 opacity-10 rotate-12 hidden lg:block">
           <Zap size={200} fill="var(--accent-primary)" stroke="none" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-wrap gap-4 mb-8">
            <span className="comic-sticker rotate-[-3deg] text-lg px-6 py-2">⚽ MATCHDAY LIVE</span>
            <span className="comic-sticker bg-black text-white rotate-[2deg] text-lg px-6 py-2">NO PLASTIC FANS</span>
          </div>

          <h1 className="neu-heading text-[clamp(4rem,15vw,12rem)] mb-6 leading-[0.85] tracking-tighter">
            CASA<br />ULTRAS
          </h1>

          <div className="max-w-xl mb-12">
            <p className="font-inter font-bold text-2xl bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] rotate-[-1deg] leading-relaxed">
              The only digital pub where live scores meet real fan banter. <span className="text-[var(--accent-primary)]">Pick your club.</span> Join the chant.
            </p>
          </div>

          <div className="flex flex-wrap gap-6">
            <Link to="/communities" className="neu-button text-xl py-5 px-10 group bg-yellow-400 text-black">
              <Users size={24} /> FIND YOUR CLUB <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link to="/live-scores" className="neu-button-secondary text-xl py-5 px-10 bg-white">
              <Activity size={24} /> LIVE SCORES
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <h2 className="neu-heading text-5xl md:text-7xl">WHY CASA ULTRAS?</h2>
            <div className="h-2 flex-1 bg-black"></div>
            <Star size={48} className="text-yellow-400 fill-current" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div 
                  key={f.title} 
                  className="neu-card bg-[var(--bg-primary)] p-8 transition-all hover:rotate-0"
                  style={{ transform: `rotate(${f.rotate})` }}
                >
                  <div className="bg-[var(--accent-primary)] border-4 border-black w-16 h-16 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#000]">
                    <Icon size={32} color="#fff" />
                  </div>
                  <h3 className="font-archivo text-2xl uppercase mb-3 leading-tight">{f.title}</h3>
                  <p className="font-inter font-bold text-[var(--text-secondary)] leading-relaxed text-sm">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ACTIVE STANDS ── */}
      {communities.length > 0 && (
        <section className="py-24 px-6 border-b-4 border-black bg-[var(--bg-tertiary)]">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-12 gap-6">
              <h2 className="neu-heading text-5xl md:text-7xl">ACTIVE STANDS</h2>
              <Link to="/communities" className="neu-button-secondary py-3 px-8 text-sm flex items-center gap-2">
                VIEW ALL COMMUNITIES <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {communities.map((c, i) => <CommunityCard key={c.id || i} community={c} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-32 px-6 bg-black text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className="flex flex-wrap gap-20 p-20 justify-center">
             {[...Array(20)].map((_, i) => <Activity key={i} size={100} />)}
           </div>
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="font-bebas text-[5rem] md:text-[8rem] text-[var(--accent-primary)] mb-4 leading-none tracking-tight">
            THE TERRACE IS CALLING
          </h2>
          <p className="font-archivo text-xl mb-12 uppercase tracking-widest text-gray-400">
            Join 10,000+ fans already in the stands.
          </p>
          <div className="flex flex-wrap gap-6 justify-center">
            <Link to="/register" className="neu-button bg-[var(--accent-primary)] text-white text-2xl py-6 px-12 shadow-[6px_6px_0px_0px_#fff] border-white">
              <Zap size={28} /> CREATE ACCOUNT
            </Link>
            <Link to="/login" className="neu-button-secondary border-white text-white bg-transparent text-2xl py-6 px-12 hover:bg-white hover:text-black transition-colors">
              SIGN IN
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
