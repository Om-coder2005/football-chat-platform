import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { communityAPI } from '../services/api';
import AppHeader from './AppHeader';
import './Landing.css';

/**
 * Hero section with title, tagline, CTAs, background image, and feature cards.
 * @returns {JSX.Element}
 */
const HeroSection = () => {
  const features = [
    {
      id: 'live-chat',
      title: 'Live fan chat',
      description: 'Join the chant instantly.',
      icon: 'chat',
      ariaLabel: 'Live fan chat: join the chant instantly',
    },
    {
      id: 'live-stats',
      title: 'Live stats',
      description: 'Live scores updated.',
      icon: 'stats',
      ariaLabel: 'Live stats: live scores updated',
    },
    {
      id: 'fan-power',
      title: 'Fan power',
      description: 'Vote for Man of the Match.',
      icon: 'vote',
      ariaLabel: 'Fan power: vote for Man of the Match',
    },
  ];

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <h1 id="hero-title" className="hero-title">CASA ULTRAS</h1>
        <p className="hero-tagline">
          Join the only community where live scores meet real fan banter. Pick your club, enter the chat, and celebrate every goal together.
        </p>
        <div className="hero-actions">
          <Link to="/communities" className="btn btn-primary">
            Find your club
          </Link>
          <Link to="/live-scores" className="btn btn-outline">
            Live scores
          </Link>
        </div>
        <div className="hero-online" aria-live="polite">
          <span className="avatar-stack" aria-hidden="true">
            <span className="avatar" />
            <span className="avatar" />
            <span className="avatar" />
          </span>
          <span>100+ Fans Online</span>
        </div>
        <div className="hero-features">
          <div className="features-grid">
            {features.map((f) => (
              <article
                key={f.id}
                className="feature-card"
                aria-label={f.ariaLabel}
              >
                <div className="feature-icon-wrap">
                  {f.icon === 'chat' && (
                    <svg className="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                  {f.icon === 'stats' && (
                    <svg className="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="4" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="7.5" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="12.5" r="1.5" fill="currentColor"/>
                      <circle cx="8" cy="17.5" r="1.5" fill="currentColor"/>
                      <path d="M14 7.5H18M14 12.5H18M14 17.5H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                  {f.icon === 'vote' && (
                    <svg className="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M6 9L12 3L18 9V19C18 19.5523 17.5523 20 17 20H7C6.44772 20 6 19.5523 6 19V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 20V14H15V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 3V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 14H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M3 14L6 11M21 14L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="feature-text-wrap">
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-image-wrap">
        <img
          src="/97e2323ec9a97e9abc02e527be19a500-Picsart-AiImageEnhancer 1.png"
          alt="Football legends and players"
          className="hero-image"
          fetchPriority="high"
        />
      </div>
    </section>
  );
};


/**
 * Map of club name keywords to their logo paths and gradient classes.
 * Used to match community names from the database to visual branding.
 */
const CLUB_BRANDING = {
  'real madrid':       { logo: '/spain_real-madrid.football-logos.cc.svg', gradient: 'rm' },
  'liverpool':         { logo: '/england_liverpool.football-logos.cc.svg', gradient: 'liverpool' },
  'barcelona':         { logo: '/spain_barcelona.football-logos.cc.svg', gradient: 'barca' },
  'manchester united': { logo: '/england_manchester-united.football-logos.cc.svg', gradient: 'utd' },
  'bayern':            { logo: null, gradient: 'bayern' },
  'bayern munich':     { logo: null, gradient: 'bayern' },
  'arsenal':           { logo: '/england_arsenal.football-logos.cc.svg', gradient: 'arsenal' },
  'psg':               { logo: '/france_paris-saint-germain.football-logos.cc.svg', gradient: 'psg' },
  'paris saint-germain': { logo: '/france_paris-saint-germain.football-logos.cc.svg', gradient: 'psg' },
  'dortmund':          { logo: '/germany_borussia-dortmund.football-logos.cc.svg', gradient: 'dortmund' },
  'borussia dortmund': { logo: '/germany_borussia-dortmund.football-logos.cc.svg', gradient: 'dortmund' },
};

/**
 * Get branding (logo path and gradient class) for a community by name.
 * Performs a case-insensitive partial match against known club names.
 * @param {string} communityName - Community name from database
 * @returns {{ logo: string|null, gradient: string }} Branding info
 */
const getClubBranding = (communityName) => {
  const nameLower = (communityName || '').toLowerCase();
  for (const [keyword, branding] of Object.entries(CLUB_BRANDING)) {
    if (nameLower.includes(keyword)) {
      return branding;
    }
  }
  return { logo: null, gradient: 'default' };
};

/**
 * "Choose your stand" section with club/community cards.
 * Fetches real communities from the backend so card links use valid numeric IDs.
 * @returns {JSX.Element}
 */
const ChooseYourStand = () => {
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    /**
     * Fetch communities from backend API
     */
    const fetchCommunities = async () => {
      try {
        const response = await communityAPI.getAll();
        const fetched = response.data.communities || [];
        setCommunities(fetched);
      } catch {
        setCommunities([]);
      }
    };
    fetchCommunities();
  }, []);

  /**
   * Build the display list with specific clubs: Barcelona, Real Madrid, Man United, Liverpool, Arsenal + Other.
   * If these communities don't exist in DB, show placeholder cards.
   */
  const buildDisplayList = () => {
    const targetClubs = [
      { keyword: 'barcelona', displayName: 'Barcelona', subtitle: 'Blaugrana' },
      { keyword: 'real madrid', displayName: 'Real Madrid', subtitle: 'Los Blancos Global' },
      { keyword: 'manchester united', displayName: 'Manchester United', subtitle: 'Red Devils' },
      { keyword: 'liverpool', displayName: 'Liverpool', subtitle: 'Merseyside Club' },
      { keyword: 'arsenal', displayName: 'Arsenal', subtitle: 'The Gunners' }
    ];
    const enriched = [];

    // Try to find each target club in the fetched communities
    targetClubs.forEach((club) => {
      const found = communities.find((c) => 
        c.name.toLowerCase().includes(club.keyword)
      );

      if (found) {
        const branding = getClubBranding(found.name);
        enriched.push({
          id: found.id,
          name: found.name,
          subtitle: club.subtitle,
          online: found.member_count || 0,
          gradient: branding.gradient,
          logoPath: found.logo_url || branding.logo,
        });
      } else {
        // Placeholder if not found in DB
        const branding = getClubBranding(club.keyword);
        enriched.push({
          id: club.keyword.replace(' ', '-'),
          name: club.displayName,
          subtitle: club.subtitle,
          online: 0,
          gradient: branding.gradient,
          logoPath: branding.logo,
        });
      }
    });

    // Always add "Other" card at the end
    enriched.push({
      id: 'other',
      name: 'Other',
      subtitle: '50+ clubs',
      online: null,
      gradient: 'other',
      logoPath: null,
    });

    return enriched;
  };

  const displayCommunities = buildDisplayList();

  return (
    <section id="live-scores" className="choose-stand" aria-labelledby="choose-stand-heading">
      <h2 id="choose-stand-heading" className="section-title">CHOOSE YOUR STAND</h2>
      <p className="section-tagline">Join 50+ active communities. No bandwagon fans allowed.</p>
      <div className="clubs-grid">
        {displayCommunities.map((c) => (
          <Link
            key={c.id}
            to={c.id === 'other' ? '/communities' : `/community/${c.id}`}
            className={`club-card club-card--${c.gradient || 'default'}`}
            aria-label={`${c.name}${c.subtitle ? `, ${c.subtitle}` : ''}${c.online != null ? `, ${c.online} online` : ''}`}
          >
            <div className="club-card-inner">
              {c.logoPath ? (
                <img src={c.logoPath} alt="" width={56} height={56} className="club-logo" aria-hidden="true" />
              ) : (
                <span className={`club-logo-placeholder ${c.id === 'other' ? 'club-logo-placeholder--other' : ''}`} aria-hidden="true">
                  {c.id === 'other' ? '50+' : c.name.charAt(0)}
                </span>
              )}
              <h3 className="club-name">{c.name}</h3>
              <p className="club-subtitle">{c.subtitle}</p>
              {c.online != null && (
                <span className="club-online">
                  <span className="club-online-dot" aria-hidden="true" />
                  {c.online} online
                </span>
              )}
              <span className="club-arrow" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

/**
 * Full-bleed heritage banner with crowd image.
 * @returns {JSX.Element}
 */
const HeritageBanner = () => {
  return (
    <section className="heritage-banner" aria-labelledby="heritage-heading">
      <img
        src="/download (14) 1 (1).png"
        alt=""
        width={1920}
        height={600}
        className="heritage-bg"
        loading="lazy"
      />
      <div className="heritage-overlay" />
      <h2 id="heritage-heading" className="heritage-title">Create a heritage</h2>
    </section>
  );
};

/**
 * Footer with brand, copyright, and social links.
 * @returns {JSX.Element}
 */
const LandingFooter = () => {
  return (
    <footer className="landing-footer">
      <span className="footer-brand">CASA ULTRAS</span>
      <span className="footer-copy">© 2025 Football Fan Community. Built for the fans.</span>
      <div className="footer-social">
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">Instagram</a>
        <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="X (Twitter)">X</a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">GitHub</a>
      </div>
    </footer>
  );
};

/**
 * Landing page: hero, features, choose your stand, heritage banner, footer.
 * Uses design from CASA ULTRAS reference (dark theme, orange/green accents).
 */
const Landing = () => {
  return (
    <div className="landing-page">
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
