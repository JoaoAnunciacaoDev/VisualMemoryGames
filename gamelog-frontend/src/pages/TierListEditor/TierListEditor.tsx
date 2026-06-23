import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, rectIntersection,
  DragStartEvent, DragOverEvent, DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';
import TierRow from '../../components/TierListMaker/TierRow';
import SortableGame from '../../components/TierListMaker/SortableGame';
import GameSearchModal from '../../components/GameSearchModal/GameSearchModal';
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
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierColor, setNewTierColor] = useState('#cccccc');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const loadTierList = useCallback(async () => {
    try {
      const response = await api.get(`/tierlists/${id}`, { headers: getHeaders() });
      const data = response.data;
      setTitle(data.title);

      const loadedTiers: Tier[] = data.categories.map((cat: any) => ({
        id: cat.id,
        label: cat.name,
        color: cat.color,
      }));
      setTiers(loadedTiers);

      const loadedGames: Record<string, GameItem[]> = { [POOL_ID]: [] };
      for (const cat of data.categories) {
        loadedGames[cat.id] = cat.items.map((item: any) => ({
          id: item.game_id,
          itemId: item.id,
          title: item.game?.title ?? 'Jogo',
          coverUrl: item.game?.cover_url ?? null,
        }));
      }
      setGames(loadedGames);
    } catch {
      navigate('/tierlists');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadTierList();
  }, [loadTierList, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback((itemId: string) => {
    if (itemId in games) return itemId;
    return Object.keys(games).find((key) => games[key].some((g) => g.id === itemId));
  }, [games]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) ?? (over.id as string);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setGames((prev) => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...(prev[overContainer] ?? [])];
      const activeIndex = activeItems.findIndex((g) => g.id === active.id);
      const overIndex = overItems.findIndex((g) => g.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      const item = activeItems[activeIndex];

      return {
        ...prev,
        [activeContainer]: activeItems.filter((g) => g.id !== active.id),
        [overContainer]: [...overItems.slice(0, newIndex), item, ...overItems.slice(newIndex)],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) ?? (over.id as string);
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const activeIndex = games[activeContainer].findIndex((g) => g.id === active.id);
      const overIndex = games[overContainer].findIndex((g) => g.id === over.id);
      if (activeIndex !== overIndex) {
        setGames((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
        }));
      }
      return;
    }

    if (overContainer !== POOL_ID) {
      const game = games[activeContainer]?.find((g) => g.id === active.id)
        ?? Object.values(games).flat().find((g) => g.id === active.id);

      if (!game) return;

      try {
        if (game.itemId) {
          await api.put(`/tierlists/category/${activeContainer}/items/${game.itemId}/move`, {
            target_category_id: overContainer
          }, { headers: getHeaders() });
        } else {
          const response = await api.post(`/tierlists/category/${overContainer}/items`, {
            game_id: game.id
          }, { headers: getHeaders() });

          setGames((prev) => ({
            ...prev,
            [overContainer]: prev[overContainer].map((g) =>
              g.id === game.id ? { ...g, itemId: response.data.id } : g
            ),
          }));
        }
      } catch {
        showToast('Erro ao mover jogo.', 'error');
        await loadTierList();
      }
    } else {
      const game = Object.values(games).flat().find((g) => g.id === active.id);
      if (game?.itemId) {
        try {
          await api.delete(`/tierlists/category/${activeContainer}/items/${game.itemId}`, {
            headers: getHeaders()
          });
          setGames((prev) => ({
            ...prev,
            [overContainer]: prev[overContainer].map((g) =>
              g.id === game.id ? { ...g, itemId: undefined } : g
            ),
          }));
        } catch {
          showToast('Erro ao remover jogo do tier.', 'error');
        }
      }
    }
  };

  const handleAddTier = async () => {
    if (!newTierLabel.trim()) return;
    try {
      const response = await api.post(`/tierlists/${id}/categories`, {
        name: newTierLabel.trim(),
        color: newTierColor,
        order_index: tiers.length,
      }, { headers: getHeaders() });

      const cat = response.data;
      setTiers((prev) => [...prev, { id: cat.id, label: cat.name, color: cat.color }]);
      setGames((prev) => ({ ...prev, [cat.id]: [] }));
      setNewTierLabel('');
      setNewTierColor('#cccccc');
    } catch {
      showToast('Erro ao criar tier.', 'error');
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    try {
      await api.delete(`/tierlists/category/${tierId}`, { headers: getHeaders() });
      setGames((prev) => ({
        ...prev,
        [POOL_ID]: [...prev[POOL_ID], ...prev[tierId].map((g) => ({ ...g, itemId: undefined }))],
        [tierId]: [],
      }));
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
    } catch {
      showToast('Erro ao deletar tier.', 'error');
    }
  };

  const handleLabelChange = async (tierId: string, newLabel: string) => {
    try {
      await api.put(`/tierlists/category/${tierId}`, { name: newLabel }, { headers: getHeaders() });
      setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, label: newLabel } : t));
    } catch {
      showToast('Erro ao renomear tier.', 'error');
    }
  };

  const handleColorChange = async (tierId: string, newColor: string) => {
    try {
      await api.put(`/tierlists/category/${tierId}`, { color: newColor }, { headers: getHeaders() });
      setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, color: newColor } : t));
    } catch {
      showToast('Erro ao mudar cor.', 'error');
    }
  };

  const handleTitleSave = async () => {
    try {
      await api.put(`/tierlists/${id}`, { title }, { headers: getHeaders() });
      setEditingTitle(false);
    } catch {
      showToast('Erro ao salvar título.', 'error');
    }
  };

  const handleGameFound = async (game: { id: string; title: string; coverUrl: string | null }) => {
    setGames((prev) => ({
      ...prev,
      [POOL_ID]: [...prev[POOL_ID], { ...game, itemId: undefined }],
    }));
    setShowSearchModal(false);
    showToast(`${game.title} adicionado ao pool!`, 'success');
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
              onDelete={() => handleDeleteTier(tier.id)}
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
          <TierRow id={POOL_ID} games={games[POOL_ID] ?? []} />
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
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}