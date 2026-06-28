import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@/components/Shared/Modal/Modal';

describe('Modal', () => {
  it('não renderiza quando open é false', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo quando open é true', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no overlay', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>
    );
    const overlay = screen.getByRole('presentation');
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao clicar dentro do modal', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>
    );
    const content = screen.getByText('Conteúdo');
    await userEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha ao pressionar Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mostra botão de fechar quando showCloseButton é true', () => {
    render(
      <Modal open={true} onClose={() => {}} showCloseButton={true}>
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.getByLabelText('Fechar modal')).toBeInTheDocument();
  });

  it('não mostra botão de fechar quando showCloseButton é false', () => {
    render(
      <Modal open={true} onClose={() => {}} showCloseButton={false}>
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.queryByLabelText('Fechar modal')).not.toBeInTheDocument();
  });
});