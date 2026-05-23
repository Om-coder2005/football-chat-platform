import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from './AppHeader';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AppHeader />
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 1.5rem' }}>
        <div className="neu-card" style={{ maxWidth: '480px', width: '100%', background: 'var(--card-bg)', position: 'relative', overflow: 'visible' }}>
          
          {/* Decorative Sticker */}
          <div className="comic-sticker" style={{ position: 'absolute', top: '-25px', right: '-15px', background: 'var(--highlight-bg)', color: 'var(--highlight-text)', transform: 'rotate(12deg)', fontSize: '0.8rem', fontWeight: 900 }}>
            FAN LOGIN
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '3.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', lineHeight: 1 }}>
              WELCOME BACK
            </h2>
            <p style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Enter your details to join the match chat
            </p>
          </div>

          {error && (
            <div style={{ background: '#ff3b30', color: '#fff', border: '3px solid #000', padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, boxShadow: '4px 4px 0 #000' }}>
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontFamily: 'var(--font-archivo)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} /> Email Address
              </label>
              <input 
                id="login-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="ultrafan@stadium.com" 
                required 
                className="neu-input"
                style={{ width: '100%', border: '4px solid var(--border-color)', boxShadow: '4px 4px 0 var(--shadow-color)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontFamily: 'var(--font-archivo)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} /> Password
              </label>
              <input 
                id="login-password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                className="neu-input"
                style={{ width: '100%', border: '4px solid var(--border-color)', boxShadow: '4px 4px 0 var(--shadow-color)' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="neu-button" 
              style={{ marginTop: '1rem', background: 'var(--accent-primary)', color: 'var(--text-on-accent)', fontSize: '1.25rem', padding: '1rem', width: '100%', justifyContent: 'center', border: '4px solid var(--border-color)', boxShadow: '6px 6px 0 var(--shadow-color)' }}
            >
              {loading ? 'AUTHENTICATING...' : (
                <>
                  <LogIn size={24} style={{ marginRight: '12px' }} /> LOGIN NOW
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '4px dashed var(--border-color)' }}>
            <p style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700, fontSize: '1.1rem' }}>
              New to the terrace?{' '}
              <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', textDecorationThickness: '4px' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
