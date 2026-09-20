import type { DashboardGame, YearlyGames } from '@/features/profile/queries';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const STATUS_COLORS: Record<string, string> = {
  'Na biblioteca': '#64748b',
  'Quero Jogar': 'var(--primary)',
  Jogando: '#3b82f6',
  Zerado: '#10b981',
  Platinado: '#f59e0b',
  Abandonado: '#ef4444',
  'Em Espera': '#6b7280',
};

export const STORE_COLORS: Record<string, string> = {
  STEAM: '#66c0f4', EPIC: '#0078f2', GOG: '#a855f7', ITCH: '#fa5c5c',
  PS_STORE: '#0070d1', XBOX: '#107c10', NINTENDO: '#e60012', EA_APP: '#ff4747',
  UBISOFT: '#0070ff', AMAZON: '#ff9900', GOOGLE_PLAY: '#01875f', APP_STORE: '#38bdf8',
  PHYSICAL: '#f59e0b', OTHER: '#9ca3af', SEM_LOJA: 'var(--text-secondary)',
};

export function formatProfileDate(dateString: string | null) {
  if (!dateString) return 'Data desconhecida';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function filterYearlyGames(
  groups: YearlyGames[],
  selectedYear: number,
  selectedMonth: string,
): DashboardGame[] {
  const effectiveYear = groups.some((group) => group.year === selectedYear)
    ? selectedYear
    : groups[0]?.year;
  const yearGroup = groups.find((group) => group.year === effectiveYear);
  if (!yearGroup || selectedMonth === 'all') return yearGroup?.games ?? [];

  const month = Number(selectedMonth);
  return yearGroup.games.filter((game) => (
    game.finished_at ? new Date(game.finished_at).getMonth() === month : false
  ));
}
