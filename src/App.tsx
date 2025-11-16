import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { GamifiedHome } from './pages/GamifiedHome';
import { Journey } from './pages/Journey';
import { Player } from './pages/Player';
import './styles.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journey"
            element={
              <ProtectedRoute>
                <Journey />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/:id"
            element={
              <ProtectedRoute>
                <Player />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

