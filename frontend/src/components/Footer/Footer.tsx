import { FaGithub, FaLinkedin } from 'react-icons/fa';
import styles from '@/components/Footer/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        © {new Date().getFullYear()} VisualMemory. Todos os direitos reservados.
      </p>
      <div className={styles.socials}>
        <p className={styles.text}>Por João Victor Anunciação da Silva</p>
        <a href="https://github.com/JoaoAnunciacaoDev" target="_blank" rel="noopener noreferrer" className={styles.link} aria-label="GitHub">
          <FaGithub size={20} />
        </a>
        <a href="https://linkedin.com/in/joao-victor-anunciacao" target="_blank" rel="noopener noreferrer" className={styles.link} aria-label="LinkedIn">
          <FaLinkedin size={20} />
        </a>
      </div>
    </footer>
  );
}