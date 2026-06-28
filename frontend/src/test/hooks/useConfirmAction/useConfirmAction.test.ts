import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmAction } from '@/hooks/useConfirmAction';

describe('useConfirmAction', () => {
  it('começa fechado e sem target', () => {
    const { result } = renderHook(() => useConfirmAction<string>());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.target).toBeNull();
  });

  it('abre com um target e fecha corretamente', () => {
    const { result } = renderHook(() => useConfirmAction<string>());
    act(() => result.current.open('id-123'));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.target).toBe('id-123');
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.target).toBeNull();
  });
});