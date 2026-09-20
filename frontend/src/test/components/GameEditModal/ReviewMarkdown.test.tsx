import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReviewMarkdown from '@/components/GameEditModal/ReviewMarkdown';

describe('ReviewMarkdown', () => {
  it('renderiza os elementos Markdown suportados como React', () => {
    const { container } = render(
      <ReviewMarkdown markdown={'## Review\n**Ótimo** e *divertido*\n\n- História\n- Trilha\n\n`10/10`'} />,
    );

    expect(screen.getByRole('heading', { name: 'Review', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Ótimo').tagName).toBe('STRONG');
    expect(screen.getByText('divertido').tagName).toBe('EM');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByText('10/10').tagName).toBe('CODE');
  });

  it('aceita apenas links HTTP e HTTPS', () => {
    render(<ReviewMarkdown markdown={'[Site](https://example.com) [Perigoso](javascript:alert)'} />);

    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('href', 'https://example.com/');
    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Perigoso').closest('a')).toBeNull();
  });

  it('trata HTML recebido como texto, sem criar elementos executáveis', () => {
    const { container } = render(<ReviewMarkdown markdown={'<img src=x onerror=alert(1)>\n<script>alert(1)</script>'} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});
