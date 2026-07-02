export interface GenreOption {
  id: string;
  label: string;
}

export const STANDARD_GENRES: GenreOption[] = [
  { id: 'Action', label: 'Ação' },
  { id: 'Adventure', label: 'Aventura' },
  { id: 'RPG', label: 'RPG' },
  { id: 'Shooter', label: 'Tiro' },
  { id: 'Strategy', label: 'Estratégia' },
  { id: 'Platformer', label: 'Plataforma' },
  { id: 'Indie', label: 'Indie' },
  { id: 'Simulation', label: 'Simulação' },
  { id: 'Sports', label: 'Esportes' },
  { id: 'Racing', label: 'Corrida' },
  { id: 'Fighting', label: 'Luta' },
  { id: 'Puzzle', label: 'Puzzle' },
  { id: 'Casual', label: 'Casual' },
  { id: 'Arcade', label: 'Arcade' },
  { id: 'Board Games', label: 'Tabuleiro' },
  { id: 'Card', label: 'Cartas' },
];

export function translateGenre(genreId: string): string {
  const found = STANDARD_GENRES.find((g) => g.id.toLowerCase() === genreId.toLowerCase());
  return found ? found.label : genreId;
}
