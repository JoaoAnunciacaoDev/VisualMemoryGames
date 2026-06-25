import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthForm from '@/components/AuthForm/AuthForm';
import Toast from '@/components/Toast/Toast';

import { useToast } from '@/hooks/useToast';

import api from '@/services/api';


export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const parseError = (err: any): string => {
    const detail = err.response?.data?.detail;
    if (!detail) return 'Ocorreu um erro no servidor.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join(', ');
    return 'Ocorreu um erro no servidor.';
  };

  const handleLogin = async (username: string, password: string) => {
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const response = await api.post('/login', params);
      localStorage.setItem('token', response.data.access_token);
      navigate('/library');
    } catch (err: any) {
      setError(parseError(err));
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    setError('');
    try {
      await api.post('/users/', { username, email, password });
      showToast('Conta criada com sucesso! Faça o login agora.', 'success');
    } catch (err: any) {
      setError(parseError(err));
    }
  };

  return (
    <>
      <AuthForm
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={error}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
}