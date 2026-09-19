import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { runIntegrationAction } from '@/features/integrations/mutations';
import {
  gogAccountsQuery,
  integrationKeys,
  itchAccountsQuery,
  steamAccountsQuery,
} from '@/features/integrations/queries';
import { libraryKeys, myLibraryQuery } from '@/features/library/queries';
import { parseSettingsError } from './settingsErrors';

export type IntegrationProvider = 'steam' | 'gog' | 'itch';

const EPIC_EXPORT_SCRIPT = `(async () => {
  const BASE = "https://accounts.epicgames.com/account/v2/payment/ajaxGetOrderHistory?count=100&sortDir=DESC&sortBy=DATE&locale=en-US";
  let allGames = [];
  let nextPageToken = "";
  let page = 1;
  console.log("Iniciando exportação da biblioteca da Epic...");
  while (true) {
      const url = nextPageToken ? \`\${BASE}&nextPageToken=\${encodeURIComponent(nextPageToken)}\` : BASE;
      console.log(\`Buscando página \${page}...\`);
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
  console.log(\`Exportação concluída! \${uniqueGames.length} jogos baixados.\`);
})();`;

const parseEpicContent = (rawText: string): string[] => {
  const titles = rawText.split(/\r?\n/).flatMap((rawLine) => {
    let line = rawLine.trim();
    if (!line || line.toLowerCase() === 'game' || line.toLowerCase() === '"game"') return [];
    if (line.startsWith('"') && line.endsWith('"') && line.length > 1) {
      line = line.slice(1, -1).replace(/""/g, '"').trim();
    }
    return line ? [line] : [];
  });
  return [...new Set(titles)];
};

