import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackModal from '@/components/FeedbackModal/FeedbackModal';
import api from '@/services/api';

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { message: 'Feedback enviado com sucesso' } }),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

vi.mock('@/components/Shared/ConfirmModal/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm }: ConfirmModalProps) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-modal">
        <button data-testid="confirm-btn" onClick={onConfirm}>Confirmar</button>
      </div>
    );
  },
}));

describe('FeedbackModal', () => {
  it('deve renderizar campos do modal', () => {
    const handleClose = vi.fn();
    render(<FeedbackModal onClose={handleClose} />);

    expect(screen.getByText('Enviar Feedback')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Sugestão/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descreva seu feedback/)).toBeInTheDocument();
  });

  it('deve chamar API e fechar modal ao enviar feedback com sucesso', async () => {
    const handleClose = vi.fn();
    render(<FeedbackModal onClose={handleClose} />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: Sugestão/), {
      target: { value: 'Melhoria de UI' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Descreva seu feedback/), {
      target: { value: 'Eu gostaria de sugerir que mudassem a fonte padrão do sistema.' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

    // Click confirm button in mocked confirm modal
    const confirmBtn = screen.getByTestId('confirm-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/feedback', {
        title: 'Melhoria de UI',
        description: 'Eu gostaria de sugerir que mudassem a fonte padrão do sistema.',
      });
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
