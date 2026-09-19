import { ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '@/services/api';
import { User } from '@/types';
import { AuthContext } from '@/hooks/useAuthContext';
import { authKeys, currentUserQuery } from '@/features/auth/queries';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useQuery(currentUserQuery());
  const user = userQuery.data ?? null;
  const loading = userQuery.isPending;

  const setUser = useCallback((newUser: User | null) => {
    queryClient.setQueryData(authKeys.currentUser(), newUser);
  }, [queryClient]);

  const reloadUser = useCallback(async () => {
    try {
      await userQuery.refetch();
    } catch {
      setUser(null);
    }
  }, [setUser, userQuery]);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Erro ao fazer logout no servidor:', err);
    } finally {
      setUser(null);
      navigate({ to: '/login' });
    }
  }, [navigate, setUser]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
