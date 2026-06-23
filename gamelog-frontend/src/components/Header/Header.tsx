import { useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <span className={styles.logo} onClick={() => navigate('/')}>
        GameLog 🎮
      </span>
      <nav className={styles.nav}>
        <Button variant="ghost" onClick={() => navigate('/login')}>
          Entrar
        </Button>
      </nav>
    </header>
  );
}