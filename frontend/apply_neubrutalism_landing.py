import os

landing_jsx = """import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { communityAPI } from '../services/api';
import AppHeader from './AppHeader';

const HeroSection = () => {
  const features = [
    {
      id: 'live-chat',
      title: 'Live Fan Chat',
      description: 'Join the chant instantly.',
      icon: '💬',
    },
    {
      id: 'live-stats',
      title: 'Live Stats',
      description: 'Live scores updated.',
      icon: '📊',
    },
    {
      id: 'fan-power',
      title: 'Fan Power',
      description: 'Vote for Man of the Match.',
      icon: '⚡',
    },
  ];

  return (
    <section className="relative min-h-[85vh] flex flex-col md:flex-row items-center justify-between px-6 py-12 md:px-16 overflow-hidden border-b-4 border-black bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-tertiary)]">
      
      {/* Decorative Stickers */}
      <div className="comic-sticker top-12 left-12 rotate-[-12deg] text-2xl px-4 py-2 bg-pink-400">#MATCHDAY</div>
      <div className="comic-sticker bottom-24 right-1/2 rotate-[15deg] text-xl px-3 py-1 bg-green-400">VAR OUT</div>

      <div className="w-full md:w-1/2 z-10 flex flex-col gap-8">
        <h1 className="neu-heading text-8xl lg:text-[140px] text-stroke-2">
          CASA ULTRAS
        </h1>
        <p className="font-['Inter'] text-2xl font-bold max-w-lg bg-[var(--bg-secondary)] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] -rotate-1">
          The only digital pub where live scores meet real fan banter. Pick your club.
        </p>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <Link to="/communities" className="neu-button text-xl">
            FIND YOUR CLUB
          </Link>
          <Link to="/live-scores" className="neu-button-secondary text-xl">
            LIVE SCORES
          </Link>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <div className="flex -space-x-4">
            <div className="w-12 h-12 rounded-full border-2 border-black bg-blue-500 z-30"></div>
            <div className="w-12 h-12 rounded-full border-2 border-black bg-red-500 z-20"></div>
            <div className="w-12 h-12 rounded-full border-2 border-black bg-yellow-400 z-10"></div>
          </div>
          <span className="font-['Archivo_Black'] text-lg uppercase bg-[var(--bg-secondary)] px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000]">100+ Fans Online</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {features.map(f => (
            <div key={f.id} className="neu-box p-4 bg-white hover:bg-yellow-100 flex flex-col gap-2">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="font-['Archivo_Black'] uppercase text-lg">{f.title}</h3>
              <p className="font-['Inter'] font-semibold text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-1/2 h-[500px] md:h-[700px] relative mt-12 md:mt-0 flex justify-center items-center">
        <div className="absolute inset-0 bg-blue-600 rounded-[40px] border-4 border-black shadow-[16px_16px_0px_0px_#000] rotate-3 overflow-hidden">
          <img 
            src="/97e2323ec9a97e9abc02e527be19a500-Picsart-AiImageEnhancer 1.png" 
            className="w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500"
            alt="Football Crowd"
          />
        </div>
        <div className="absolute -bottom-6 -left-6 bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 -rotate-6 z-20">
          <p className="font-['Archivo_Black'] text-4xl uppercase">No Plastics Allowed</p>
        </div>
      </div>
    </section>
  );
};

const ChooseYourStand = () => {
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const response = await communityAPI.getAll();
        setCommunities(response.data.communities || []);
      } catch {
        setCommunities([]);
      }
    };
    fetchCommunities();
  }, []);

  const buildDisplayList = () => {
    const targetClubs = [
      { keyword: 'barcelona', displayName: 'Barcelona', subtitle: 'Blaugrana', color: 'bg-red-600' },
      { keyword: 'real madrid', displayName: 'Real Madrid', subtitle: 'Los Blancos', color: 'bg-gray-100' },
      { keyword: 'manchester united', displayName: 'Man United', subtitle: 'Red Devils', color: 'bg-red-700' },
      { keyword: 'liverpool', displayName: 'Liverpool', subtitle: 'Merseyside', color: 'bg-red-800' },
      { keyword: 'arsenal', displayName: 'Arsenal', subtitle: 'The Gunners', color: 'bg-red-500' }
    ];
    
    const enriched = [];
    targetClubs.forEach((club) => {
      const found = communities.find((c) => c.name.toLowerCase().includes(club.keyword));
      if (found) {
        enriched.push({ ...club, id: found.id, online: found.member_count || 0 });
      } else {
        enriched.push({ ...club, id: club.keyword.replace(' ', '-'), online: 0 });
      }
    });

    enriched.push({
      id: 'other',
      displayName: 'Other',
      subtitle: '50+ clubs',
      color: 'bg-yellow-400',
      online: null
    });

    return enriched;
  };

  const displayCommunities = buildDisplayList();

  return (
    <section className="py-24 px-6 md:px-16 bg-[var(--bg-secondary)] border-b-4 border-black relative overflow-hidden">
      <div className="comic-sticker right-10 top-10 rotate-[20deg] text-3xl px-4 py-2 bg-blue-400 text-white">AWAY END</div>
      <div className="max-w-7xl mx-auto">
        <h2 className="neu-heading mb-4">CHOOSE YOUR STAND</h2>
        <p className="font-['Inter'] text-2xl font-bold mb-12 max-w-2xl bg-white border-2 border-black inline-block p-2 shadow-[4px_4px_0px_0px_#000]">Join 50+ active communities. Support local.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayCommunities.map((c, i) => (
            <Link
              key={c.id}
              to={c.id === 'other' ? '/communities' : `/community/${c.id}`}
              className={`neu-box ${c.color} p-8 flex flex-col h-64 justify-between relative group overflow-hidden`}
              style={{ transform: `rotate(${i % 2 === 0 ? '-1deg' : '1deg'})` }}
            >
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-black opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <span className={`w-16 h-16 flex items-center justify-center font-['Archivo_Black'] text-3xl border-4 border-black shadow-[4px_4px_0px_0px_#000] rounded-xl ${c.color === 'bg-gray-100' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  {c.id === 'other' ? '+' : c.displayName.charAt(0)}
                </span>
                {c.online != null && (
                  <span className="neu-badge bg-green-400">
                    {c.online} ONLINE
                  </span>
                )}
              </div>
              
              <div className="relative z-10">
                <h3 className={`font-['Archivo_Black'] text-4xl uppercase ${c.color === 'bg-gray-100' || c.color === 'bg-yellow-400' ? 'text-black' : 'text-white'} group-hover:underline`}>{c.displayName}</h3>
                <p className={`font-['Inter'] font-bold text-lg ${c.color === 'bg-gray-100' || c.color === 'bg-yellow-400' ? 'text-gray-800' : 'text-gray-200'}`}>{c.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const HeritageBanner = () => {
  return (
    <section className="bg-black text-white py-32 px-6 border-b-4 border-black relative overflow-hidden flex flex-col items-center text-center">
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("/download (14) 1 (1).png")', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
      <div className="relative z-10">
        <h2 className="neu-heading text-6xl md:text-[100px] text-yellow-400 drop-shadow-[4px_4px_0px_#fff]">FOOTBALL IS NOTHING</h2>
        <h2 className="neu-heading text-6xl md:text-[100px] text-white drop-shadow-[4px_4px_0px_#ff3b30] mt-2">WITHOUT FANS</h2>
        <Link to="/register" className="neu-button bg-yellow-400 text-black mt-12 inline-block text-2xl py-4 px-10">JOIN THE MOVEMENT</Link>
      </div>
    </section>
  );
};

const LandingFooter = () => {
  return (
    <footer className="bg-white border-t-4 border-black py-12 px-6 md:px-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <span className="font-['Archivo_Black'] text-4xl tracking-tighter">CASA ULTRAS</span>
        <span className="font-['Inter'] font-bold text-sm bg-yellow-300 border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_#000]">© 2026 Built for the Fans.</span>
      </div>
    </footer>
  );
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <main>
        <HeroSection />
        <ChooseYourStand />
        <HeritageBanner />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Landing;
"""

with open("d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/Landing.jsx", "w", encoding='utf-8') as f:
    f.write(landing_jsx)

# Clean up old css
css_file = "d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/Landing.css"
if os.path.exists(css_file):
    os.remove(css_file)

print("Landing.jsx updated to Neubrutalism design and Landing.css removed.")
