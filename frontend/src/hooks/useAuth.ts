import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { clearToken, getToken } from '@/services/auth';


export function useAuth() {
  const navigate = useNavigate();
  const token = getToken();
  
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    api.get('/users/me')
      .then((res) => setUserId(res.data.id))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate, token]);

  const logout = () => {
    clearToken();
    navigate('/login');
  };

  return { userId, loading, logout };
}