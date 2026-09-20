import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_OPTIONS, recentYears } from '@/utils/calendar';
import styles from './Social.module.css';

export function PeriodFilters({ month, year, disabled, onChange }: { month: number; year: number; disabled: boolean; onChange: (value: { month?: number; year?: number }) => void }) {
  return (
    <div className={styles.feedFilters}>
      <select aria-label="Filtrar por mês" className={styles.filterSelect} value={month} onChange={(event) => onChange({ month: Number(event.target.value) })} disabled={disabled}>
        {MONTH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <select aria-label="Filtrar por ano" className={styles.filterSelect} value={year} onChange={(event) => onChange({ year: Number(event.target.value) })} disabled={disabled}>
        {recentYears().map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>
  );
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export function SocialPagination({ currentPage, totalPages, onChange }: { currentPage: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)}><ChevronLeft aria-hidden="true" size={16} /> Anterior</button>
      {pageNumbers(currentPage, totalPages).map((page, index) => page === '...'
        ? <span key={`ellipsis-${index}`} className={styles.ellipsis}>…</span>
        : <button key={page} className={`${styles.pageBtn} ${page === currentPage ? styles.activePage : ''}`} onClick={() => onChange(page)} aria-current={page === currentPage ? 'page' : undefined}>{page}</button>)}
      <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => onChange(currentPage + 1)}>Próximo <ChevronRight aria-hidden="true" size={16} /></button>
    </nav>
  );
}
