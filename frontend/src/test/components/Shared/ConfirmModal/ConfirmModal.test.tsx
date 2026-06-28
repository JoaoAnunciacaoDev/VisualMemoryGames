import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirmação',
    message: 'Tem certeza?',
    confirmText: 'Sim',
    cancelText: 'Não',
    isDestructive: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renderiza o título e a mensagem', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirmação')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
  });

  it('chama onConfirm ao clicar no botão de confirmar', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /sim/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('chama onCancel ao clicar no botão de cancelar', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /não/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('aplica botão destrutivo quando isDestructive é true', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={true} />);
    const confirmButton = screen.getByRole('button', { name: /sim/i });
    expect(confirmButton).toHaveClass('danger');
  });

  it('não renderiza quando isOpen é false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Confirmação')).not.toBeInTheDocument();
  });
});