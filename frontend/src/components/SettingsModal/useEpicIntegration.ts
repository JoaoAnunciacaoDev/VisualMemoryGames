import { useState } from 'react';
import { EPIC_EXPORT_SCRIPT, parseEpicContent } from './epicImport';
import { parseSettingsError } from './settingsErrors';
import type {
  IntegrationRunner,
  SettingsErrorSetter,
  ToastPresenter,
} from './integrationTypes';

interface Options {
  run: IntegrationRunner;
  setError: SettingsErrorSetter;
  showToast: ToastPresenter;
}

export function useEpicIntegration({ run, setError, showToast }: Options) {
  const [isEpicInstructionsOpen, setIsEpicInstructionsOpen] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [epicPastedText, setEpicPastedText] = useState('');
  const [parsedEpicTitles, setParsedEpicTitles] = useState<string[]>([]);
  const [isEpicDragging, setIsEpicDragging] = useState(false);

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
        titles.length === 0
          ? 'Nenhum jogo identificado no arquivo.'
          : `${titles.length} jogos identificados do arquivo!`,
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
      const skipped =
        (result.skipped_count ?? 0) > 0
          ? ` (${result.skipped_count} já existiam na biblioteca)`
          : '';
      showToast(
        `Importação concluída! ${result.imported_count ?? 0} novos jogos adicionados${skipped}.`,
        'success',
      );
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
      showToast(
        `Atualização iniciada! ${result.games_to_enrich_count ?? 0} jogos estão tendo capas e gêneros buscados em segundo plano.`,
        'success',
      );
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao atualizar metadados dos jogos da Epic Games.'));
    }
  };

  const deleteEpicGames = async () => {
    setError('');
    try {
      const result = await run({ provider: 'epic', type: 'delete-games' });
      showToast(
        `${result.removed_count ?? 0} jogos da Epic Games foram removidos da biblioteca.`,
        'success',
      );
    } catch (error) {
      setError(parseSettingsError(error, 'Erro ao remover jogos da Epic Games.'));
    }
  };

  return {
    isEpicInstructionsOpen,
    setIsEpicInstructionsOpen,
    isCopiedScript,
    epicPastedText,
    parsedEpicTitles,
    isEpicDragging,
    setIsEpicDragging,
    copyEpicScript,
    setEpicContent,
    uploadEpicFile,
    importEpic,
    enrichEpic,
    deleteEpicGames,
  };
}
