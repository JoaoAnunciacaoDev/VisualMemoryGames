import { ReactNode } from 'react';
import styles from '@/components/GameGrid/GameGrid.module.css';

interface Props {
  children: ReactNode;
}

export default function GameGrid({ children }: Props) {
  return (
    <div className={styles.grid}>
      {children}
    </div>
  );
}