import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LibraryActiveFilters from '@/pages/Library/LibraryActiveFilters';
import type { LibraryFiltersProps } from '@/pages/Library/LibraryFilters.types';

function createProps(): LibraryFiltersProps {
  return {
    search: '', onSearchChange: vi.fn(),
    statusFilter: 'Jogando', onStatusFilterChange: vi.fn(),
    storeFilter: 'Todas', onStoreFilterChange: vi.fn(),
    originFilter: 'all', onOriginFilterChange: vi.fn(),
    sortBy: null, onSortByChange: vi.fn(), sortOrder: 'asc', onSortOrderChange: vi.fn(),
    yearField: '', onYearFieldChange: vi.fn(), yearValue: '', onYearValueChange: vi.fn(),
    hoursOperator: '', onHoursOperatorChange: vi.fn(), hoursValue: '', onHoursValueChange: vi.fn(),
    hoursValueMax: '', onHoursValueMaxChange: vi.fn(), groupMode: 'none', onGroupModeChange: vi.fn(),
    statusOptions: [], storeOptions: [], onClearAllFilters: vi.fn(),
  };
}

describe('LibraryActiveFilters', () => {
  it('shows active filters and removes them independently', () => {
    const props = createProps();
    render(<LibraryActiveFilters {...props} />);
    expect(screen.getByText('Status: Jogando')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Status: Jogando' }));
    expect(props.onStatusFilterChange).toHaveBeenCalledWith('Todos');
  });

  it('does not show clear action without active filters', () => {
    const props = createProps();
    props.statusFilter = 'Todos';
    render(<LibraryActiveFilters {...props} />);
    expect(screen.queryByRole('button', { name: 'Limpar tudo' })).not.toBeInTheDocument();
  });
});
