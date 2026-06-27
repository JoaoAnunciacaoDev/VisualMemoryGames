import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { clearToken } from '@/services/auth';

export function useAuth() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    api.get('/users/me')
      .then((res) => setUserId(res.data.id))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => {
    clearToken();
    navigate('/login');
  };

  return { userId, loading, logout };
}