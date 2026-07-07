import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '@/services/auth';
import { useAuthContext } from '@/providers/AuthProvider';

export function useAuth() {
  const { user, loading, logout, reloadUser, setUser } = useAuthContext();
  const navigate = useNavigate();
  const token = getToken();

  useEffect(() => {
    if (!loading && !token) {
      navigate('/login');
    }
  }, [loading, token, navigate]);

  return {
    userId: user?.id || '',
    user,
    loading,
    logout,
    reloadUser,
    setUser,
  };
}