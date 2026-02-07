import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
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
          <a href="#live-scores" className="btn btn-outline">
            Live scores
          </a>
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
                      <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                  {f.icon === 'stats' && (
                    <svg className="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M4 19.5C4 18.6716 4.67157 18 5.5 18H6.5C7.32843 18 8 18.6716 8 19.5V20.5C8 21.3284 7.32843 22 6.5 22H5.5C4.67157 22 4 21.3284 4 20.5V19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H6.5C7.32843 3 8 3.67157 8 4.5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 19.5C10 18.6716 10.6716 18 11.5 18H12.5C13.3284 18 14 18.6716 14 19.5V20.5C14 21.3284 13.3284 22 12.5 22H11.5C10.6716 22 10 21.3284 10 20.5V19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 19.5V8.5C10 7.67157 10.6716 7 11.5 7H12.5C13.3284 7 14 7.67157 14 8.5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 19.5C16 18.6716 16.6716 18 17.5 18H18.5C19.3284 18 20 18.6716 20 19.5V20.5C20 21.3284 19.3284 22 18.5 22H17.5C16.6716 22 16 21.3284 16 20.5V19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 19.5V12.5C16 11.6716 16.6716 11 17.5 11H18.5C19.3284 11 20 11.6716 20 12.5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {f.icon === 'vote' && (
                    <svg className="feature-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M8 13V8C8 6.89543 8.89543 6 10 6H14C15.1046 6 16 6.89543 16 8V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 13L6 15V20C6 20.5523 6.44772 21 7 21H9C9.55228 21 10 20.5523 10 20V17H14V20C14 20.5523 14.4477 21 15 21H17C17.5523 21 18 20.5523 18 20V15L16 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 6V4C10 3.44772 10.4477 3 11 3H13C13.5523 3 14 3.44772 14 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.8"/>
                      <circle cx="19" cy="7" r="1" fill="currentColor" opacity="0.8"/>
                      <circle cx="19" cy="19" r="1.5" fill="currentColor" opacity="0.8"/>
                      <circle cx="5" cy="19" r="1" fill="currentColor" opacity="0.8"/>
                      <path d="M3 11L5 9M19 11L21 9M3 15L5 17M19 15L21 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
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
 * Get team logo path based on club ID
 * @param {string} clubId - Club identifier
 * @returns {string|null} - Path to logo SVG or null if not found
 */
const getTeamLogo = (clubId) => {
  const logoMap = {
    'rm': '/spain_real-madrid.football-logos.cc.svg',
    'real-madrid': '/spain_real-madrid.football-logos.cc.svg',
    'barca': '/spain_barcelona.football-logos.cc.svg',
    'barcelona': '/spain_barcelona.football-logos.cc.svg',
    'liverpool': '/england_liverpool.football-logos.cc.svg',
    'utd': '/england_manchester-united.football-logos.cc.svg',
    'manchester-united': '/england_manchester-united.football-logos.cc.svg',
    'arsenal': '/england_arsenal.football-logos.cc.svg',
    'psg': '/france_paris-saint-germain.football-logos.cc.svg',
    'paris-saint-germain': '/france_paris-saint-germain.football-logos.cc.svg',
    'dortmund': '/germany_borussia-dortmund.football-logos.cc.svg',
    'borussia-dortmund': '/germany_borussia-dortmund.football-logos.cc.svg',
  };
  return logoMap[clubId] || null;
};

/**
 * "Choose your stand" section with club/community cards.
 * @param {Object} props
 * @param {Array} props.communities - List of communities to display (optional).
 * @returns {JSX.Element}
 */
const ChooseYourStand = ({ communities = [] }) => {
  const displayCommunities = communities.length >= 6
    ? communities.slice(0, 6)
    : [
        { id: 'rm', name: 'Real Madrid', subtitle: 'Los Blancos Global', online: 342, gradient: 'rm' },
        { id: 'liverpool', name: 'Liverpool', subtitle: 'Merseyside Club', online: 102, gradient: 'liverpool' },
        { id: 'barca', name: 'Barcelona', subtitle: 'Culés', online: 900, gradient: 'barca' },
        { id: 'utd', name: 'Manchester United', subtitle: 'Red Devils', online: 456, gradient: 'utd' },
        { id: 'arsenal', name: 'Arsenal', subtitle: 'The Gunners', online: 278, gradient: 'arsenal' },
        { id: 'other', name: 'Other', subtitle: '50+ clubs', online: 900, gradient: 'other' },
      ];

  return (
    <section id="live-scores" className="choose-stand" aria-labelledby="choose-stand-heading">
      <h2 id="choose-stand-heading" className="section-title">CHOOSE YOUR STAND</h2>
      <p className="section-tagline">Join 50+ active communities. No bandwagon fans allowed.</p>
      <div className="clubs-grid">
        {displayCommunities.map((c) => (
          <Link
            key={c.id}
            to={c.id === 'other' || !c.id ? '/communities' : `/community/${c.id}`}
            className={`club-card club-card--${c.gradient || 'default'}`}
            aria-label={`${c.name}${c.subtitle ? `, ${c.subtitle}` : ''}${c.online != null ? `, ${c.online} online` : ''}`}
          >
            <div className="club-card-inner">
              {(() => {
                const logoPath = c.logo_url || getTeamLogo(c.id);
                return logoPath ? (
                  <img src={logoPath} alt="" width={56} height={56} className="club-logo" aria-hidden="true" />
                ) : (
                  <span className={`club-logo-placeholder ${c.id === 'other' ? 'club-logo-placeholder--other' : ''}`} aria-hidden="true">
                    {c.id === 'other' ? '50+' : c.name.charAt(0)}
                  </span>
                );
              })()}
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
