import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormLayout from '@/components/Shared/FormLayout/FormLayout';

describe('FormLayout', () => {
  it('renderiza os children', () => {
    render(
      <FormLayout>
        <input placeholder="Campo" />
      </FormLayout>
    );
    expect(screen.getByPlaceholderText('Campo')).toBeInTheDocument();
  });

  it('chama onSubmit quando o formulário é submetido', async () => {
    const onSubmit = vi.fn();
    render(
      <FormLayout onSubmit={onSubmit}>
        <button type="submit">Enviar</button>
      </FormLayout>
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('aplica className adicional', () => {
    render(
      <FormLayout className="extra">
        <span>Conteúdo</span>
      </FormLayout>
    );
    expect(screen.getByText('Conteúdo').closest('form')).toHaveClass('extra');
  });
});