import { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';


export default function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={`${styles.input} ${className}`} {...props} />
  );
}