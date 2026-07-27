import { useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { clearToken, getToken } from '@/services/auth';
import { User } from '@/types';
import { AuthContext } from '@/hooks/useAuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

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
    setLoading(true);
    try {
      const res = await api.get('/users/me');
      setUserState(res.data);
    } catch (err: unknown) {
      setUserState(null);
      const errorObj = err as { response?: { status?: number }; message?: string };
      if (errorObj.response?.status === 401 || errorObj.message === 'Unauthorized') {
        clearToken();
        navigateRef.current('/login');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    api.get('/users/me')
      .then((res) => {
        if (active) {
          setUserState(res.data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setUserState(null);
          const errorObj = err as { response?: { status?: number }; message?: string };
          if (errorObj.response?.status === 401 || errorObj.message === 'Unauthorized') {
            clearToken();
            navigateRef.current('/login');
          }
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
  }, [token]);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Erro ao fazer logout no servidor:', err);
    } finally {
      clearToken();
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
