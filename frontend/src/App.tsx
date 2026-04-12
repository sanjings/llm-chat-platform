import ChatShell from '@/views/chat/ChatShell';
import AuthPage from '@/views/auth';
import { clearToken } from '@/services/request';
import { type AuthUser } from '@/services/api/auth';
import { ConfigProvider, theme } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './styles/base.scss';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setCurrentUser(JSON.parse(userInfo));
    } else {
      setCurrentUser(null);
      if (location.pathname !== '/auth') navigate('/auth', { replace: true });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
    navigate('/auth', { replace: true });
  };

  const handleAuthSuccess = (userInfo: AuthUser) => {
    setCurrentUser(userInfo);
    navigate('/chat', { replace: true });
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorLink: darkMode ? '#69b1ff' : '#1677ff',
          colorPrimary: darkMode ? '#1668dc' : '#1677ff'
        }
      }}
    >
      <Routes>
        <Route
          path="/auth"
          element={
            currentUser ? (
              <Navigate to="/chat" replace />
            ) : (
              <AuthPage darkMode={darkMode} onChangeDarkMode={setDarkMode} onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/chat"
          element={
            currentUser ? (
              <ChatShell
                darkMode={darkMode}
                onChangeDarkMode={setDarkMode}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={currentUser ? '/chat' : '/auth'} replace />} />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
