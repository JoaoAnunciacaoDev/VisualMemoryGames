import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTierListEditor } from '@/hooks/useTierListEditor';
import { loadTierListEditorData } from '@/services/tierlistEditor';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'tierlist-123' }),
  useLocation: () => ({ state: null }),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/media', () => ({
  getBestGameCover: vi.fn((game: any) => game.custom_cover_url || game.cover_url || undefined),
}));

vi.mock('@/services/tierlistEditor', () => ({
  loadTierListEditorData: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockTierListData = {
  title: 'Minha Tier List',
  tiers: [
    { id: 'cat-s', label: 'S', color: '#ff7f7f' },
    { id: 'cat-a', label: 'A', color: '#ffbf7f' },
  ],
  games: {
    'cat-s': [
      { id: 'game-zelda', title: 'Zelda', coverUrl: 'zelda.jpg', itemId: 'item-s1' },
      { id: 'game-hollow', title: 'Hollow Knight', coverUrl: undefined, itemId: 'item-s2' },
    ],
    'cat-a': [],
    'unassigned': [
      { id: 'game-unassigned', title: 'Jogo não classificado', coverUrl: undefined, itemId: 'item-p1' },
    ],
  },
  poolCategoryId: 'cat-pool',
};

describe('useTierListEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadTierListEditorData).mockResolvedValue(mockTierListData);
  });

  it('deve carregar a tier list com sucesso', async () => {
    const { result } = renderHook(() =>
      useTierListEditor('tierlist-123', mockTierListData, { onReload: vi.fn() })
    );
    await waitFor(() => {
      expect(result.current.tiers).toHaveLength(2);
    });
    expect(result.current.title).toBe('Minha Tier List');
    expect(result.current.tiers[0].label).toBe('S');
    expect(result.current.tiers[1].label).toBe('A');
    expect(result.current.poolCategoryId).toBe('cat-pool');
    expect(result.current.games['cat-s']).toHaveLength(2);
    expect(result.current.games['unassigned']).toHaveLength(1);
  });
});