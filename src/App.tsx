import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { PrivateRoute } from './components/PrivateRoute';
import { useAuthContext } from './contexts/AuthContext';

// Configure future flags for React Router v7
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

// Auth guard for the auth page
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <Router {...routerOptions}>
        <AuthProvider>
          <Routes>
            <Route 
              path="/auth" 
              element={
                <AuthGuard>
                  <AuthPage />
                </AuthGuard>
              } 
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <HomePage />
                </PrivateRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;
