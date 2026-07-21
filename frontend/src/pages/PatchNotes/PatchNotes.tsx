import { useState, useEffect, SyntheticEvent, useCallback } from 'react';
import { PageTitle, Button, Input, Modal, ConfirmModal, Loader } from '@/components/Shared';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/date';
import styles from './PatchNotes.module.css';

interface PatchNoteAuthor {
  id: string;
  username: string;
}

interface PatchNote {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: PatchNoteAuthor;
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^(<h|<ul|<ol|<li|<blockquote|<pre)/i.test(p)) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br />')}</p>`;
  }).join('\n');

  return html;
}

export default function PatchNotes() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [patches, setPatches] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Criação/Edição
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatch, setEditingPatch] = useState<PatchNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Estados do Modal de Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');

  // 1. Carregar notas de atualização
  const fetchPatches = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const res = await api.get('/patch-notes');
      setPatches(res.data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar notas de atualização.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        fetchPatches();
      }
    });

    // Marcar as notícias como lidas ao abrir a página
    const markAsRead = async () => {
      try {
        await api.post('/patch-notes/read');
        // Avisar o header para desligar o pisca
        window.dispatchEvent(new Event('patches-read'));
      } catch (err) {
        console.error('Erro ao marcar patch notes como lidos:', err);
      }
    };

    markAsRead();

    return () => {
      active = false;
    };
  }, [fetchPatches]);

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

    setSubmitting(true);
    setError('');

    try {
      if (editingPatch) {
        // Atualizar
        await api.put(`/patch-notes/${editingPatch.id}`, {
          title: title.trim(),
          content: content.trim(),
        });
        showToast('Nota de atualização editada com sucesso!', 'success');
      } else {
        // Criar
        await api.post('/patch-notes', {
          title: title.trim(),
          content: content.trim(),
        });
        showToast('Nota de atualização publicada com sucesso!', 'success');
      }
      setFormOpen(false);
      fetchPatches();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Erro ao salvar nota de atualização.';
      setError(msg);
    } finally {
      setSubmitting(false);
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
      await api.delete(`/patch-notes/${deleteId}`);
      showToast('Nota de atualização excluída com sucesso.', 'success');
      setDeleteId(null);
      fetchPatches();
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
        {user?.is_admin && (
          <Button onClick={handleCreateClick}>
            Publicar Novo Patch
          </Button>
        )}
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
                <div 
                  className={styles.content}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(patch.content) }}
                />
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
