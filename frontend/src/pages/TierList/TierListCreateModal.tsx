import { useForm } from '@tanstack/react-form';
import { Modal, Button, Input } from '@/components/Shared';
import styles from '@/pages/TierList/TierList.module.css';
import type { CustomList } from '@/types';
import { tierListCreateSchema, type TierListCreateValues } from '@/features/tierlists/types';

export type { TierListCreateValues } from '@/features/tierlists/types';

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
  const form = useForm({
    defaultValues: {
      title: '',
      gameSource: 'empty',
      selectedStatus: 'Zerado',
      selectedListId: '',
      isPublic: true,
    } as TierListCreateValues,
    onSubmit: ({ value }) => {
      const parsed = tierListCreateSchema.safeParse(value);
      if (!parsed.success) return;
      onCreate(parsed.data);
      onClose();
      form.reset();
    },
  });

  const handleClose = () => {
    onClose();
    form.reset();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="460px" showCloseButton>
      <form
        className={styles.modalContent}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <h3 className={styles.modalTitle}>Nova Tier List</h3>

        <form.Field name="title">
          {(field) => (
            <label className={styles.label}>
              Nome
              <Input
                type="text"
                placeholder="Ex: Meus Jogos de 2024"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                autoFocus
              />
            </label>
          )}
        </form.Field>

        <form.Field name="gameSource">
          {(field) => (
            <label className={styles.label}>
              Fonte dos jogos
              <select
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value as TierListCreateValues['gameSource'])}
                className={styles.select}
              >
                <option value="empty">Vazia (adicionar manualmente)</option>
                <option value="all">Toda a biblioteca</option>
                <option value="status">Por status</option>
                <option value="list">Lista personalizada</option>
              </select>
            </label>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.gameSource}>
          {(gameSource) => (
            <>
              {gameSource === 'status' && (
                <form.Field name="selectedStatus">
                  {(field) => (
                    <label className={styles.label}>
                      Status
                      <select
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className={styles.select}
                      >
                        {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                  )}
                </form.Field>
              )}

              {gameSource === 'list' && (
                <form.Field name="selectedListId">
                  {(field) => (
                    <label className={styles.label}>
                      Lista
                      <select
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className={styles.select}
                      >
                        <option value="">Selecione uma lista...</option>
                        {customLists.map((list) => (
                          <option key={list.id} value={list.id}>{list.name} ({list.games.length} jogos)</option>
                        ))}
                      </select>
                    </label>
                  )}
                </form.Field>
              )}
            </>
          )}
        </form.Subscribe>

        <form.Field name="isPublic">
          {(field) => (
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.checked)}
                className={styles.checkbox}
              />
              <span>Tornar esta Tier List pública</span>
            </label>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const canCreate = !isCreating && tierListCreateSchema.safeParse(values).success;
            return (
              <div className={styles.modalActions}>
                <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={!canCreate}>
                  {isCreating ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            );
          }}
        </form.Subscribe>
      </form>
    </Modal>
  );
}
