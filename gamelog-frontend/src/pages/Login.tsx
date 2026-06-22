import { useState, SyntheticEvent} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e : SyntheticEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);

        const response = await api.post('/login', params);
        localStorage.setItem('token', response.data.access_token);
        
        navigate('/dashboard');
      } else {
        await api.post('/users/', {
          username,
          email,
          password
        });
        
        alert('Conta criada com sucesso! Faça o login agora.');
        setIsLogin(true);
      }
    } catch (err : any) {
      setError(err.response?.data?.detail || 'Ocorreu um erro no servidor.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>{isLogin ? 'Entrar no GameLog' : 'Criar nova conta'}</h2>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        <input 
          type="text" 
          placeholder={isLogin ? 'Username ou E-mail' : 'Username'} 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
        
        {!isLogin && (
          <input 
            type="email" 
            placeholder="E-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        )}
        
        <input 
          type="password" 
          placeholder="Senha" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>
          {isLogin ? 'Entrar' : 'Registrar'}
        </button>
      </form>

      <button 
        onClick={() => setIsLogin(!isLogin)} 
        style={{ marginTop: '15px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
      >
        {isLogin ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login'}
      </button>
    </div>
  );
}