import { useEffect } from 'react';
import styles from '@/Toast.module.css';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span>{message}</span>
      <button className={styles.closeButton} onClick={onClose}>X</button>
    </div>
  );
}