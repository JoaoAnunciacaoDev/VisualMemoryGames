import styles from '@/pages/TierList/TierList.module.css';
import type { TierListSummary } from '@/types';
import TierListCard from '@/pages/TierList/TierListCard';

interface Props {
  tierLists: TierListSummary[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TierListGrid({ tierLists, onOpen, onDelete }: Props) {
  return (
    <div className={styles.grid}>
      {tierLists.map((tierList) => (
        <TierListCard key={tierList.id} tierList={tierList} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}