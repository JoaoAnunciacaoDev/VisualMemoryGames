import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/date';
import styles from './SettingsModal.module.css';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

type Tab = 'profile' | 'password' | 'deactivate' | 'integrations';

interface PydanticErrorDetail {
  msg?: string;
  loc?: Array<string | number>;
}

interface AxiosErrorDetail {
  response?: {
    data?: {
      detail?: string | PydanticErrorDetail[];
    };
  };
}

export default function SettingsModal({ onClose, onLogout }: Props) {
  const { showToast } = useToast();
  const { user, reloadUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // States para Desconexão da Steam
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDeleteGamesConfirm, setShowDeleteGamesConfirm] = useState(false);
  const [pendingDisconnectAccountId, setPendingDisconnectAccountId] = useState<string | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<'steam' | 'itch' | 'gog' | null>(null);
  
  // States para Alteração de Dados
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [prevUsername, setPrevUsername] = useState(user?.username || '');
  const [isPublic, setIsPublic] = useState(user?.is_public ?? false);
  const [prevIsPublic, setPrevIsPublic] = useState(user?.is_public ?? false);

  if (user?.username !== prevUsername || user?.is_public !== prevIsPublic) {
    setPrevUsername(user?.username || '');
    setNewUsername(user?.username || '');
    setPrevIsPublic(user?.is_public ?? false);
    setIsPublic(user?.is_public ?? false);
  }
  
  // States para Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States para Desativação
  const [deactivatePassword, setDeactivatePassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parseError = (err: unknown, fallback = 'Ocorreu um erro no servidor.'): string => {
    const errorObj = err as AxiosErrorDetail;
    const detail = errorObj.response?.data?.detail;
    
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: PydanticErrorDetail) => {
        const msg = d.msg || '';
        const loc = d.loc || [];
        const isPassword = loc.includes('password') || loc.includes('new_password') || loc.includes('current_password');
        const isUsername = loc.includes('username');
        const isEmail = loc.includes('email');

        if (msg.includes('should have at least')) {
          const match = msg.match(/\d+/);
          const num = match ? match[0] : '';
          if (isPassword) return `A senha deve ter pelo menos ${num} caracteres.`;
          if (isUsername) return `O nome de usuário deve ter pelo menos ${num} caracteres.`;
          return `O campo deve ter pelo menos ${num} caracteres.`;
        }

        if (msg.includes('should have at most')) {
          const match = msg.match(/\d+/);
          const num = match ? match[0] : '';
          if (isUsername) return `O nome de usuário deve ter no máximo ${num} caracteres.`;
          if (isPassword) return `A senha deve ter no máximo ${num} caracteres.`;
          return `O campo deve ter no máximo ${num} caracteres.`;
        }
        
        if (msg.includes('value is not a valid email')) {
          return 'E-mail inválido.';
        }

        if (msg.includes('Field required')) {
          if (isPassword) return 'A senha é obrigatória.';
          if (isUsername) return 'O nome de usuário é obrigatório.';
          if (isEmail) return 'O e-mail é obrigatório.';
          return 'Campo obrigatório.';
        }

        return msg.replace(/^Value error,\s*/i, '');
      }).join('\n');
    }
    return fallback;
  };

  // States para Steam
  interface SteamAccount {
    id: string;
    steam_id: string;
    persona_name: string | null;
    avatar_url: string | null;
    last_sync_at: string | null;
  }
  const [steamAccounts, setSteamAccounts] = useState<SteamAccount[]>([]);
  const [steamUrl, setSteamUrl] = useState('');
  const [isFetchingSteam, setIsFetchingSteam] = useState(false);

  // States para GOG
  interface GogAccount {
    id: string;
    username: string;
    persona_name: string | null;
    avatar_url: string | null;
    last_sync_at: string | null;
  }
  const [gogAccounts, setGogAccounts] = useState<GogAccount[]>([]);
  const [gogUrl, setGogUrl] = useState('');
  const [isFetchingGog, setIsFetchingGog] = useState(false);

  // States para Itch.io
  interface ItchAccount {
    id: string;
    itch_id: string;
    username: string;
    avatar_url: string | null;
    last_sync_at: string | null;
  }
  const [itchAccounts, setItchAccounts] = useState<ItchAccount[]>([]);
  const [isFetchingItch, setIsFetchingItch] = useState(false);

  // States para Epic Games Store
  const [epicGamesCount, setEpicGamesCount] = useState<number | null>(null);
  const [isEpicInstructionsOpen, setIsEpicInstructionsOpen] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [epicPastedText, setEpicPastedText] = useState('');
  const [parsedEpicTitles, setParsedEpicTitles] = useState<string[]>([]);
  const [isImportingEpic, setIsImportingEpic] = useState(false);
  const [isFetchingEpic, setIsFetchingEpic] = useState(false);
  const [isEpicDragging, setIsEpicDragging] = useState(false);
  const [showEpicDeleteConfirm, setShowEpicDeleteConfirm] = useState(false);

  const fetchSteamAccounts = useCallback(async () => {
    try {
      const res = await api.get('/users/me/steam/accounts');
      setSteamAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas Steam:', err);
    }
  }, []);

  const fetchGogAccounts = useCallback(async () => {
    try {
      const res = await api.get('/users/me/gog/accounts');
      setGogAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas GOG:', err);
    }
  }, []);

  const fetchItchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/users/me/itch/accounts');
      setItchAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas Itch.io:', err);
    }
  }, []);

  const fetchEpicGamesCount = useCallback(async () => {
    try {
      const res = await api.get('/user-games/me');
      const count = (res.data as Array<{ store?: string }>).filter((g) => g.store === 'EPIC').length;
      setEpicGamesCount(count);
    } catch (err) {
      console.error('Erro ao buscar jogos da Epic:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'integrations') return;

    let active = true;
    api.get('/users/me/steam/accounts')
      .then((res) => {
        if (active) setSteamAccounts(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar contas Steam:', err);
      });

    api.get('/users/me/gog/accounts')
      .then((res) => {
        if (active) setGogAccounts(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar contas GOG:', err);
      });
      
    api.get('/users/me/itch/accounts')
      .then((res) => {
        if (active) setItchAccounts(res.data);
      })
      .catch((err) => {
        console.error('Erro ao buscar contas Itch.io:', err);
      });

    api.get('/user-games/me')
      .then((res) => {
        if (active) {
          const count = (res.data as Array<{ store?: string }>).filter((g) => g.store === 'EPIC').length;
          setEpicGamesCount(count);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar jogos da Epic:', err);
      });

    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleConnectSteam = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!steamUrl.trim()) return;
    setIsFetchingSteam(true);
    setError('');
    showToast('Conectando à Steam e importando biblioteca...', 'info');
    try {
      await api.post('/users/me/steam/accounts', { profile_url: steamUrl.trim() });
      showToast('Conta Steam conectada e biblioteca importada com sucesso!', 'success');
      setSteamUrl('');
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(
        err,
        'Erro ao conectar conta Steam. Verifique se o perfil e os detalhes de jogo estão públicos.'
      );
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFetchingSteam(false);
    }
  };

  const handleDisconnectSteam = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('steam');
    setShowDisconnectConfirm(true);
  };

  const executeDisconnectSteam = async (deleteGames: boolean) => {
    if (!pendingDisconnectAccountId) return;
    setError('');
    try {
      await api.delete(
        `/users/me/steam/accounts/${pendingDisconnectAccountId}?delete_games=${deleteGames}`
      );
      showToast('Conta Steam desconectada com sucesso.', 'success');
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao desconectar conta Steam.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncSteam = async () => {
    setIsFetchingSteam(true);
    setError('');
    showToast('Sincronizando jogos da Steam...', 'info');
    try {
      const res = await api.post('/users/me/steam/sync');
      const { new_games_count } = res.data;
      showToast(
        `Sincronização concluída! ${new_games_count} novos jogos adicionados. Detalhes e gêneros estão sendo preenchidos em segundo plano.`,
        'success'
      );
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar contas Steam.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFetchingSteam(false);
    }
  };

  const handleSyncSingleSteam = async (accountId: string) => {
    setIsFetchingSteam(true);
    setError('');
    showToast('Sincronizando conta Steam...', 'info');
    try {
      const res = await api.post(`/users/me/steam/accounts/${accountId}/sync`);
      const { new_games_count } = res.data;
      showToast(
        `Sincronização concluída! ${new_games_count} novos jogos adicionados. Detalhes e gêneros estão sendo preenchidos em segundo plano.`,
        'success'
      );
      void fetchSteamAccounts();
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar conta Steam.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFetchingSteam(false);
    }
  };

  const handleConnectGog = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!gogUrl.trim()) return;
    setIsFetchingGog(true);
    setError('');
    showToast('Conectando à GOG e importando biblioteca...', 'info');
    try {
      await api.post('/users/me/gog/accounts', { profile_url: gogUrl.trim() });
      showToast('Conta GOG conectada e biblioteca importada com sucesso!', 'success');
      setGogUrl('');
      void fetchGogAccounts();
      window.dispatchEvent(new Event('gog-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(
        err,
        'Erro ao conectar conta GOG. Verifique se o perfil e os jogos estão configurados como públicos no GOG.'
      );
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFetchingGog(false);
    }
  };

  const handleDisconnectGog = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('gog');
    setShowDisconnectConfirm(true);
  };

  const executeDisconnectGog = async (deleteGames: boolean) => {
    if (!pendingDisconnectAccountId) return;
    setError('');
    try {
      await api.delete(
        `/users/me/gog/accounts/${pendingDisconnectAccountId}?delete_games=${deleteGames}`
      );
      showToast('Conta GOG desconectada com sucesso.', 'success');
      void fetchGogAccounts();
      window.dispatchEvent(new Event('gog-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao desconectar conta GOG.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncGog = async () => {
    setIsFetchingGog(true);
    setError('');
    showToast('Sincronizando biblioteca GOG...', 'info');
    try {
      const res = await api.post('/users/me/gog/sync');
      const { new_games_count, updated_games_count } = res.data;
      showToast(
        `Sincronização GOG concluída! ${new_games_count} novos jogos adicionados, ${updated_games_count} atualizados.`,
        'success'
      );
      void fetchGogAccounts();
      window.dispatchEvent(new Event('gog-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar contas GOG.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFetchingGog(false);
    }
  };

  const handleSyncSingleGog = async (accountId: string) => {
    setIsFetchingGog(true);
    setError('');
    showToast('Sincronizando conta GOG...', 'info');
    try {
      const res = await api.post(`/users/me/gog/accounts/${accountId}/sync`);
      const { new_games_count, updated_games_count } = res.data;
      showToast(
        `Sincronização GOG concluída! ${new_games_count} novos jogos adicionados, ${updated_games_count} atualizados.`,
        'success'
      );
      void fetchGogAccounts();
      window.dispatchEvent(new Event('gog-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      const msg = parseError(err, 'Erro ao sincronizar conta GOG.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFetchingGog(false);
    }
  };

  const handleConnectItch = () => {
    const clientId = import.meta.env.VITE_ITCH_CLIENT_ID;
    if (!clientId) {
      setError('A integração com Itch.io não está configurada neste ambiente.');
      return;
    }
    const redirectUri = `${window.location.origin}/settings/integrations/itch/callback`;
    const authUrl = `https://itch.io/user/oauth?client_id=${clientId}&scope=profile:me%20profile:owned%20profile:games&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  };

  const handleDisconnectItch = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setDisconnectProvider('itch');
    setShowDisconnectConfirm(true);
  };

  const executeDisconnectItch = async (deleteGames: boolean) => {
    if (!pendingDisconnectAccountId) return;
    setError('');
    try {
      await api.delete(
        `/users/me/itch/accounts/${pendingDisconnectAccountId}?delete_games=${deleteGames}`
      );
      showToast('Conta Itch.io desconectada com sucesso.', 'success');
      void fetchItchAccounts();
      window.dispatchEvent(new Event('itch-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao desconectar conta Itch.io.'));
    } finally {
      setPendingDisconnectAccountId(null);
    }
  };

  const handleSyncItch = async (accountId: string) => {
    setIsFetchingItch(true);
    setError('');
    try {
      const res = await api.post(`/users/me/itch/accounts/${accountId}/sync`);
      const { new_games_count } = res.data;
      showToast(`Sincronização concluída! ${new_games_count} novos jogos adicionados.`, 'success');
      void fetchItchAccounts();
      window.dispatchEvent(new Event('itch-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar conta Itch.io.'));
    } finally {
      setIsFetchingItch(false);
    }
  };

  const handleSyncAllItch = async () => {
    setIsFetchingItch(true);
    setError('');
    try {
      const res = await api.post('/users/me/itch/sync');
      const { new_games_count } = res.data;
      showToast(`Sincronização concluída! ${new_games_count} novos jogos adicionados.`, 'success');
      void fetchItchAccounts();
      window.dispatchEvent(new Event('itch-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao sincronizar contas Itch.io.'));
    } finally {
      setIsFetchingItch(false);
    }
  };

  const EPIC_EXPORT_SCRIPT = `(async () => {
    const BASE = "https://accounts.epicgames.com/account/v2/payment/ajaxGetOrderHistory?count=100&sortDir=DESC&sortBy=DATE&locale=en-US";
    let allGames = [];
    let nextPageToken = "";
    let page = 1;
    console.log("🎮 Iniciando exportação da biblioteca da Epic...");
    while (true) {
        const url = nextPageToken ? \`\${BASE}&nextPageToken=\${encodeURIComponent(nextPageToken)}\` : BASE;
        console.log(\`📦 Buscando página \${page}...\`);
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
        });
        if (!response.ok) throw new Error(\`Erro HTTP \${response.status}: \${response.statusText}\`);
        const data = await response.json();
        if (!data.orders) break;
        for (const order of data.orders) {
            if (!order.items) continue;
            for (const item of order.items) {
                if (item.description) allGames.push(item.description);
            }
        }
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
        page++;
    }
    const uniqueGames = [...new Set(allGames)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const txt = uniqueGames.join("\\n");
    const txtBlob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const txtLink = document.createElement("a");
    txtLink.href = URL.createObjectURL(txtBlob);
    txtLink.download = "EpicGamesLibrary.txt";
    txtLink.click();
    console.log(\`✅ Exportação concluída! \${uniqueGames.length} jogos baixados.\`);
})();`;

  const parseEpicContent = (rawText: string): string[] => {
    const lines = rawText.split(/\r?\n/);
    const titles: string[] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.toLowerCase() === 'game' || line.toLowerCase() === '"game"') continue;
      if (line.startsWith('"') && line.endsWith('"') && line.length > 1) {
        line = line.slice(1, -1).replace(/""/g, '"').trim();
      }
      if (line) {
        titles.push(line);
      }
    }
    return [...new Set(titles)];
  };

  const handleCopyEpicScript = async () => {
    try {
      await navigator.clipboard.writeText(EPIC_EXPORT_SCRIPT);
      setIsCopiedScript(true);
      showToast('Script copiado para a área de transferência!', 'success');
      setTimeout(() => setIsCopiedScript(false), 3000);
    } catch {
      showToast('Erro ao copiar script.', 'error');
    }
  };

  const handleEpicFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const titles = parseEpicContent(text);
        setParsedEpicTitles(titles);
        setEpicPastedText(titles.join('\n'));
        if (titles.length === 0) {
          showToast('Nenhum jogo identificado no arquivo.', 'error');
        } else {
          showToast(`${titles.length} jogos identificados do arquivo!`, 'info');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleEpicTextareaChange = (text: string) => {
    setEpicPastedText(text);
    const titles = parseEpicContent(text);
    setParsedEpicTitles(titles);
  };

  const handleImportEpic = async () => {
    if (parsedEpicTitles.length === 0) return;
    setIsImportingEpic(true);
    setError('');
    showToast(`Importando ${parsedEpicTitles.length} jogos da Epic Games...`, 'info');
    try {
      const res = await api.post('/users/me/epic/import', { titles: parsedEpicTitles });
      const { imported_count, skipped_count } = res.data;
      showToast(
        `Importação concluída! ${imported_count} novos jogos adicionados${skipped_count > 0 ? ` (${skipped_count} já existiam na biblioteca)` : ''}.`,
        'success'
      );
      setEpicPastedText('');
      setParsedEpicTitles([]);
      void fetchEpicGamesCount();
      window.dispatchEvent(new Event('epic-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao importar jogos da Epic Games.'));
    } finally {
      setIsImportingEpic(false);
    }
  };

  const handleEnrichEpic = async () => {
    setIsFetchingEpic(true);
    setError('');
    showToast('Atualizando metadados dos jogos da Epic Games...', 'info');
    try {
      const res = await api.post('/users/me/epic/enrich');
      const { games_to_enrich_count } = res.data;
      showToast(
        `Atualização iniciada! ${games_to_enrich_count} jogos estão tendo capas e gêneros buscados em segundo plano.`,
        'success'
      );
      window.dispatchEvent(new Event('epic-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao atualizar metadados dos jogos da Epic Games.'));
    } finally {
      setIsFetchingEpic(false);
    }
  };

  const handleDeleteEpicGames = async () => {
    setIsFetchingEpic(true);
    setError('');
    try {
      const res = await api.delete('/users/me/epic/games');
      const { removed_count } = res.data;
      showToast(`${removed_count} jogos da Epic Games foram removidos da biblioteca.`, 'success');
      void fetchEpicGamesCount();
      window.dispatchEvent(new Event('epic-synced'));
      window.dispatchEvent(new Event('steam-synced'));
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao remover jogos da Epic Games.'));
    } finally {
      setIsFetchingEpic(false);
    }
  };

  const handleUpdateProfile = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setIsSubmitting(true);
    setError('');

    try {
      if (newUsername.trim() !== user?.username) {
        await api.put('/users/me', { username: newUsername.trim() });
      }
      if (isPublic !== user?.is_public) {
        await api.patch('/users/me/visibility', { is_public: isPublic });
      }
      showToast('Perfil atualizado com sucesso!', 'success');
      await reloadUser();
      window.dispatchEvent(new Event('user-updated'));
      onClose();
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao atualizar perfil.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao alterar senha.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!deactivatePassword) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/users/me/deactivate', {
        password: deactivatePassword,
      });
      showToast('Conta desativada. Seus dados serão mantidos por 15 dias.', 'info');
      setDeactivatePassword('');
      onClose();
      onLogout(); // Desloga o usuário
    } catch (err: unknown) {
      setError(parseError(err, 'Erro ao desativar conta.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal open onClose={() => !isSubmitting && onClose()} maxWidth="500px" showCloseButton={!isSubmitting} className="scrollbar-visualmemory">
        <div className={styles.settingsContainer}>
        <div className={styles.modalHeader}>
          <h3>Configurações de Conta</h3>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('profile'); setError(''); }}
            disabled={isSubmitting}
          >
            Nome de Usuário
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'password' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('password'); setError(''); }}
            disabled={isSubmitting}
          >
            Alterar Senha
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'deactivate' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('deactivate'); setError(''); }}
            disabled={isSubmitting}
          >
            Excluir Conta
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'integrations' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('integrations'); setError(''); }}
            disabled={isSubmitting}
          >
            Integrações
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <p className={styles.error}>{error}</p>}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className={styles.form}>
              <p className={styles.helpText}>Escolha um novo nome de usuário único para sua conta.</p>
              <label className={styles.label}>
                Novo Nome de Usuário
                <Input
                  placeholder="Ex: novo_usuario"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                  maxLength={30}
                />
              </label>

              <div className={styles.visibilityToggle}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Tornar meu perfil público</span>
                </label>
                <p className={styles.helpTextSmall}>
                  Perfis públicos podem ser encontrados na aba Social e seus seguidores verão suas atividades.
                </p>
              </div>

              <Button type="submit" disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className={styles.form}>
              <p className={styles.helpText}>Para sua segurança, informe sua senha atual para definir a nova senha forte.</p>
              <label className={styles.label}>
                Senha Atual
                <Input
                  type="password"
                  placeholder="Sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <label className={styles.label}>
                Nova Senha
                <Input
                  type="password"
                  placeholder="Nova senha forte"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <label className={styles.label}>
                Confirmar Nova Senha
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <Button type="submit" disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          )}

          {activeTab === 'deactivate' && (
            <form onSubmit={handleDeactivate} className={styles.form}>
              <div className={styles.alertBox}>
                <strong>Atenção:</strong>
                <p>
                  Ao solicitar a exclusão, sua conta e biblioteca ficarão indisponíveis e ocultas. 
                  Você terá um período de carência de <strong>15 dias</strong> para reativar sua conta simplesmente fazendo login novamente. 
                  Após os 15 dias, a conta e todos os dados associados serão apagados permanentemente.
                </p>
              </div>
              <label className={styles.label}>
                Para confirmar, insira sua senha:
                <Input
                  type="password"
                  placeholder="Sua senha"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </label>
              <Button type="submit" variant="ghost" className={styles.dangerButton} disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Processando...' : 'Solicitar Exclusão de Conta'}
              </Button>
            </form>
          )}

          {activeTab === 'integrations' && (
            <div className={styles.integrationsTabContent}>
              <div className={styles.integrationSection}>
                <h3>Steam</h3>
                <p className={styles.helpText}>
                  Conecte uma ou mais contas Steam para importar e sincronizar seus jogos automaticamente. 
                  <strong> Nota:</strong> O perfil e os "Detalhes do Jogo" devem estar definidos como <strong>Públicos</strong> nas configurações da Steam.
                </p>

                <form onSubmit={handleConnectSteam} className={styles.integrationForm}>
                  <div className={styles.inputRow}>
                    <Input
                      placeholder="URL do perfil Steam ou ID (ex: 7656119...)"
                      value={steamUrl}
                      onChange={(e) => setSteamUrl(e.target.value)}
                      disabled={isFetchingSteam}
                      required
                    />
                    <Button type="submit" disabled={isFetchingSteam || !steamUrl.trim()}>
                      {isFetchingSteam ? 'Conectando...' : 'Conectar'}
                    </Button>
                  </div>
                </form>

                {steamAccounts.length > 0 ? (
                  <div className={styles.accountsList}>
                    <div className={styles.listHeader}>
                      <h4>Contas Conectadas ({steamAccounts.length})</h4>
                      <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingSteam} onClick={handleSyncSteam}>
                        🔄 Sincronizar Tudo
                      </Button>
                    </div>
                    
                    {steamAccounts.map((acc) => (
                      <div key={acc.id} className={acc.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
                        <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.persona_name || ''} className={acc.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
                        <div className={styles.accountInfo}>
                          <strong>{acc.persona_name || 'Usuário Steam'}</strong>
                          <span>ID: {acc.steam_id}</span>
                          {acc.last_sync_at && (
                            <small>Sincronizado em: {formatDateTime(acc.last_sync_at)}</small>
                          )}
                        </div>
                        <div className={styles.accountActions}>
                          <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingSteam} onClick={() => handleSyncSingleSteam(acc.id)}>
                            🔄
                          </Button>
                          <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectSteam(acc.id)}>
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noAccounts}>Nenhuma conta Steam vinculada ainda.</div>
                )}
              </div>

              <hr className={styles.integrationDivider} />

              <div className={styles.integrationSection}>
                <h3>GOG (Good Old Games)</h3>
                <p className={styles.helpText}>
                  Conecte sua conta GOG para importar sua biblioteca, tempo jogado e conquistas.
                  <strong> Nota:</strong> O perfil e os jogos devem estar configurados como <strong>Públicos</strong> nas opções de privacidade do GOG.
                </p>

                <form onSubmit={handleConnectGog} className={styles.integrationForm}>
                  <div className={styles.inputRow}>
                    <Input
                      placeholder="URL do perfil GOG ou nome de usuário (ex: usuario)"
                      value={gogUrl}
                      onChange={(e) => setGogUrl(e.target.value)}
                      disabled={isFetchingGog}
                      required
                    />
                    <Button type="submit" disabled={isFetchingGog || !gogUrl.trim()}>
                      {isFetchingGog ? 'Conectando...' : 'Conectar'}
                    </Button>
                  </div>
                </form>

                {gogAccounts.length > 0 ? (
                  <div className={styles.accountsList}>
                    <div className={styles.listHeader}>
                      <h4>Contas Conectadas ({gogAccounts.length})</h4>
                      <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingGog} onClick={handleSyncGog}>
                        🔄 Sincronizar Tudo
                      </Button>
                    </div>
                    
                    {gogAccounts.map((acc) => (
                      <div key={acc.id} className={acc.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
                        <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.persona_name || acc.username} className={acc.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
                        <div className={styles.accountInfo}>
                          <strong>{acc.persona_name || acc.username}</strong>
                          <span>@{acc.username}</span>
                          {acc.last_sync_at && (
                            <small>Sincronizado em: {formatDateTime(acc.last_sync_at)}</small>
                          )}
                        </div>
                        <div className={styles.accountActions}>
                          <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingGog} onClick={() => handleSyncSingleGog(acc.id)}>
                            🔄
                          </Button>
                          <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectGog(acc.id)}>
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noAccounts}>Nenhuma conta GOG vinculada ainda.</div>
                )}
              </div>

              <hr className={styles.integrationDivider} />

              <div className={styles.integrationSection}>
                <h3>Itch.io</h3>
                <p className={styles.helpText}>
                  Conecte sua conta Itch.io para sincronizar sua biblioteca. O redirecionamento utilizará o fluxo seguro do OAuth da itch.io.
                </p>

                <div className={styles.integrationAction}>
                  <Button onClick={handleConnectItch} disabled={isFetchingItch}>
                    Conectar Itch.io via OAuth
                  </Button>
                </div>

                {itchAccounts.length > 0 ? (
                  <div className={styles.accountsList}>
                    <div className={styles.listHeader}>
                      <h4>Contas Conectadas ({itchAccounts.length})</h4>
                      <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingItch} onClick={handleSyncAllItch}>
                        🔄 Sincronizar Tudo
                      </Button>
                    </div>
                    
                    {itchAccounts.map((acc) => (
                      <div key={acc.id} className={acc.avatar_url ? styles.accountCard : `${styles.accountCard} ${styles.accountCardNoAvatar}`}>
                        <img src={acc.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'} alt={acc.username || ''} className={acc.avatar_url ? styles.accountAvatar : styles.accountAvatarPlaceholder} />
                        <div className={styles.accountInfo}>
                          <strong>{acc.username || 'Usuário Itch'}</strong>
                          <span>ID: {acc.itch_id}</span>
                          {acc.last_sync_at && (
                            <small>Sincronizado em: {formatDateTime(acc.last_sync_at)}</small>
                          )}
                        </div>
                        <div className={styles.accountActions}>
                          <Button variant="ghost" className={styles.syncAllButton} disabled={isFetchingItch} onClick={() => handleSyncItch(acc.id)}>
                            🔄
                          </Button>
                          <Button variant="ghost" className={styles.disconnectButton} onClick={() => handleDisconnectItch(acc.id)}>
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noAccounts}>Nenhuma conta Itch.io vinculada ainda.</div>
                )}
              </div>

              <hr className={styles.integrationDivider} />

              <div className={styles.integrationSection}>
                <div className={styles.epicHeader}>
                  <h3>Epic Games Store</h3>
                  {epicGamesCount !== null && (
                    <span className={styles.epicBadge}>
                      {epicGamesCount} {epicGamesCount === 1 ? 'jogo na biblioteca' : 'jogos na biblioteca'}
                    </span>
                  )}
                </div>
                <p className={styles.helpText}>
                  Importe sua biblioteca da Epic Games Store a partir de um arquivo TXT/CSV ou colando a lista de títulos.
                </p>

                {epicGamesCount !== null && epicGamesCount > 0 && (
                  <div className={styles.epicManagementActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.syncAllButton}
                      disabled={isFetchingEpic}
                      onClick={handleEnrichEpic}
                    >
                      🔄 Atualizar Metadados (Capas e Gêneros)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.disconnectButton}
                      disabled={isFetchingEpic}
                      onClick={() => setShowEpicDeleteConfirm(true)}
                    >
                      🗑️ Remover Jogos da Epic
                    </Button>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.epicInstructionsToggle}
                  onClick={() => setIsEpicInstructionsOpen((prev) => !prev)}
                >
                  {isEpicInstructionsOpen ? '▼ Ocultar instruções de exportação' : '▶ Como exportar minha biblioteca da Epic?'}
                </button>

                {isEpicInstructionsOpen && (
                  <div className={styles.epicInstructionsBox}>
                    <ol className={styles.epicStepList}>
                      <li>
                        Acesse sua{' '}
                        <a
                          href="https://accounts.epicgames.com/account/transactions/purchases?productName=egs"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Página de Transações da Epic Games ↗
                        </a>{' '}
                        no navegador.
                      </li>
                      <li>Abra as Ferramentas do Desenvolvedor pressionando <strong>F12</strong> e clique na aba <strong>Console</strong>.</li>
                      <li>Clique no botão abaixo para copiar o script de exportação:</li>
                    </ol>

                    <div className={styles.epicScriptAction}>
                      <Button
                        type="button"
                        variant="secondary"
                        className={styles.copyScriptBtn}
                        onClick={handleCopyEpicScript}
                      >
                        {isCopiedScript ? '✅ Script Copiado!' : '📋 Copiar Script de Exportação'}
                      </Button>
                    </div>

                    <ol className={styles.epicStepList} start={4} style={{ marginTop: 'var(--gap-sm)' }}>
                      <li>Cole o script no console e pressione <strong>Enter</strong>.</li>
                      <li>O download do arquivo <code>EpicGamesLibrary.txt</code> começará automaticamente.</li>
                      <li>Arraste o arquivo baixado para a área de importação abaixo ou cole seu conteúdo!</li>
                    </ol>
                  </div>
                )}

                {/* Área de Drag & Drop */}
                <div
                  className={`${styles.dropZone} ${isEpicDragging ? styles.dropZoneActive : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsEpicDragging(true);
                  }}
                  onDragLeave={() => setIsEpicDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsEpicDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleEpicFileUpload(file);
                  }}
                  onClick={() => {
                    const input = document.getElementById('epic-file-input') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <input
                    id="epic-file-input"
                    type="file"
                    accept=".txt,.csv"
                    className={styles.fileInputHidden}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEpicFileUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <span className={styles.dropZoneIcon}>📂</span>
                  <p className={styles.dropZoneText}>
                    <strong>Clique para selecionar</strong> ou arraste seu <code>EpicGamesLibrary.txt</code> / <code>.csv</code>
                  </p>
                  <p className={styles.dropZoneSubtext}>Suporta arquivos .txt e .csv gerados pelo script</p>
                </div>

                <div className={styles.epicTextareaDivider}>OU COLE A LISTA DE JOGOS</div>

                <textarea
                  className={styles.epicTextarea}
                  placeholder="Cole os nomes dos jogos aqui (um por linha)...&#10;Exemplo:&#10;Control&#10;Death Stranding&#10;GTA V"
                  value={epicPastedText}
                  onChange={(e) => handleEpicTextareaChange(e.target.value)}
                  disabled={isImportingEpic}
                />

                {parsedEpicTitles.length > 0 && (
                  <div className={styles.epicPreviewContainer}>
                    <div className={styles.epicPreviewInfo}>
                      <p className={styles.epicPreviewTitle}>
                        🎮 {parsedEpicTitles.length} {parsedEpicTitles.length === 1 ? 'jogo pronto para importação' : 'jogos prontos para importação'}
                      </p>
                      <p className={styles.epicPreviewSubtitle}>
                        Serão adicionados à sua biblioteca com o status &quot;Na biblioteca&quot; e loja Epic Games.
                      </p>
                    </div>
                    <div className={styles.epicPreviewActions}>
                      <Button
                        type="button"
                        onClick={handleImportEpic}
                        disabled={isImportingEpic}
                      >
                        {isImportingEpic ? 'Importando...' : 'Importar Jogos'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>

    {/* Primeiro modal de confirmação: Desconectar conta */}
    {showDisconnectConfirm && (
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title={`Desconectar Conta ${disconnectProvider === 'steam' ? 'Steam' : disconnectProvider === 'gog' ? 'GOG' : 'Itch.io'}`}
        message={`Tem certeza que deseja desconectar esta conta ${disconnectProvider === 'steam' ? 'Steam' : disconnectProvider === 'gog' ? 'GOG' : 'Itch.io'}? Ela não será mais sincronizada.`}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          setShowDisconnectConfirm(false);
          setShowDeleteGamesConfirm(true);
        }}
        onCancel={() => {
          setShowDisconnectConfirm(false);
          setPendingDisconnectAccountId(null);
          setDisconnectProvider(null);
        }}
      />
    )}

    {/* Segundo modal de confirmação: O que fazer com os jogos */}
    {showDeleteGamesConfirm && (
      <ConfirmModal
        isOpen={showDeleteGamesConfirm}
        title="Remover Jogos Importados?"
        message="Deseja também REMOVER todos os jogos importados desta conta da sua biblioteca? Você pode optar por manter os jogos na biblioteca ou removê-los."
        confirmText="Remover jogos"
        cancelText="Manter jogos na biblioteca"
        isDestructive
        onConfirm={() => {
          if (disconnectProvider === 'steam') executeDisconnectSteam(true);
          else if (disconnectProvider === 'gog') executeDisconnectGog(true);
          else if (disconnectProvider === 'itch') executeDisconnectItch(true);
          setShowDeleteGamesConfirm(false);
        }}
        onCancel={() => {
          if (disconnectProvider === 'steam') executeDisconnectSteam(false);
          else if (disconnectProvider === 'gog') executeDisconnectGog(false);
          else if (disconnectProvider === 'itch') executeDisconnectItch(false);
          setShowDeleteGamesConfirm(false);
        }}
      />
    )}

    {/* Modal de confirmação: Remover todos os jogos da Epic Games */}
    {showEpicDeleteConfirm && (
      <ConfirmModal
        isOpen={showEpicDeleteConfirm}
        title="Remover Jogos da Epic Games?"
        message="Tem certeza que deseja remover todos os jogos importados da Epic Games da sua biblioteca? Esta ação não pode ser desfeita."
        confirmText="Sim, remover jogos"
        cancelText="Cancelar"
        isDestructive
        onConfirm={() => {
          setShowEpicDeleteConfirm(false);
          void handleDeleteEpicGames();
        }}
        onCancel={() => setShowEpicDeleteConfirm(false)}
      />
    )}
  </>
);
}
