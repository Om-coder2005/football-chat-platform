import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './AppHeader.css';

/**
 * Global site header: logo, live score widget, main nav.
 * Shows Login when unauthenticated, Logout when authenticated.
 * @returns {JSX.Element}
 */
const AppHeader = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Link to="/" className="app-header-logo" aria-label="CASA ULTRAS home">
          CASA ULTRAS.logo
        </Link>
        <div className="app-header-live-indicator" aria-live="polite">
          <span className="live-indicator-dot" aria-hidden="true" />
          <span className="live-indicator-text">LIVE 78&apos;</span>
        </div>
      </div>
      <div className="app-header-center">
        <div className="app-header-live-score" aria-live="polite">
          <img 
            src="/spain_real-madrid.football-logos.cc.svg" 
            alt="Real Madrid" 
            className="live-score-crest" 
            width={32} 
            height={32}
            aria-label="Real Madrid"
          />
          <span className="live-score-text">2-1</span>
          <img 
            src="/spain_barcelona.football-logos.cc.svg" 
            alt="Barcelona" 
            className="live-score-crest" 
            width={32} 
            height={32}
            aria-label="Barcelona"
          />
        </div>
      </div>
      <nav className="app-header-nav" aria-label="Main navigation">
        <Link to="/" className="app-header-link">HOME</Link>
        <Link to="/communities" className="app-header-link">COMMUNITIES</Link>
        <a href="/#live-scores" className="app-header-link">LIVE SCORES</a>
        {user ? (
          <button
            type="button"
            className="app-header-link app-header-login"
            onClick={handleLogout}
            aria-label="Log out"
          >
            LOGOUT
          </button>
        ) : (
          <Link to="/login" className="app-header-link app-header-login">LOGIN</Link>
        )}
      </nav>
    </header>
  );
};

export default AppHeader;
