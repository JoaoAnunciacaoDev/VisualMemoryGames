import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import styles from './Layout.module.css';

interface Props {
  children: React.ReactNode;
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