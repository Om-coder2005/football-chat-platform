import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import CommunityList from './components/CommunityList';
import CommunityRoom from './components/CommunityRoom';
import LiveScores from './components/LiveScores';
import LeagueMatches from './components/LeagueMatches';
import MatchDetail from './components/MatchDetail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/live-scores" element={<LiveScores />} />
          <Route path="/league/:competitionId" element={<LeagueMatches />} />
          <Route path="/match/:matchId" element={<MatchDetail />} />
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
