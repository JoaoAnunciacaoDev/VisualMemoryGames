import { useNavigate } from 'react-router-dom';
import Button from '@/components/Button/Button';
import styles from '@/Home.module.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Bem-vindo ao GameLog 🎮</h1>
      <p className={styles.subtitle}>Organize e acompanhe sua biblioteca de jogos.</p>
      <Button onClick={() => navigate('/login')}>
        Entrar
      </Button>
    </div>
  );
}