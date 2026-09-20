import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameMetadataFields from '@/components/GameEditModal/GameMetadataFields';
import GameRatingField from '@/components/GameEditModal/GameRatingField';

describe('GameMetadataFields', () => {
  it('adiciona uma plataforma personalizada pelo teclado', async () => {
    const onPlatformsChange = vi.fn();
    render(
      <GameMetadataFields
        platforms={['PC']}
        genres={[]}
        editable
        activeEditField="platforms"
        disabled={false}
        onToggleEditField={vi.fn()}
        onPlatformsChange={onPlatformsChange}
        onGenresChange={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Pesquisar ou adicionar plataforma' });
    await userEvent.type(input, 'Steam Deck{enter}');
    expect(onPlatformsChange).toHaveBeenCalledWith(['PC', 'Steam Deck']);
  });

  it('remove uma tag usando um botão com nome acessível', async () => {
    const onGenresChange = vi.fn();
    render(
      <GameMetadataFields
        platforms={[]}
        genres={['RPG']}
        editable
        activeEditField={null}
        disabled={false}
        onToggleEditField={vi.fn()}
        onPlatformsChange={vi.fn()}
        onGenresChange={onGenresChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remover RPG' }));
    expect(onGenresChange).toHaveBeenCalledWith([]);
  });
});

describe('GameRatingField', () => {
  it('informa quando o status atual não permite avaliação', () => {
    render(<GameRatingField rating={null} canReview={false} disabled={false} onChange={vi.fn()} />);
    expect(screen.getByText('Mude o status para avaliar')).toBeInTheDocument();
  });

  it('permite remover uma nota existente', async () => {
    const onChange = vi.fn();
    render(<GameRatingField rating={8.5} canReview disabled={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover nota' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
