import { ReactNode } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from '@/components/Layout/Layout.module.css';

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        {children}
      </main>
      <Footer />
    </div>
  );
}