import { useNavigate } from 'react-router-dom';
import { Button, PageTitle } from '@/components/Shared';
import styles from '@/pages/Home/Home.module.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <PageTitle level="h1">Bem-vindo ao VisualMemory</PageTitle>
      <p className={styles.subtitle}>Organize e acompanhe sua biblioteca de jogos.</p>
      <Button onClick={() => navigate('/login')}>
        Entrar
      </Button>
    </div>
  );
}