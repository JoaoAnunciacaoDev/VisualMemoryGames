import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthForm from '@/components/AuthForm/AuthForm';

import { useToast } from '@/hooks/useToast';

import api from '@/services/api';
import { getToken, setToken } from '@/services/auth';


export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (getToken()) {
      navigate('/library', { replace: true });
    }
  }, [navigate]);

  interface BackendError {
    response?: {
      data?: {
        detail?: string | Array<{
          msg: string;
          loc?: Array<string | number>;
          type?: string;
        }>;
      };
    };
  }

  const parseError = (err: unknown): string => {
    const error = err as BackendError;
    const detail = error.response?.data?.detail;
    
    if (!detail) return 'Ocorreu um erro no servidor.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => {
        const msg = d.msg;
        const loc = d.loc || [];
        const isPassword = loc.includes('password');
        const isUsername = loc.includes('username');
        const isEmail = loc.includes('email');

        if (msg.includes('should have at least')) {
          const match = msg.match(/\d+/);
          const num = match ? match[0] : '';
          if (isPassword) {
            return `A senha deve ter pelo menos ${num} caracteres.`;
          }
          if (isUsername) {
            return `O nome de usuário deve ter pelo menos ${num} caracteres.`;
          }
          return `O campo deve ter pelo menos ${num} caracteres.`;
        }
        
        if (msg.includes('value is not a valid email')) {
          return 'E-mail inválido.';
        }

        if (msg.includes('Field required')) {
          if (isPassword) return 'A senha é obrigatória.';
          if (isUsername) return 'O nome de usuário é obrigatório.';
          if (isEmail) return 'O e-mail é obrigatório.';
          return 'Campo obrigatório.';
        }

        return msg.replace(/^Value error,\s*/i, '');
      }).join('\n');
    }
    return 'Ocorreu um erro no servidor.';
  };

  const handleLogin = async (username: string, password: string) => {
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const response = await api.post('/login', params);
      setToken(response.data.access_token);
      navigate('/library');
    } catch (err) {
      setError(parseError(err));
    }
  };

  const handleRegisterInitiate = async (username: string, email: string, password: string) => {
    setError('');
    try {
      await api.post('/users/register/initiate', { username, email, password });
      showToast('Código de verificação enviado! Verifique seu e-mail.', 'info');
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed);
      throw err;
    }
  };

  const handleRegisterConfirm = async (username: string, email: string, password: string, code: string) => {
    setError('');
    try {
      await api.post('/users/', { username, email, password, code });
      showToast('Conta criada com sucesso! Faça o login agora.', 'success');
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed);
      throw err;
    }
  };

  return (
    <>
      <AuthForm
        onLogin={handleLogin}
        onRegisterInitiate={handleRegisterInitiate}
        onRegisterConfirm={handleRegisterConfirm}
        error={error}
        clearError={() => setError('')}
      />
    </>
  );
}