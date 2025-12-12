import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import VotingPage from './pages/VotingPage';
import ResultsPage from './pages/ResultsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setCurrentPath(window.location.pathname);
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const renderPage = () => {
    switch (currentPath) {
      case '/':
        return <HomePage />;
      case '/vote':
        return <VotingPage />;
      case '/results':
        return <ResultsPage />;
      case '/admin/login':
        return <AdminLoginPage />;
      case '/admin':
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AuthProvider>
      {renderPage()}
    </AuthProvider>
  );
}

export default App;
