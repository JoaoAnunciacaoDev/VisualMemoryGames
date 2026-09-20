import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEpicIntegration } from '@/components/SettingsModal/useEpicIntegration';
import type { IntegrationRunner } from '@/components/SettingsModal/integrationTypes';

describe('useEpicIntegration', () => {
  const run = vi.fn<IntegrationRunner>();
  const setError = vi.fn();
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    run.mockResolvedValue({});
  });

  it('analisa o conteúdo colado e importa os títulos encontrados', async () => {
    run.mockResolvedValue({ imported_count: 2, skipped_count: 1 });
    const { result } = renderHook(() => useEpicIntegration({ run, setError, showToast }));

    act(() => result.current.setEpicContent('Control\nHades\nControl'));
    expect(result.current.parsedEpicTitles).toEqual(['Control', 'Hades']);

    await act(() => result.current.importEpic());

    expect(run).toHaveBeenCalledWith({
      provider: 'epic',
      type: 'import',
      titles: ['Control', 'Hades'],
    });
    expect(showToast).toHaveBeenLastCalledWith(
      'Importação concluída! 2 novos jogos adicionados (1 já existiam na biblioteca).',
      'success',
    );
    expect(result.current.epicPastedText).toBe('');
    expect(result.current.parsedEpicTitles).toEqual([]);
  });

  it('não inicia importação quando nenhum título válido foi informado', async () => {
    const { result } = renderHook(() => useEpicIntegration({ run, setError, showToast }));

    await act(() => result.current.importEpic());

    expect(run).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('remove todos os jogos importados da Epic', async () => {
    run.mockResolvedValue({ removed_count: 4 });
    const { result } = renderHook(() => useEpicIntegration({ run, setError, showToast }));

    await act(() => result.current.deleteEpicGames());

    expect(run).toHaveBeenCalledWith({ provider: 'epic', type: 'delete-games' });
    expect(showToast).toHaveBeenCalledWith(
      '4 jogos da Epic Games foram removidos da biblioteca.',
      'success',
    );
  });
});
