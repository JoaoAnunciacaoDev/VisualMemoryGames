import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthForm from '@/components/AuthForm/AuthForm';

function props() {
  return {
    onLogin: vi.fn().mockResolvedValue(undefined),
    onRegisterInitiate: vi.fn().mockResolvedValue(undefined),
    onRegisterConfirm: vi.fn().mockResolvedValue(undefined),
    onPasswordResetInitiate: vi.fn().mockResolvedValue(undefined),
    onPasswordResetConfirm: vi.fn().mockResolvedValue(undefined),
    error: '', clearError: vi.fn(),
  };
}

describe('AuthForm', () => {
  it('submits login credentials', async () => {
    const actions = props();
    render(<AuthForm {...actions} />);
    fireEvent.change(screen.getByPlaceholderText('Username ou E-mail'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
    await waitFor(() => expect(actions.onLogin).toHaveBeenCalledWith('alice', 'secret', false));
  });

  it('moves from registration data to email verification', async () => {
    const actions = props();
    render(<AuthForm {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Não tem conta? Registre-se' }));
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar Código' }).closest('form')!);
    expect(await screen.findByText('Verificação de E-mail')).toBeInTheDocument();
  });
});
