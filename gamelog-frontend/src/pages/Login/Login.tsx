import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AuthForm from '../../components/AuthForm/AuthForm';

export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (username: string, password: string) => {
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post('/login', params);
      localStorage.setItem('token', response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro no servidor.');
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    setError('');
    try {
      await api.post('/users/', { username, email, password });
      alert('Conta criada com sucesso! Faça o login agora.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro no servidor.');
    }
  };

  return (
    <AuthForm
      onLogin={handleLogin}
      onRegister={handleRegister}
      error={error}
    />
  );
}