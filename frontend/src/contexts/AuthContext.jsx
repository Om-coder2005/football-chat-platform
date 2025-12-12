import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:5000/api/auth';

  // Configure axios defaults
  axios.defaults.baseURL = 'http://localhost:5000';

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          // Set token in axios defaults
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch current user
          const response = await axios.get(`${API_URL}/me`);
          
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            // Token invalid, clear it
            logout();
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
          logout();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register function
  const register = async (username, email, password, favoriteClub) => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post(`${API_URL}/register`, {
        username,
        email,
        password,
        favorite_club: favoriteClub
      });

      if (response.data.success) {
        // Auto-login after registration
        await login(email, password);
        return { success: true, message: response.data.message };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post(`${API_URL}/login`, {
        email,
        password
      });

      if (response.data.success) {
        const { access_token, refresh_token } = response.data.tokens;
        
        // Store tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        // Set token in axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        // Set user
        setUser(response.data.user);
        
        return { success: true, message: response.data.message };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Remove tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Remove axios header
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear user
    setUser(null);
    setError(null);
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const refresh_token = localStorage.getItem('refresh_token');
      
      if (!refresh_token) {
        logout();
        return false;
      }

      const response = await axios.post(`${API_URL}/refresh`, {}, {
        headers: {
          'Authorization': `Bearer ${refresh_token}`
        }
      });

      if (response.data.success) {
        const { access_token } = response.data;
        
        // Update stored token
        localStorage.setItem('access_token', access_token);
        
        // Update axios header
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        return true;
      }

      logout();
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return false;
    }
  };

  // Axios interceptor for token refresh on 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshed = await refreshToken();
          
          if (refreshed) {
            // Retry original request with new token
            return axios(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};