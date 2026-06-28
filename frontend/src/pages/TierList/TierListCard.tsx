import styles from '@/pages/TierList/TierList.module.css';
import type { TierListSummary } from '@/types';

interface Props {
  tierList: TierListSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TierListCard({ tierList, onOpen, onDelete }: Props) {
  return (
    <div className={styles.card}>
      <div
        className={styles.cardPreview}
        onClick={() => onOpen(tierList.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(tierList.id);
          }
        }}
        aria-label={`Abrir tier list ${tierList.title}`}
      >
        {tierList.categories
          .filter((category) => category.name !== '__pool__')
          .slice(0, 5)
          .map((category) => (
            <div key={category.id} className={styles.previewTier} style={{ backgroundColor: category.color }}>
              <span className={styles.previewLabel}>{category.name}</span>
              <span className={styles.previewCount}>{category.items.length} jogos</span>
            </div>
          ))}
      </div>
      <div className={styles.cardFooter}>
        <button
          type="button"
          className={styles.cardTitle}
          onClick={() => onOpen(tierList.id)}
        >
          {tierList.title}
        </button>
        <button type="button" className={styles.deleteButton} onClick={() => onDelete(tierList.id)} title="Deletar">
          🗑
        </button>
      </div>
    </div>
  );
}