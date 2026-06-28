import { useNavigate } from 'react-router-dom';
import Button from '@/components/Shared/Button/Button';
import styles from '@/components/Header/Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <button type="button" className={styles.logo} onClick={() => navigate('/')}>
        GameLog
      </button>
      <nav className={styles.nav}>
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