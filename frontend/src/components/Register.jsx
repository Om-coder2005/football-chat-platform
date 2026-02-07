import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import '../styles/auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    favorite_club: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.favorite_club
      );
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>CASA ULTRAS</h1>
        <h2>Create account</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="register-username">Username *</label>
            <input
              id="register-username"
              type="text"
              name="username"
              autoComplete="username"
              spellCheck={false}
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. fan99"
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email *</label>
            <input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-favorite-club">Favorite club</label>
            <input
              id="register-favorite-club"
              type="text"
              name="favorite_club"
              autoComplete="off"
              value={formData.favorite_club}
              onChange={handleChange}
              placeholder="e.g. Liverpool FC"
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Password *</label>
            <input
              id="register-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <small>At least 8 characters, 1 uppercase, 1 lowercase, 1 number</small>
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password">Confirm password *</label>
            <input
              id="register-confirm-password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
