import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import CommunityList from './components/CommunityList';
import CommunityRoom from './components/CommunityRoom';

function App() {

  return (

    <AuthProvider>
      <Router>
        <Routes>
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
          <Route path="/" element={<Navigate to="/communities" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
