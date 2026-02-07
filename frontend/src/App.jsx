import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import CommunityList from './components/CommunityList';
import CommunityRoom from './components/CommunityRoom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/communities"
            element={
              <ProtectedRoute>
                <CommunityList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/:communityId"
            element={
              <ProtectedRoute>
                <CommunityRoom />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
