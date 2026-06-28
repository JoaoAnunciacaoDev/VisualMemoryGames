import { useState } from 'react';
import Modal from '@/components/Shared/Modal/Modal';
import Button from '@/components/Shared/Button/Button';
import Input from '@/components/Shared/Input/Input';
import styles from '@/pages/TierList/TierList.module.css';
import type { CustomList } from '@/types';

export type GameSource = 'empty' | 'all' | 'status' | 'list';

export interface TierListCreateValues {
  title: string;
  gameSource: GameSource;
  selectedStatus: string;
  selectedListId: string;
}

interface Props {
  open: boolean;
  isCreating: boolean;
  customLists: CustomList[];
  statusOptions: string[];
  onClose: () => void;
  onCreate: (values: TierListCreateValues) => void;
}

export default function TierListCreateModal({
  open,
  isCreating,
  customLists,
  statusOptions,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState('');
  const [gameSource, setGameSource] = useState<GameSource>('empty');
  const [selectedStatus, setSelectedStatus] = useState('Zerado');
  const [selectedListId, setSelectedListId] = useState('');

  const handleClose = () => {
    onClose();
    setTitle('');
    setGameSource('empty');
    setSelectedStatus('Zerado');
    setSelectedListId('');
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    onCreate({
      title: title.trim(),
      gameSource,
      selectedStatus,
      selectedListId,
    });

    handleClose();
  };

  const canCreate = !isCreating && title.trim().length > 0 && !(gameSource === 'list' && !selectedListId);

  return (
    <Modal open={open} onClose={handleClose} maxWidth="460px" showCloseButton>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Nova Tier List</h3>

        <label className={styles.label}>
          Nome
          <Input
            type="text"
            placeholder="Ex: Meus Jogos de 2024"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className={styles.label}>
          Fonte dos jogos
          <select
            value={gameSource}
            onChange={(e) => setGameSource(e.target.value as GameSource)}
            className={styles.select}
          >
            <option value="empty">Vazia (adicionar manualmente)</option>
            <option value="all">Toda a biblioteca</option>
            <option value="status">Por status</option>
            <option value="list">Lista personalizada</option>
          </select>
        </label>

        {gameSource === 'status' && (
          <label className={styles.label}>
            Status
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={styles.select}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        )}

        {gameSource === 'list' && (
          <label className={styles.label}>
            Lista
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className={styles.select}
            >
              <option value="">Selecione uma lista...</option>
              {customLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.games.length} jogos)
                </option>
              ))}
            </select>
          </label>
        )}

        <div className={styles.modalActions}>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleCreate} disabled={!canCreate}>
            {isCreating ? 'Criando...' : 'Criar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}