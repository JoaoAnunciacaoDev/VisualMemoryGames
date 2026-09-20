import type { SyntheticEvent } from 'react';
import { Button, Input, Modal } from '@/components/Shared';
import type { PatchNote } from '@/features/patch-notes/queries';
import styles from './PatchNotes.module.css';

export default function PatchNoteFormModal({ open, editingPatch, title, content, error, submitting, onTitleChange, onContentChange, onSubmit, onClose }: {
  open: boolean; editingPatch: PatchNote | null; title: string; content: string; error: string; submitting: boolean;
  onTitleChange: (value: string) => void; onContentChange: (value: string) => void;
  onSubmit: (event: SyntheticEvent) => void; onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="600px">
      <form onSubmit={onSubmit} className={styles.form}>
        <h3 className={styles.modalTitle}>{editingPatch ? 'Editar Nota de Atualização' : 'Nova Nota de Atualização'}</h3>
        {error && <p className={styles.formError}>{error}</p>}
        <label className={styles.label}>Título do Patch<Input placeholder="Ex: Versão 1.2.0 - Correções na Biblioteca" value={title} onChange={(event) => onTitleChange(event.target.value)} required disabled={submitting} maxLength={200} /></label>
        <label className={styles.label}>Conteúdo<textarea className={`${styles.textarea} scrollbar-visualmemory`} placeholder="Descreva as alterações aplicadas..." value={content} onChange={(event) => onContentChange(event.target.value)} required disabled={submitting} rows={12} /></label>
        <div className={styles.formActions}><Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar Alterações'}</Button></div>
      </form>
    </Modal>
  );
}
