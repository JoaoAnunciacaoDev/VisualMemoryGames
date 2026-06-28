import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '@/providers/ToastProvider';

function ToastTester() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Mensagem de sucesso', 'success')}>
        Mostrar sucesso
      </button>
      <button onClick={() => showToast('Mensagem de erro', 'error')}>
        Mostrar erro
      </button>
      <button onClick={() => showToast('Mensagem de info', 'info')}>
        Mostrar info
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastTester />
    </ToastProvider>
  );
}

describe('useToast + ToastProvider', () => {
  it('deve mostrar um toast de sucesso e permitir fechá‑lo', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByRole('button', { name: /mostrar sucesso/i }));
    expect(screen.getByText('Mensagem de sucesso')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Fechar notificação'));
    expect(screen.queryByText('Mensagem de sucesso')).not.toBeInTheDocument();
  });

  it('deve mostrar um toast de info', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByRole('button', { name: /mostrar info/i }));
    expect(screen.getByText('Mensagem de info')).toBeInTheDocument();
  });

  it('deve mostrar apenas um toast de cada vez', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByRole('button', { name: /mostrar sucesso/i }));
    expect(screen.getByText('Mensagem de sucesso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /mostrar erro/i }));
    expect(screen.queryByText('Mensagem de sucesso')).not.toBeInTheDocument();
    expect(screen.getByText('Mensagem de erro')).toBeInTheDocument();
  });
});