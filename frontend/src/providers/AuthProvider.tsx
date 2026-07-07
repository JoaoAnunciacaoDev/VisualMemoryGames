import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { clearToken, getToken } from '@/services/auth';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const token = getToken();

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
  }, []);

  const reloadUser = useCallback(async () => {
    if (!getToken()) {
      setUserState(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/users/me');
      setUserState(res.data);
    } catch {
      setUserState(null);
      clearToken();
      navigateRef.current('/login');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadUser();
  }, [reloadUser, token]);

  const logout = useCallback(() => {
    clearToken();
    setUserState(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
