import ReviewMarkdown from '@/components/GameEditModal/ReviewMarkdown';
import type { PatchNote } from '@/features/patch-notes/queries';
import { formatDateTime } from '@/utils/date';
import styles from './PatchNotes.module.css';

const wasEdited = (patch: PatchNote) => new Date(patch.updated_at).getTime() - new Date(patch.created_at).getTime() > 1000;

export default function PatchNoteList({ patches, isAdmin, onEdit, onDelete }: { patches: PatchNote[]; isAdmin: boolean; onEdit: (patch: PatchNote) => void; onDelete: (patch: PatchNote) => void }) {
  if (patches.length === 0) return <p className={styles.emptyText}>Nenhuma nota de atualização publicada ainda.</p>;
  return (
    <div className={styles.patchList}>
      {patches.map((patch) => (
        <article key={patch.id} className={styles.patchCard}>
          <header className={styles.cardHeader}>
            <h2 className={styles.patchTitle}>{patch.title}</h2>
            <div className={styles.metaInfo}>Publicado por <strong>{patch.author?.username || 'Admin'}</strong> em {formatDateTime(patch.created_at)}{wasEdited(patch) && <span className={styles.editedText}> (Editado em {formatDateTime(patch.updated_at)})</span>}</div>
            {isAdmin && <div className={styles.adminActions}><button type="button" className={styles.actionBtn} onClick={() => onEdit(patch)}>Editar</button><button type="button" className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete(patch)}>Excluir</button></div>}
          </header>
          <div className={styles.cardBody}><ReviewMarkdown markdown={patch.content} className={styles.content} /></div>
        </article>
      ))}
    </div>
  );
}
