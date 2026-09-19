import { useEffect, useState, SyntheticEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageTitle, Button, Input, Modal, ConfirmModal, Loader } from '@/components/Shared';
import ReviewMarkdown from '@/components/GameEditModal/ReviewMarkdown';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/date';
import styles from './PatchNotes.module.css';
import {
  deletePatchNote,
  markPatchNotesRead,
  patchNoteKeys,
  patchNotesQuery,
  savePatchNote,
  type PatchNote,
} from '@/features/patch-notes/queries';
import { validatePatchNotesSearch } from '@/app/search';

export default function PatchNotes() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { month: selectedMonth, year: selectedYear } = validatePatchNotesSearch(
    useSearch({ strict: false }) as Record<string, unknown>,
  );

  // Filtros de Mês e Ano (Abre por padrão no Mês e Ano Atual, igual à aba Social)
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  // Estados do Modal de Criação/Edição
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatch, setEditingPatch] = useState<PatchNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  // Estados do Modal de Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');

  const { data: patches = [], isPending: loading } = useQuery(patchNotesQuery(selectedMonth, selectedYear));

  const markReadMutation = useMutation({
    mutationFn: markPatchNotesRead,
    onSuccess: () => queryClient.setQueryData(patchNoteKeys.unread(), false),
  });

  useEffect(() => {
    markReadMutation.mutate();
    // This mutation belongs to the page-open lifecycle and must run only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveMutation = useMutation({
    mutationFn: savePatchNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patchNoteKeys.all }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatchNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patchNoteKeys.all }),
  });

  const submitting = saveMutation.isPending;

  // 2. Abrir formulário para criação
  const handleCreateClick = () => {
    setEditingPatch(null);
    setTitle('');
    setContent('');
    setError('');
    setFormOpen(true);
  };

  // 3. Abrir formulário para edição
  const handleEditClick = (patch: PatchNote) => {
    setEditingPatch(patch);
    setTitle(patch.title);
    setContent(patch.content);
    setError('');
    setFormOpen(true);
  };

  // 4. Enviar formulário de criação/edição
  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    setError('');

    try {
      await saveMutation.mutateAsync({
        id: editingPatch?.id,
        input: { title: title.trim(), content: content.trim() },
      });
      showToast(
        editingPatch
          ? 'Nota de atualização editada com sucesso!'
          : 'Nota de atualização publicada com sucesso!',
        'success',
      );
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Erro ao salvar nota de atualização.';
      setError(msg);
    }
  };

  // 5. Excluir nota
  const handleDeleteClick = (patch: PatchNote) => {
    setDeleteId(patch.id);
    setDeleteTitle(patch.title);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      showToast('Nota de atualização excluída com sucesso.', 'success');
      setDeleteId(null);
    } catch {
      showToast('Erro ao excluir nota de atualização.', 'error');
    }
  };

  // 6. Verificar se o patch foi editado
  const isEdited = (patch: PatchNote) => {
    const created = new Date(patch.created_at).getTime();
    const updated = new Date(patch.updated_at).getTime();
    return updated - created > 1000; // diferença maior que 1 segundo
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <PageTitle level="h1">Notas de Atualização</PageTitle>

        <div className={styles.headerActions}>
          <div className={styles.feedFilters}>
            <select
              className={styles.filterSelect}
              value={selectedMonth}
              onChange={(e) => void navigate({
                to: '/patch-notes',
                search: { month: Number(e.target.value), year: selectedYear },
              })}
              disabled={loading}
              aria-label="Filtrar por mês"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={selectedYear}
              onChange={(e) => void navigate({
                to: '/patch-notes',
                search: { month: selectedMonth, year: Number(e.target.value) },
              })}
              disabled={loading}
              aria-label="Filtrar por ano"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {user?.is_admin && (
            <Button onClick={handleCreateClick}>
              Publicar Novo Patch
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Loader message="Carregando notas de atualização..." />
      ) : patches.length === 0 ? (
        <p className={styles.emptyText}>Nenhuma nota de atualização publicada ainda.</p>
      ) : (
        <div className={styles.patchList}>
          {patches.map((patch) => (
            <article key={patch.id} className={styles.patchCard}>
              <header className={styles.cardHeader}>
                <h2 className={styles.patchTitle}>{patch.title}</h2>
                <div className={styles.metaInfo}>
                  Publicado por <strong>{patch.author?.username || 'Admin'}</strong> em{' '}
                  {formatDateTime(patch.created_at)}
                  {isEdited(patch) && (
                    <span className={styles.editedText}>
                      {' '}
                      (Editado em {formatDateTime(patch.updated_at)})
                    </span>
                  )}
                </div>
                {user?.is_admin && (
                  <div className={styles.adminActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handleEditClick(patch)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDeleteClick(patch)}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </header>
              <div className={styles.cardBody}>
                <ReviewMarkdown markdown={patch.content} className={styles.content} />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Modal open={formOpen} onClose={() => !submitting && setFormOpen(false)} maxWidth="600px">
        <form onSubmit={handleSubmit} className={styles.form}>
          <h3 className={styles.modalTitle}>
            {editingPatch ? 'Editar Nota de Atualização' : 'Nova Nota de Atualização'}
          </h3>

          {error && <p className={styles.formError}>{error}</p>}

          <label className={styles.label}>
            Título do Patch
            <Input
              placeholder="Ex: Versão 1.2.0 - Correções na Biblioteca"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={submitting}
              maxLength={200}
            />
          </label>

          <label className={styles.label}>
            Conteúdo
            <textarea
              className={`${styles.textarea} scrollbar-visualmemory`}
              placeholder="Descreva as alterações aplicadas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={submitting}
              rows={12}
            />
          </label>

          <div className={styles.formActions}>
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Excluir Nota de Atualização"
        message={`Tem certeza que deseja excluir a nota de atualização "${deleteTitle}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
        isDestructive
      />
    </div>
  );
}
