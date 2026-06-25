import styles from '@/GameGrid.module.css';

interface Props {
  children: React.ReactNode;
}

export default function GameGrid({ children }: Props) {
  return (
    <div className={styles.grid}>
      {children}
    </div>
  );
}