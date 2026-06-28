import { useEffect } from 'react';
import styles from '@/components/Toast/Toast.module.css';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
  position?: 'bottom-right' | 'top-center';
}

export default function Toast({
  message,
  type = 'info',
  onClose,
  duration = 8000,
  position = 'bottom-right',
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const ariaLive = type === 'error' ? 'assertive' : 'polite';
  const role = type === 'error' ? 'alert' : 'status';

  return (
    <div
      className={`${styles.toast} ${styles[type]} ${styles[position]}`}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar notificação">
        X
      </button>
    </div>
  );
}