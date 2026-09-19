import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button, ConfirmModal, Loader, PageTitle } from '@/components/Shared';
import { validatePatchNotesSearch } from '@/app/search';
import { patchNotesQuery } from '@/features/patch-notes/queries';
import { useAuth } from '@/hooks/useAuth';
import { MONTH_OPTIONS, recentYears } from '@/utils/calendar';
import PatchNoteFormModal from './PatchNoteFormModal';
import PatchNoteList from './PatchNoteList';
import { usePatchNotesController } from './usePatchNotesController';
import styles from './PatchNotes.module.css';

export default function PatchNotes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = validatePatchNotesSearch(useSearch({ strict: false }) as Record<string, unknown>);
  const patchesQuery = useQuery(patchNotesQuery(search.month, search.year));
  const controller = usePatchNotesController();
  const updatePeriod = (updates: { month?: number; year?: number }) => void navigate({ to: '/patch-notes', search: { ...search, ...updates } });

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <PageTitle level="h1">Notas de Atualização</PageTitle>
        <div className={styles.headerActions}>
          <div className={styles.feedFilters}>
            <select className={styles.filterSelect} value={search.month} onChange={(event) => updatePeriod({ month: Number(event.target.value) })} disabled={patchesQuery.isPending} aria-label="Filtrar por mês">
              {MONTH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className={styles.filterSelect} value={search.year} onChange={(event) => updatePeriod({ year: Number(event.target.value) })} disabled={patchesQuery.isPending} aria-label="Filtrar por ano">
              {recentYears().map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          {user?.is_admin && <Button onClick={controller.openCreate}>Publicar Novo Patch</Button>}
        </div>
      </div>
      {patchesQuery.isPending
        ? <Loader message="Carregando notas de atualização..." />
        : <PatchNoteList patches={patchesQuery.data ?? []} isAdmin={!!user?.is_admin} onEdit={controller.openEdit} onDelete={controller.setDeletingPatch} />}
      <PatchNoteFormModal
        open={controller.formOpen} editingPatch={controller.editingPatch} title={controller.title}
        content={controller.content} error={controller.error} submitting={controller.submitting}
        onTitleChange={controller.setTitle} onContentChange={controller.setContent}
        onSubmit={controller.submit} onClose={controller.closeForm}
      />
      <ConfirmModal
        isOpen={!!controller.deletingPatch} title="Excluir Nota de Atualização"
        message={`Tem certeza que deseja excluir a nota de atualização "${controller.deletingPatch?.title ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir" cancelText="Cancelar" onConfirm={controller.confirmDelete}
        onCancel={() => controller.setDeletingPatch(null)} isDestructive
      />
    </div>
  );
}
