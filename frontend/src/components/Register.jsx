import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from './AppHeader';
import { User, Mail, Lock, Trophy, UserPlus, AlertCircle } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { register }            = useContext(AuthContext);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(username, email, password, favoriteClub);
      navigate('/login'); // Better UX to go to login first to verify
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AppHeader />
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 1.5rem' }}>
        <div className="neu-card" style={{ maxWidth: '520px', width: '100%', background: 'var(--card-bg)', position: 'relative', overflow: 'visible' }}>
          
          {/* Decorative Sticker */}
          <div className="comic-sticker" style={{ position: 'absolute', top: '-25px', left: '-15px', background: '#10b981', color: '#000', transform: 'rotate(-12deg)', fontSize: '0.8rem', fontWeight: 900 }}>
            JOIN THE FIRM
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '2.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', lineHeight: 1 }}>
              GET YOUR COLORS
            </h2>
            <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Join thousands of fans in the digital stands
            </p>
          </div>

          {error && (
            <div style={{ background: '#ff3b30', color: '#fff', border: '3px solid #000', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, boxShadow: '4px 4px 0 #000' }}>
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontFamily: '"Archivo Black", sans-serif', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={12} /> Username
              </label>
              <input 
                id="reg-username" 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="UltrasFan_01" 
                required 
                className="neu-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontFamily: '"Archivo Black", sans-serif', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={12} /> Email
              </label>
              <input 
                id="reg-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@stadium.com" 
                required 
                className="neu-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontFamily: '"Archivo Black", sans-serif', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={12} /> Favorite Club
              </label>
              <input 
                id="reg-club" 
                type="text" 
                value={favoriteClub} 
                onChange={e => setFavoriteClub(e.target.value)} 
                placeholder="e.g. Real Madrid" 
                required 
                className="neu-input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontFamily: '"Archivo Black", sans-serif', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={12} /> Password
              </label>
              <input 
                id="reg-password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Min. 8 chars, Upper, Lower, Num" 
                required 
                className="neu-input"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="neu-button" 
              style={{ marginTop: '0.5rem', background: '#10b981', color: '#000', fontSize: '1.25rem', padding: '1rem', width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'PROCESSING...' : (
                <>
                  <UserPlus size={20} style={{ marginRight: '8px' }} /> SIGN UP
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '2px dashed var(--border-color)' }}>
            <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700 }}>
              Already part of the firm?{' '}
              <Link to="/login" style={{ color: '#10b981', textDecoration: 'underline', textDecorationThickness: '3px' }}>
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