export function useSettingsIntegrations({
  enabled,
  setError,
}: {
  enabled: boolean;
  setError: (message: string) => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [steamUrl, setSteamUrl] = useState('');
  const [gogUrl, setGogUrl] = useState('');
  const [isEpicInstructionsOpen, setIsEpicInstructionsOpen] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [epicPastedText, setEpicPastedText] = useState('');
  const [parsedEpicTitles, setParsedEpicTitles] = useState<string[]>([]);
  const [isEpicDragging, setIsEpicDragging] = useState(false);

  const steamQuery = useQuery({ ...steamAccountsQuery(), enabled });
  const gogQuery = useQuery({ ...gogAccountsQuery(), enabled });
  const itchQuery = useQuery({ ...itchAccountsQuery(), enabled });
  const libraryQuery = useQuery({ ...myLibraryQuery(), enabled });

  const integrationMutation = useMutation({
    mutationFn: runIntegrationAction,
    onSuccess: (_result, action) => {
      if (action.provider !== 'epic') {
        queryClient.invalidateQueries({ queryKey: integrationKeys[action.provider]() });
      }
      queryClient.invalidateQueries({ queryKey: libraryKeys.all });
    },
  });

  const run = integrationMutation.mutateAsync;
  const isFetchingSteam = integrationMutation.isPending && integrationMutation.variables?.provider === 'steam';
  const isFetchingGog = integrationMutation.isPending && integrationMutation.variables?.provider === 'gog';
  const isFetchingItch = integrationMutation.isPending && integrationMutation.variables?.provider === 'itch';
  const isFetchingEpic = integrationMutation.isPending && integrationMutation.variables?.provider === 'epic';

  const connectSteam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!steamUrl.trim()) return;
    setError('');
    showToast('Conectando à Steam e importando biblioteca...', 'info');
    try {
      await run({ provider: 'steam', type: 'connect', profileUrl: steamUrl.trim() });
      showToast('Conta Steam conectada e biblioteca importada com sucesso!', 'success');
      setSteamUrl('');
    } catch (error) {
      const message = parseSettingsError(error, 'Erro ao conectar conta Steam. Verifique se o perfil e os detalhes de jogo estão públicos.');
      setError(message);
      showToast(message, 'error');
    }
  };

  const connectGog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gogUrl.trim()) return;
    setError('');
    showToast('Conectando à GOG e importando biblioteca...', 'info');
    try {
      await run({ provider: 'gog', type: 'connect', profileUrl: gogUrl.trim() });
      showToast('Conta GOG conectada e biblioteca importada com sucesso!', 'success');
      setGogUrl('');
    } catch (error) {
      const message = parseSettingsError(error, 'Erro ao conectar conta GOG. Verifique se o perfil e os jogos estão configurados como públicos no GOG.');
      setError(message);
      showToast(message, 'error');
    }
  };

  const disconnectAccount = async (provider: IntegrationProvider, accountId: string, deleteGames: boolean) => {
    setError('');
    try {
      await run({ provider, type: 'disconnect', accountId, deleteGames });
      const label = provider === 'steam' ? 'Steam' : provider === 'gog' ? 'GOG' : 'Itch.io';
      showToast(`Conta ${label} desconectada com sucesso.`, 'success');
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao desconectar conta.'));
    }
  };

  const sync = async (provider: IntegrationProvider, accountId?: string) => {
    setError('');
    try {
      const result = await run(accountId
        ? { provider, type: 'sync-one', accountId }
        : { provider, type: 'sync-all' });
      if (provider === 'gog') {
        showToast(`Sincronização GOG concluída! ${result.new_games_count ?? 0} novos jogos adicionados, ${result.updated_games_count ?? 0} atualizados.`, 'success');
      } else {
        showToast(`Sincronização concluída! ${result.new_games_count ?? 0} novos jogos adicionados.`, 'success');
      }
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao sincronizar conta.'));
    }
  };

  const connectItch = () => {
    const clientId = import.meta.env.VITE_ITCH_CLIENT_ID;
    if (!clientId) {
      setError('A integração com Itch.io não está configurada neste ambiente.');
      return;
    }
    const redirectUri = `${window.location.origin}/settings/integrations/itch/callback`;
    window.location.href = `https://itch.io/user/oauth?client_id=${clientId}&scope=profile:me%20profile:owned%20profile:games&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const copyEpicScript = async () => {
    try {
      await navigator.clipboard.writeText(EPIC_EXPORT_SCRIPT);
      setIsCopiedScript(true);
      showToast('Script copiado para a área de transferência!', 'success');
      setTimeout(() => setIsCopiedScript(false), 3000);
    } catch {
      showToast('Erro ao copiar script.', 'error');
    }
  };

  const setEpicContent = (text: string) => {
    setEpicPastedText(text);
    setParsedEpicTitles(parseEpicContent(text));
  };

  const uploadEpicFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const titles = parseEpicContent(text);
      setEpicPastedText(titles.join('\n'));
      setParsedEpicTitles(titles);
      showToast(
        titles.length === 0 ? 'Nenhum jogo identificado no arquivo.' : `${titles.length} jogos identificados do arquivo!`,
        titles.length === 0 ? 'error' : 'info',
      );
    };
    reader.readAsText(file);
  };

  const importEpic = async () => {
    if (parsedEpicTitles.length === 0) return;
    setError('');
    showToast(`Importando ${parsedEpicTitles.length} jogos da Epic Games...`, 'info');
    try {
      const result = await run({ provider: 'epic', type: 'import', titles: parsedEpicTitles });
      showToast(`Importação concluída! ${result.imported_count ?? 0} novos jogos adicionados${(result.skipped_count ?? 0) > 0 ? ` (${result.skipped_count} já existiam na biblioteca)` : ''}.`, 'success');
      setEpicPastedText('');
      setParsedEpicTitles([]);
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao importar jogos da Epic Games.'));
    }
  };

  const enrichEpic = async () => {
    setError('');
    showToast('Atualizando metadados dos jogos da Epic Games...', 'info');
    try {
      const result = await run({ provider: 'epic', type: 'enrich' });
      showToast(`Atualização iniciada! ${result.games_to_enrich_count ?? 0} jogos estão tendo capas e gêneros buscados em segundo plano.`, 'success');
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao atualizar metadados dos jogos da Epic Games.'));
    }
  };

  const deleteEpicGames = async () => {
    setError('');
    try {
      const result = await run({ provider: 'epic', type: 'delete-games' });
      showToast(`${result.removed_count ?? 0} jogos da Epic Games foram removidos da biblioteca.`, 'success');
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao remover jogos da Epic Games.'));
    }
  };

  return {
    steamAccounts: steamQuery.data ?? [], gogAccounts: gogQuery.data ?? [], itchAccounts: itchQuery.data ?? [],
    epicGamesCount: libraryQuery.data ? libraryQuery.data.filter((game) => game.store === 'EPIC').length : null,
    steamUrl, setSteamUrl, gogUrl, setGogUrl,
    isFetchingSteam, isFetchingGog, isFetchingItch, isFetchingEpic,
    isImportingEpic: isFetchingEpic && integrationMutation.variables?.type === 'import',
    isEpicInstructionsOpen, setIsEpicInstructionsOpen, isCopiedScript,
    epicPastedText, parsedEpicTitles, isEpicDragging, setIsEpicDragging,
    connectSteam, connectGog, connectItch, disconnectAccount, sync,
    copyEpicScript, setEpicContent, uploadEpicFile, importEpic, enrichEpic, deleteEpicGames,
  };
}
