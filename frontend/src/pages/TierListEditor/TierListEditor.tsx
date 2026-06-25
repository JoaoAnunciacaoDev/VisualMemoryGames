import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, rectIntersection,
  DragStartEvent, DragOverEvent, DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useToast } from '../../hooks/useToast';
import { getAuthHeaders } from '../../services/auth';
import api from '../../services/api';
import TierRow from '../../components/TierListMaker/TierRow';
import SortableGame from '../../components/TierListMaker/SortableGame';
import GameSearchModal from '../../components/GameSearchModal/GameSearchModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import Toast from '../../components/Toast/Toast';
import styles from './TierListEditor.module.css';

interface GameItem {
  id: string;
  title: string;
  coverUrl: string | null;
  itemId?: string;
}

interface Tier {
  id: string;
  label: string;
  color: string;
}

const POOL_ID = 'unassigned';

export default function TierListEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [games, setGames] = useState<Record<string, GameItem[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeContainer, setActiveContainer] = useState<string | null>(null);
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierColor, setNewTierColor] = useState('#cccccc');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tierToRemove, setTierToRemove] = useState<string | null>(null);
  const [poolCategoryId, setPoolCategoryId] = useState<string | null>(null);
  const location = useLocation();
  const initialPoolProcessed = useRef(false);
  const existingGameIds = new Set(
    Object.values(games).flat().map((g) => g.id)
  );
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameToRemove, setGameToRemove] = useState<string | null>(null);

  const handleRemoveGameFromTierList = async (gameId: string) => {
    const allGames = Object.values(games).flat();
    const game = allGames.find((g) => g.id === gameId);
    if (!game?.itemId) return;

    const container = Object.keys(games).find((key) =>
      games[key].some((g) => g.id === gameId)
    );
    if (!container) return;

    const categoryId = container === POOL_ID ? poolCategoryId : container;
    if (!categoryId) return;

    try {
      await api.delete(
        `/tierlists/category/${categoryId}/items/${game.itemId}`,
        { headers: getAuthHeaders() }
      );
      setGames((prev) => ({
        ...prev,
        [container]: prev[container].filter((g) => g.id !== gameId),
      }));
      setSelectedGameId(null);
      showToast('Jogo removido da tier list.', 'info');
    } catch {
      showToast('Erro ao remover jogo.', 'error');
    }
  };

  const loadTierList = useCallback(async () => {
    try {
      const response = await api.get(`/tierlists/${id}`, { headers: getAuthHeaders() });
      const data = response.data;
      setTitle(data.title);

      const poolCat = data.categories.find((cat: any) => cat.name === '__pool__');
      const normalCats = data.categories.filter((cat: any) => cat.name !== '__pool__');

      const loadedTiers: Tier[] = normalCats.map((cat: any) => ({
        id: cat.id,
        label: cat.name,
        color: cat.color,
      }));
      setTiers(loadedTiers);

      if (poolCat) {
        setPoolCategoryId(poolCat.id);
      }

      const loadedGames: Record<string, GameItem[]> = {};

      for (const cat of normalCats) {
        loadedGames[cat.id] = [...cat.items]
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((item: any) => ({
          id: item.game_id,
          itemId: item.id,
          title: item.game?.title ?? 'Jogo',
          coverUrl: item.game?.cover_url ?? null,
        }));
      }

      const savedPool: GameItem[] = poolCat?.items.map((item: any) => ({
        id: item.game_id,
        itemId: item.id,
        title: item.game?.title ?? 'Jogo',
        coverUrl: item.game?.cover_url ?? null,
      })) ?? [];

      const initialPool: GameItem[] = location.state?.initialPool ?? [];
      if (initialPool.length > 0 && poolCat && !initialPoolProcessed.current) {
        initialPoolProcessed.current = true;

        const savedPoolIds = new Set(savedPool.map((g) => g.id));
        const newGames = initialPool.filter((g) => !savedPoolIds.has(g.id));

        const savedNewGames: GameItem[] = [];
        for (const game of newGames) {
          try {
            const response = await api.post(
              `/tierlists/category/${poolCat.id}/items`,
              { game_id: game.id },
              { headers: getAuthHeaders() }
            );
            savedNewGames.push({ ...game, itemId: response.data.id });
          } catch (err: any) {
            if (err.response?.status === 400) {
              console.warn(`Jogo ${game.title} já está na tier list, ignorando.`);
            } else {
              savedNewGames.push(game);
            }
          }
        }

        loadedGames[POOL_ID] = [...savedPool, ...savedNewGames];
      } else {
        loadedGames[POOL_ID] = savedPool;
      }

      setGames(loadedGames);
    } catch {
      navigate('/tierlists');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, location.state]);

  useEffect(() => {
    loadTierList();
  }, [loadTierList]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback((itemId: string) => {
    if (itemId in games) return itemId;
    return Object.keys(games).find((key) => games[key].some((g) => g.id === itemId));
  }, [games]);

  const handleDragStart = (event: DragStartEvent) => {
    const dragId = event.active.id as string;
    setActiveId(dragId);
    setActiveContainer(findContainer(dragId) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const fromContainer = findContainer(active.id as string);
    const toContainer = findContainer(over.id as string) ?? (over.id as string);
    if (!fromContainer || !toContainer || fromContainer === toContainer) return;

    setGames((prev) => {
      const activeItems = [...prev[fromContainer]];
      const overItems = [...(prev[toContainer] ?? [])];
      const activeIndex = activeItems.findIndex((g) => g.id === active.id);
      const overIndex = overItems.findIndex((g) => g.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      const item = activeItems[activeIndex];

      return {
        ...prev,
        [fromContainer]: activeItems.filter((g) => g.id !== active.id),
        [toContainer]: [...overItems.slice(0, newIndex), item, ...overItems.slice(newIndex)],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !activeContainer) {
      setActiveContainer(null);
      return;
    }

    const overContainer = findContainer(over.id as string) ?? (over.id as string);

    if (activeContainer === overContainer) {
      const activeIndex = games[activeContainer].findIndex((g) => g.id === active.id);
      const overIndex = games[overContainer].findIndex((g) => g.id === over.id);
      if (activeIndex !== overIndex) {
        const reordered = arrayMove(games[activeContainer], activeIndex, overIndex);
        setGames((prev) => ({
          ...prev,
          [activeContainer]: reordered,
        }));

        if (activeContainer !== POOL_ID) {
          const itemIds = reordered
            .filter((g) => g.itemId)
            .map((g) => g.itemId as string);

          try {
            await api.put(
              `/tierlists/category/${activeContainer}/reorder`,
              { item_ids: itemIds },
              { headers: getAuthHeaders() }
            );
          } catch {
            showToast('Erro ao salvar ordem.', 'error');
          }
        }
      }
      setActiveContainer(null);
      return;
    }

    const allGames = Object.values(games).flat();
    const game = allGames.find((g) => g.id === active.id);
    if (!game) {
      setActiveContainer(null);
      return;
    }

    if (overContainer !== POOL_ID) {
      try {
        if (game.itemId) {
          await api.put(
            `/tierlists/category/${activeContainer}/items/${game.itemId}/move`,
            { target_category_id: overContainer },
            { headers: getAuthHeaders() }
          );
        } else {
          const response = await api.post(
            `/tierlists/category/${overContainer}/items`,
            { game_id: game.id },
            { headers: getAuthHeaders() }
          );
          const newItemId = response.data.id;
          setGames((prev) => ({
            ...prev,
            [overContainer]: prev[overContainer].map((g) =>
              g.id === game.id ? { ...g, itemId: newItemId } : g
            ),
          }));
        }
      } catch (err) {
        console.error('Erro ao mover:', err);
        showToast('Erro ao mover jogo.', 'error');
        await loadTierList();
      }
    } else {
      if (game.itemId && poolCategoryId) {
        try {
          await api.put(
            `/tierlists/category/${activeContainer}/items/${game.itemId}/move`,
            { target_category_id: poolCategoryId },
            { headers: getAuthHeaders() }
          );
        } catch (err) {
          console.error('Erro ao mover para pool:', err);
          showToast('Erro ao mover jogo para o pool.', 'error');
          await loadTierList();
        }
      } else if (!game.itemId && poolCategoryId) {
        try {
          const response = await api.post(
            `/tierlists/category/${poolCategoryId}/items`,
            { game_id: game.id },
            { headers: getAuthHeaders() }
          );
          const newItemId = response.data.id;
          setGames((prev) => ({
            ...prev,
            [POOL_ID]: prev[POOL_ID].map((g) =>
              g.id === game.id ? { ...g, itemId: newItemId } : g
            ),
          }));
        } catch (err) {
          console.error('Erro ao salvar no pool:', err);
          showToast('Erro ao salvar jogo no pool.', 'error');
        }
      }
    }

    setActiveContainer(null);
  };

  const handleAddTier = async () => {
    if (!newTierLabel.trim()) return;
    try {
      const response = await api.post(`/tierlists/${id}/categories`, {
        name: newTierLabel.trim(),
        color: newTierColor,
        order_index: tiers.length,
      }, { headers: getAuthHeaders() });

      const cat = response.data;
      setTiers((prev) => [...prev, { id: cat.id, label: cat.name, color: cat.color }]);
      setGames((prev) => ({ ...prev, [cat.id]: [] }));
      setNewTierLabel('');
      setNewTierColor('#cccccc');
    } catch {
      showToast('Erro ao criar tier.', 'error');
    }
  };

  const confirmDeleteTier = async () => {
    if (!tierToRemove) return;
    try {
      await api.delete(`/tierlists/category/${tierToRemove}`, { headers: getAuthHeaders() });
      setGames((prev) => ({
        ...prev,
        [POOL_ID]: [...prev[POOL_ID], ...prev[tierToRemove].map((g) => ({ ...g, itemId: undefined }))],
        [tierToRemove]: [],
      }));
      setTiers((prev) => prev.filter((t) => t.id !== tierToRemove));
    } catch {
      showToast('Erro ao deletar tier.', 'error');
    } finally {
      setTierToRemove(null);
    }
  };

  const handleLabelChange = async (tierId: string, newLabel: string) => {
    try {
      await api.put(`/tierlists/category/${tierId}`, { name: newLabel }, { headers: getAuthHeaders() });
      setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, label: newLabel } : t));
    } catch {
      showToast('Erro ao renomear tier.', 'error');
    }
  };

  const handleColorChange = async (tierId: string, newColor: string) => {
    try {
      await api.put(`/tierlists/category/${tierId}`, { color: newColor }, { headers: getAuthHeaders() });
      setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, color: newColor } : t));
    } catch {
      showToast('Erro ao mudar cor.', 'error');
    }
  };

  const handleTitleSave = async () => {
    try {
      await api.put(`/tierlists/${id}`, { title }, { headers: getAuthHeaders() });
      setEditingTitle(false);
    } catch {
      showToast('Erro ao salvar título.', 'error');
    }
  };

  const handleGameFound = async (game: { id: string; title: string; coverUrl: string | null }) => {
    try {
      if (poolCategoryId) {
        const response = await api.post(
          `/tierlists/category/${poolCategoryId}/items`,
          { game_id: game.id },
          { headers: getAuthHeaders() }
        );
        const newItemId = response.data.id;
        setGames((prev) => ({
          ...prev,
          [POOL_ID]: [...prev[POOL_ID], { ...game, itemId: newItemId }],
        }));
      } else {
        setGames((prev) => ({
          ...prev,
          [POOL_ID]: [...prev[POOL_ID], { ...game, itemId: undefined }],
        }));
      }
      setShowSearchModal(false);
      showToast(`${game.title} adicionado ao pool!`, 'success');
    } catch {
      showToast('Erro ao adicionar jogo.', 'error');
    }
  };

  const activeGame = activeId
    ? Object.values(games).flat().find((g) => g.id === activeId)
    : null;

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {editingTitle ? (
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            autoFocus
          />
        ) : (
          <h2 className={styles.title} onDoubleClick={() => setEditingTitle(true)}>
            {title}
          </h2>
        )}
        <button className={styles.addGameButton} onClick={() => setShowSearchModal(true)}>
          + Adicionar Jogo
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board}>
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              id={tier.id}
              label={tier.label}
              color={tier.color}
              games={games[tier.id] ?? []}
              onLabelChange={(label) => handleLabelChange(tier.id, label)}
              onColorChange={(color) => handleColorChange(tier.id, color)}
              onDelete={() => setTierToRemove(tier.id)}
              onRemoveGame={(gameId) => setGameToRemove(gameId)}
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
            />
          ))}
        </div>

        <div className={styles.addTierRow}>
          <input
            type="text"
            placeholder="Nome do novo tier..."
            value={newTierLabel}
            onChange={(e) => setNewTierLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTier()}
            className={styles.addTierInput}
          />
          <input
            type="color"
            value={newTierColor}
            onChange={(e) => setNewTierColor(e.target.value)}
            className={styles.colorPicker}
          />
          <button className={styles.addTierButton} onClick={handleAddTier}>
            + Adicionar Tier
          </button>
        </div>

        <div className={styles.poolArea}>
          <h3>Jogos não classificados</h3>
          <TierRow
            id={POOL_ID}
            games={games[POOL_ID] ?? []}
            onRemoveGame={(gameId) => setGameToRemove(gameId)}
            selectedGameId={selectedGameId}
            onSelectGame={setSelectedGameId}
          />
        </div>

        <DragOverlay>
          {activeGame ? (
            <SortableGame id={activeGame.id} title={activeGame.title} coverUrl={activeGame.coverUrl} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {showSearchModal && (
        <GameSearchModal
          onSelect={handleGameFound}
          onClose={() => setShowSearchModal(false)}
          existingGameIds={existingGameIds}
        />
      )}

      <ConfirmModal
        isOpen={gameToRemove !== null}
        title="Remover Jogo"
        message="Tem certeza que deseja remover este jogo da tier list?"
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={async () => {
          if (gameToRemove) {
            await handleRemoveGameFromTierList(gameToRemove);
            setGameToRemove(null);
          }
        }}
        onCancel={() => setGameToRemove(null)}
      />

      <ConfirmModal
        isOpen={tierToRemove !== null}
        title="Remover Tier"
        message="Tem certeza que deseja remover este tier? Os jogos nele voltarão para a área de não classificados."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={confirmDeleteTier}
        onCancel={() => setTierToRemove(null)}
      />

      <div className={styles.page} onClick={() => setSelectedGameId(null)}></div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}