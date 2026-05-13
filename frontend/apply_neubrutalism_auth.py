import os

login_jsx = """import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from './AppHeader';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/communities');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <div className="flex items-center justify-center p-6 mt-12 relative overflow-hidden">
        
        <div className="comic-sticker top-10 left-10 text-2xl rotate-[-15deg] px-4 py-2 bg-blue-400 text-white hidden md:block">ENTER THE STANDS</div>
        <div className="comic-sticker bottom-10 right-10 text-xl rotate-[10deg] px-4 py-2 bg-yellow-400 hidden md:block">NO PLASTICS</div>

        <div className="neu-card max-w-md w-full bg-white z-10">
          <div className="text-center mb-8">
            <h1 className="neu-heading text-5xl mb-2 text-black">CASA ULTRAS</h1>
            <h2 className="font-['Archivo_Black'] uppercase text-xl text-gray-700 bg-yellow-300 inline-block px-4 py-1 border-2 border-black -rotate-2">Welcome Back</h2>
          </div>
          
          {error && <div className="bg-red-500 text-white font-['Inter'] font-bold border-2 border-black p-3 mb-6 shadow-[2px_2px_0px_0px_#000]">{error}</div>}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="font-['Archivo_Black'] uppercase tracking-wider text-black">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="neu-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="font-['Archivo_Black'] uppercase tracking-wider text-black">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="neu-input"
              />
            </div>

            <button type="submit" disabled={loading} className="neu-button mt-4 w-full text-xl bg-blue-500 text-white hover:bg-blue-600">
              {loading ? 'LOGGING IN…' : 'LOGIN'}
            </button>
          </form>

          <p className="mt-8 text-center font-['Inter'] font-bold text-black">
            Don't have an account? <Link to="/register" className="text-blue-600 underline decoration-4 underline-offset-4 hover:bg-blue-600 hover:text-white transition-colors p-1">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
"""

register_jsx = """import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from './AppHeader';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(username, email, password);
      navigate('/communities');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <AppHeader />
      <div className="flex items-center justify-center p-6 mt-12 relative overflow-hidden">
        
        <div className="comic-sticker top-20 right-20 text-2xl rotate-[12deg] px-4 py-2 bg-green-400 text-black hidden md:block">JOIN THE FIRM</div>

        <div className="neu-card max-w-md w-full bg-white z-10">
          <div className="text-center mb-8">
            <h1 className="neu-heading text-5xl mb-2 text-black">CASA ULTRAS</h1>
            <h2 className="font-['Archivo_Black'] uppercase text-xl text-white bg-red-500 inline-block px-4 py-1 border-2 border-black rotate-1">Create Account</h2>
          </div>
          
          {error && <div className="bg-red-500 text-white font-['Inter'] font-bold border-2 border-black p-3 mb-6 shadow-[2px_2px_0px_0px_#000]">{error}</div>}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-username" className="font-['Archivo_Black'] uppercase tracking-wider text-black">Username</label>
              <input
                id="reg-username"
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Fan123"
                required
                className="neu-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-email" className="font-['Archivo_Black'] uppercase tracking-wider text-black">Email</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="neu-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-password" className="font-['Archivo_Black'] uppercase tracking-wider text-black">Password</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="neu-input"
              />
            </div>

            <button type="submit" disabled={loading} className="neu-button mt-4 w-full text-xl bg-green-500 text-black hover:bg-green-400">
              {loading ? 'JOINING…' : 'JOIN THE COMMUNITY'}
            </button>
          </form>

          <p className="mt-8 text-center font-['Inter'] font-bold text-black">
            Already have an account? <Link to="/login" className="text-red-600 underline decoration-4 underline-offset-4 hover:bg-red-600 hover:text-white transition-colors p-1">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
"""

with open("d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/Login.jsx", "w", encoding="utf-8") as f:
    f.write(login_jsx)
with open("d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/components/Register.jsx", "w", encoding="utf-8") as f:
    f.write(register_jsx)

css_file = "d:/Community Chat room/The Main Project/football-chat-platform/frontend/src/styles/auth.css"
if os.path.exists(css_file):
    os.remove(css_file)

print("Auth pages updated to Neubrutalism design and auth.css removed.")
