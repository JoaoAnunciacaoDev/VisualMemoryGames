import { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

export default function Input({ className = '', type, disabled, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);

  if (type === 'password') {
    return (
      <div className={styles.container}>
        <input
          type={showPassword ? 'text' : 'password'}
          className={`${styles.input} ${styles.passwordInput} ${className}`}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          tabIndex={-1}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    );
  }

  return (
    <input type={type} disabled={disabled} className={`${styles.input} ${className}`} {...props} />
  );
}
