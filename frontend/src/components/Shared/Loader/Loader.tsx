import styles from './Loader.module.css';

interface LoaderProps {
  message?: string;
  minHeight?: string;
}

export default function Loader({ message = 'Carregando...', minHeight }: LoaderProps) {
  return (
    <div className={styles.loadingContainer} style={minHeight ? { minHeight } : undefined} role="status">
      <div className={styles.loader}></div>
      <p>{message}</p>
    </div>
  );
}
