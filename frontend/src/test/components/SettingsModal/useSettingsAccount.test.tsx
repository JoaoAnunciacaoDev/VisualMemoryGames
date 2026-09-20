import type { SyntheticEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changeAccountPassword,
  deactivateAccount,
  updateAccountProfile,
} from '@/features/account/mutations';
import { useSettingsAccount } from '@/components/SettingsModal/useSettingsAccount';
import { TestQueryProvider } from '@/test/TestRouter';

const accountMocks = vi.hoisted(() => ({
  reloadUser: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/features/account/mutations', () => ({
  changeAccountPassword: vi.fn(),
  deactivateAccount: vi.fn(),
  updateAccountProfile: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'jogador', is_public: false },
    reloadUser: accountMocks.reloadUser,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: accountMocks.showToast }),
}));

const mockChangePassword = vi.mocked(changeAccountPassword);
const mockDeactivateAccount = vi.mocked(deactivateAccount);
const mockUpdateProfile = vi.mocked(updateAccountProfile);
const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as SyntheticEvent;

describe('useSettingsAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountMocks.reloadUser.mockResolvedValue(undefined);
  });

  it('bloqueia a alteração quando a confirmação da senha não coincide', async () => {
    const { result } = renderHook(() => useSettingsAccount(vi.fn(), vi.fn()), {
      wrapper: TestQueryProvider,
    });

    act(() => {
      result.current.password.setNewPassword('nova-senha');
      result.current.password.setConfirmPassword('outra-senha');
    });
    await act(() => result.current.password.submit(submitEvent()));

    expect(result.current.error).toBe('As senhas não coincidem.');
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('envia apenas os campos de perfil que foram alterados', async () => {
    const onClose = vi.fn();
    mockUpdateProfile.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSettingsAccount(onClose, vi.fn()), {
      wrapper: TestQueryProvider,
    });

    act(() => result.current.profile.setIsPublic(true));
    await act(() => result.current.profile.submit(submitEvent()));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        { username: undefined, isPublic: true },
        expect.anything(),
      );
    });
    expect(accountMocks.reloadUser).toHaveBeenCalledOnce();
    expect(accountMocks.showToast).toHaveBeenCalledWith(
      'Perfil atualizado com sucesso!',
      'success',
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('conclui a desativação e encerra a sessão', async () => {
    const onClose = vi.fn();
    const onLogout = vi.fn();
    mockDeactivateAccount.mockResolvedValue(
      {} as Awaited<ReturnType<typeof deactivateAccount>>,
    );
    const { result } = renderHook(() => useSettingsAccount(onClose, onLogout), {
      wrapper: TestQueryProvider,
    });

    act(() => result.current.deactivation.setPassword('senha-atual'));
    await act(() => result.current.deactivation.submit(submitEvent()));

    await waitFor(() => {
      expect(mockDeactivateAccount).toHaveBeenCalledWith('senha-atual', expect.anything());
    });
    expect(accountMocks.showToast).toHaveBeenCalledWith(
      'Conta desativada. Seus dados serão mantidos por 15 dias.',
      'info',
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
