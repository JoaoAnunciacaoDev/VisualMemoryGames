import { useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <span className={styles.logo} onClick={() => navigate('/')}>
        GameLog
      </span>
      <nav className={styles.nav}>
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          Buscar Jogos
        </Button>
        <Button variant="ghost" onClick={() => navigate('/library')}>
          Biblioteca
        </Button>
        <Button variant="ghost" onClick={() => navigate('/tierlists')}>
          TierLists
        </Button>
        
        {token ? (
          <Button variant="ghost" onClick={handleLogout}>
            Sair
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Entrar
          </Button>
        )}

      </nav>
    </header>
  );
}