import { ChangeEvent } from 'react';
import styles from '@/components/Input/Input.module.css';

interface Props {
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
}: Props) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={styles.input}
    />
  );
}