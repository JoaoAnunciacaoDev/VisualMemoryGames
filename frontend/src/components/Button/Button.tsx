import { ReactNode } from 'react';
import styles from '@/Button.module.css';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  fullWidth = false,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.button} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''}`}
    >
      {children}
    </button>
  );
}