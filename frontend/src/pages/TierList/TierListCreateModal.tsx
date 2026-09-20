import { useForm } from '@tanstack/react-form';
import { Modal, Button, Input } from '@/components/Shared';
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

  const selectClassName = 'w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--surface)] px-3.5 py-2.5 text-[length:var(--font-size-sm)] text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_2px_rgba(222,29,106,0.2)]';
  const labelClassName = 'flex flex-col gap-[var(--gap-sm)] text-[length:var(--font-size-sm)] font-semibold text-[var(--muted)]';

  return (
    <Modal open={open} onClose={handleClose} maxWidth="460px" showCloseButton>
      <form
        className="flex flex-col gap-[var(--gap-md)] p-[var(--gap-lg)]"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <h3 className="m-0 text-[length:var(--font-size-lg)] text-[var(--text)]">Nova Tier List</h3>

        <form.Field name="title">
          {(field) => (
            <label className={labelClassName}>
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
            <label className={labelClassName}>
              Fonte dos jogos
              <select
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value as TierListCreateValues['gameSource'])}
                className={selectClassName}
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
                    <label className={labelClassName}>
                      Status
                      <select
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className={selectClassName}
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
                    <label className={labelClassName}>
                      Lista
                      <select
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className={selectClassName}
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
            <label className="flex cursor-pointer select-none items-center gap-[var(--gap-sm)] text-[length:var(--font-size-sm)] text-[var(--text)]">
              <input
                type="checkbox"
                checked={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.checked)}
                className="size-[18px] cursor-pointer accent-[var(--primary)]"
              />
              <span>Tornar esta Tier List pública</span>
            </label>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const canCreate = !isCreating && tierListCreateSchema.safeParse(values).success;
            return (
              <div className="mt-[var(--gap-sm)] flex justify-end gap-[var(--gap-sm)] max-[600px]:flex-col [&>button]:max-[600px]:w-full">
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
