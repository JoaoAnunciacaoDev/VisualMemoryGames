import { useState, useMemo } from 'react';

import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useLibrary } from '@/hooks/useLibrary';
import { useLibraryFilters } from '@/hooks/useLibraryFilters';
import { useGameSearch } from '@/hooks/useGameSearch';
import { addGameToLibrary } from '@/hooks/useAddGame';
import { useConfirmAction } from '@/hooks/useConfirmAction';

import LibraryCard from '@/components/LibraryCard/LibraryCard';
import GameEditModal from '@/components/GameEditModal/GameEditModal';
import CustomListsTab from '@/components/CustomListTab/CustomListTab';
import SearchBar from '@/components/SearchBar/SearchBar';
import GameCard from '@/components/GameCard/GameCard';
import GameGrid from '@/components/GameGrid/GameGrid';
import GameModal from '@/components/GameModal/GameModal';
import ConfirmModal from '@/components/Shared/ConfirmModal/ConfirmModal';
import ManualGameModal from '@/components/ManualGameModal/ManualGameModal';
import Input from '@/components/Shared/Input/Input';
import Button from '@/components/Shared/Button/Button';

import { LibraryGame, GameResult } from '@/types/game';
import { getBestGameCover } from '@/services/media';
import styles from '@/pages/Library/Library.module.css';

const STATUS_OPTIONS = [
  'Todos', 'Quero Jogar', 'Jogando', 'Zerado', 'Platinado', 'Abandonado', 'Em Espera',
];

type Tab = 'library' | 'lists' | 'search' | 'manual';
type SortBy = 'rating' | 'started_at' | 'finished_at' | null;

