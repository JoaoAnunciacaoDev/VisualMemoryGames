import { ReactNode, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { User } from '@/types';
import { AuthContext } from '@/hooks/useAuthContext';
import { authKeys, currentUserQuery } from '@/features/auth/queries';
import { libraryKeys } from '@/features/library/queries';
import { logoutUser } from '@/features/auth/mutations';
import { queryPersister } from '@/app/query-persistence';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useQuery(currentUserQuery());
  const user = userQuery.data ?? null;
  const loading = userQuery.isPending;

  useEffect(() => {
    if (!userQuery.isError) return;
    queryClient.removeQueries({ queryKey: libraryKeys.all });
    void queryPersister.removeClient();
  }, [queryClient, userQuery.isError]);

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
      await logoutUser();
    } catch (err) {
      console.error('Erro ao fazer logout no servidor:', err);
    } finally {
      queryClient.removeQueries({ queryKey: libraryKeys.all });
      await queryPersister.removeClient();
      setUser(null);
      navigate({ to: '/login' });
    }
  }, [navigate, queryClient, setUser]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}
