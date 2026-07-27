import { useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { User } from '@/types';
import { AuthContext } from '@/hooks/useAuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
  }, []);

  const reloadUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/me');
      setUserState(res.data);
      return res.data;
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/users/me')
      .then((res) => {
        if (active) {
          setUserState(res.data);
        }
      })
      .catch(() => {
        if (active) {
          setUserState(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Erro ao fazer logout no servidor:', err);
    } finally {
      setUserState(null);
      navigate('/login');
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
