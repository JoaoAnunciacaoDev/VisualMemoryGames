import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({ variant = 'primary', fullWidth, children, className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-[var(--text)] shadow-[var(--shadow-button)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-button-hover)] active:translate-y-0',
    secondary: 'bg-[var(--secondary)] text-[var(--surface)] hover:opacity-85',
    danger: 'bg-[var(--danger)] text-[var(--surface)] hover:opacity-85',
    ghost: 'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[rgba(255,234,204,0.08)]',
    success: 'bg-[var(--success)] text-[var(--surface)] hover:opacity-85',
  } as const;

  return (
    <button
      className={`button ${variant} inline-flex cursor-pointer items-center justify-center gap-[var(--gap-md)] rounded-[var(--radius-sm)] border-0 px-6 py-2.5 text-[length:var(--font-size-sm)] font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${fullWidth ? 'fullWidth w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
