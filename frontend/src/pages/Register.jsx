import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import "../styles/auth.css";   

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    favoriteClub: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await register(
      formData.username,
      formData.email,
      formData.password,
      formData.favoriteClub || null
    );

    if (result.success) {
      navigate('/communities', { replace: true });
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const popularClubs = [
    'Manchester United', 'Liverpool', 'Barcelona', 'Real Madrid',
    'Bayern Munich', 'Manchester City', 'Chelsea', 'Arsenal',
    'Paris Saint-Germain', 'Juventus'
  ];

  return (
    <div className="auth-container register-bg">
      <div className="auth-card">
        <div className="text-center mb-8">
          <h1 className="auth-title">⚽ Join Football Chat</h1>
          <p className="auth-subtitle">Create your account and connect with fans</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form space-y-4">
          <div>
            <label htmlFor="username" className="auth-label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              className="auth-input"
              placeholder="footballfan123"
            />
          </div>

          <div>
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="auth-input"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="auth-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              className="auth-input"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1 px-1">
              At least 8 characters with uppercase, lowercase & number
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="auth-input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="favoriteClub" className="auth-label">Favorite Club (Optional)</label>
            <select
              id="favoriteClub"
              name="favoriteClub"
              value={formData.favoriteClub}
              onChange={handleChange}
              className="auth-input"
            >
              <option value="">Select a club...</option>
              {popularClubs.map(club => (
                <option key={club} value={club}>{club}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-button register-btn"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
