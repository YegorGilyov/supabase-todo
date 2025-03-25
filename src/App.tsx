import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Spin } from 'antd';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Configure future flags for React Router v7
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

// Configure Ant Design theme
const antTheme = {
  token: {
    colorPrimary: '#646cff',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  algorithm: theme.defaultAlgorithm,
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ConfigProvider theme={antTheme}>
        <AntApp>
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <Spin size="large" />
          </div>
        </AntApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <Router {...router}>
            <Routes>
              <Route
                path="/"
                element={user ? <HomePage /> : <Navigate to="/auth" replace />}
              />
              <Route
                path="/auth"
                element={!user ? <AuthPage /> : <Navigate to="/" replace />}
              />
            </Routes>
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
