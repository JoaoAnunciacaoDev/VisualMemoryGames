import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '@/components/Shared/Input/Input';

describe('Input', () => {
  it('renderiza com placeholder', () => {
    render(<Input placeholder="Digite algo" />);
    expect(screen.getByPlaceholderText('Digite algo')).toBeInTheDocument();
  });

  it('aceita valor e onChange', async () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'teste');
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it('fica desabilitado quando disabled é true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('aplica className adicional', () => {
    render(<Input className="extra" />);
    expect(screen.getByRole('textbox')).toHaveClass('extra');
  });
});