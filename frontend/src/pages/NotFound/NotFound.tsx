import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/Shared';
import styles from './NotFound.module.css';

export default function NotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate({ to: '/', replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Página Não Encontrada</h2>
        <p className={styles.message}>
          Ops! O caminho que você tentou acessar não existe ou foi movido.
        </p>
        <p className={styles.countdown}>
          Redirecionando para a página inicial em <strong>{countdown}</strong> segundos...
        </p>
        <Button variant="primary" onClick={() => navigate({ to: '/', replace: true })} className={styles.button}>
          Voltar para a Home
        </Button>
      </div>
    </div>
  );
}
