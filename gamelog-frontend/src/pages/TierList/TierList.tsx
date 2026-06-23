import Header from '../../components/Header/Header';
import TierListMaker from '../../components/TierListMaker/TierListMaker';
import styles from './TierList.module.css';

export default function TierList() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.mainContent}>
        <h2>Criar Tier List</h2>
        <TierListMaker />
      </main>
    </div>
  );
}