import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import CommunityList from './components/CommunityList';
import CommunityRoom from './components/CommunityRoom';
import LiveScores from './components/LiveScores';
import LeagueMatches from './components/LeagueMatches';
import MatchDetail from './components/MatchDetail';
import Profile from './components/Profile';
import Settings from './components/Settings';
import StickerShop from './components/StickerShop';
import RivalryDashboard from './components/RivalryDashboard';
import RivalryRoom from './components/RivalryRoom';
import TransferMarket from './components/TransferMarket';


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/live-scores" element={<LiveScores />} />
              <Route path="/transfers" element={<TransferMarket />} />
              <Route path="/league/:competitionId" element={<LeagueMatches />} />
              <Route path="/match/:matchId" element={<MatchDetail />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
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
              <Route
                path="/stickers/shop"
                element={
                  <ProtectedRoute>
                    <StickerShop />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rivalry"
                element={
                  <ProtectedRoute>
                    <RivalryDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rivalry/:id"
                element={
                  <ProtectedRoute>
                    <RivalryRoom />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
