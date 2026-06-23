import { useState, SyntheticEvent } from 'react';
import Button from '../Button/Button';
import Input from '../Input/Input';
import styles from './AuthForm.module.css';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
  error: string;
}

export default function AuthForm({ onLogin, onRegister, error }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (isLogin) await onLogin(username, password);
    else await onRegister(username, email, password);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {isLogin ? 'Entrar no GameLog' : 'Criar nova conta'}
      </h2>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          placeholder={isLogin ? 'Username ou E-mail' : 'Username'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {!isLogin && (
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}

        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" fullWidth>
          {isLogin ? 'Entrar' : 'Registrar'}
        </Button>
      </form>

      <Button variant="ghost" onClick={() => setIsLogin(!isLogin)} fullWidth>
        {isLogin ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login'}
      </Button>
    </div>
  );
}