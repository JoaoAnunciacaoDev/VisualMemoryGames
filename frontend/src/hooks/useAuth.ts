import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/hooks/useAuthContext';

export function useAuth() {
  const { user, loading, logout, reloadUser, setUser } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  return {
    userId: user?.id || '',
    user,
    loading,
    logout,
    reloadUser,
    setUser,
  };
}