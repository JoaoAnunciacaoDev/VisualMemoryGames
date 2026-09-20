import { useAuthContext } from '@/hooks/useAuthContext';

export function useAuth() {
  const { user, loading, logout, reloadUser, setUser } = useAuthContext();
  return {
    userId: user?.id || '',
    user,
    loading,
    logout,
    reloadUser,
    setUser,
  };
}
