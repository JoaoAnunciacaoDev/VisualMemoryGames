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

  return (
    <div className={`${styles.toast} ${styles[type]} ${styles[position]}`}>
      <span className={styles.message}>{message}</span>
      <button className={styles.closeButton} onClick={onClose}>
        X
      </button>
    </div>
  );
}