export default function Library() {
  const { userId, loading } = useAuth();
  const { games, loadLibrary, removeGame } = useLibrary(userId);
  const { filtered, search, setSearch, statusFilter, setStatusFilter, sortBy, setSortBy, sortOrder, setSortOrder } = useLibraryFilters(games);
  const { searchResults, isSearching, searchGames } = useGameSearch();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [selectedLibraryGame, setSelectedLibraryGame] = useState<LibraryGame | null>(null);
  const [selectedSearchGame, setSelectedSearchGame] = useState<GameResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const removeConfirm = useConfirmAction<number>();

  const addedGames = useMemo(() => {
    return new Map<number, string>(
      games
        .filter((g) => g.external_id !== null)
        .map((g) => [g.external_id as number, g.id])
    );
  }, [games]);

  const handleSaveLibraryGame = async () => {
    try {
      await loadLibrary();
      setSelectedLibraryGame(null);
      showToast('Jogo atualizado com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar alterações.', 'error');
    }
  };

  const handleAddGame = async (game: GameResult) => {
    try {
      await addGameToLibrary(game);
      await loadLibrary();
      showToast('Jogo adicionado à biblioteca!', 'success');
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  };

  const confirmRemove = async () => {
    if (removeConfirm.target === null) return;
    try {
      const userGameId = addedGames.get(removeConfirm.target);
      if (!userGameId) return;
      await removeGame(userGameId);
      setSelectedSearchGame(null);
      showToast('Jogo removido da biblioteca.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    } finally {
      removeConfirm.close();
    }
  };

  if (loading) return <p>Carregando biblioteca...</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.heading}>Minha Biblioteca</h2>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'library' ? styles.activeTab : ''}`} onClick={() => setActiveTab('library')}>
          Meus Jogos
        </button>
        <button className={`${styles.tab} ${activeTab === 'search' ? styles.activeTab : ''}`} onClick={() => setActiveTab('search')}>
          Pesquisar / Adicionar
        </button>
        <button className={`${styles.tab} ${activeTab === 'lists' ? styles.activeTab : ''}`} onClick={() => setActiveTab('lists')}>
          Minhas Listas
        </button>
        <button className={`${styles.tab} ${activeTab === 'manual' ? styles.activeTab : ''}`} onClick={() => setActiveTab('manual')}>
          Adicionar Manualmente
        </button>
      </div>

      {activeTab === 'library' && (
        <>
          <div className={styles.controls}>
            <Input
              type="text"
              placeholder="Pesquisar na biblioteca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.select}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={sortBy ?? ''}
              onChange={(e) => setSortBy(e.target.value === '' ? null : (e.target.value as Exclude<SortBy, null>))}
              className={styles.select}
            >
              <option value="">Ordenar por</option>
              <option value="rating">Nota</option>
              <option value="started_at">Data de início</option>
              <option value="finished_at">Data de término</option>
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className={styles.select}>
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              {games.length === 0
                ? 'Sua biblioteca está vazia. Vá na aba "Pesquisar / Adicionar" para buscar jogos!'
                : 'Nenhum jogo encontrado com os filtros aplicados.'}
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((game) => (
                <LibraryCard
                  key={game.id}
                  title={game.title}
                  coverUrl={getBestGameCover(game)}
                  status={game.status}
                  rating={game.rating}
                  startedAt={game.started_at}
                  finishedAt={game.finished_at}
                  onClick={() => setSelectedLibraryGame(game)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'search' && (
        <>
          <SearchBar onSearch={searchGames} isSearching={isSearching} />
          <GameGrid>
            {searchResults.map((game) => (
              <GameCard
                key={game.external_id}
                title={game.title}
                coverUrl={game.cover_url}
                releaseYear={game.release_year}
                isAdded={addedGames.has(game.external_id)}
                onAdd={() => handleAddGame(game)}
                onRemove={() => removeConfirm.open(game.external_id)}
                onClick={() => setSelectedSearchGame(game)}
              />
            ))}
          </GameGrid>
          {searchResults.length === 0 && !isSearching && (
            <div className={styles.emptyState}>
              Pesquise por um título para adicionar à sua coleção.
            </div>
          )}
        </>
      )}

      {activeTab === 'lists' && (
        <CustomListsTab userId={userId} libraryGames={games} />
      )}

      {activeTab === 'manual' && (
        <div className={styles.manualSection}>
          <Button variant="primary" onClick={() => setShowManualModal(true)}>
            + Adicionar Jogo Manualmente
          </Button>
        </div>
      )}

      {selectedLibraryGame && (
        <GameEditModal
          game={selectedLibraryGame}
          onSave={handleSaveLibraryGame}
          onRemove={async () => {
            try {
              await removeGame(selectedLibraryGame.id);
              setSelectedLibraryGame(null);
              showToast('Jogo removido da biblioteca.', 'info');
            } catch {
              showToast('Erro ao remover jogo.', 'error');
            }
          }}
          onClose={() => setSelectedLibraryGame(null)}
        />
      )}

      <GameModal
        game={selectedSearchGame ? {
          title: selectedSearchGame.title,
          coverUrl: selectedSearchGame.cover_url,
          releaseYear: selectedSearchGame.release_year,
          platforms: selectedSearchGame.platforms,
          genres: selectedSearchGame.genres,
        } : null}
        isAdded={selectedSearchGame ? addedGames.has(selectedSearchGame.external_id) : false}
        onClose={() => setSelectedSearchGame(null)}
        onAdd={() => selectedSearchGame && handleAddGame(selectedSearchGame)}
        onRemove={() => selectedSearchGame && removeConfirm.open(selectedSearchGame.external_id)}
      />

      <ConfirmModal
        isOpen={removeConfirm.isOpen}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da sua biblioteca? Você perderá todos os dados salvos sobre ele."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmRemove}
        onCancel={removeConfirm.close}
      />

      {showManualModal && (
        <ManualGameModal
          onSuccess={async () => {
            await loadLibrary();
            showToast('Jogo adicionado à biblioteca!', 'success');
          }}
          onClose={() => setShowManualModal(false)}
        />
      )}
    </div>
  );
}