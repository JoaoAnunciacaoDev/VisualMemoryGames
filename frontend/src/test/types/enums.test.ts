import { describe, expect, it } from 'vitest';
import { getStoreLabel, normalizeStoreKey } from '@/types/enums';

describe('store enums', () => {
  it.each([
    ['PS_STORE', 'PlayStation Store'],
    ['playstation store', 'PlayStation Store'],
    ['PLAYSTATION', 'PlayStation Store'],
    ['Store.PS_STORE', 'PlayStation Store'],
  ])('formats %s as %s', (value, expected) => {
    expect(getStoreLabel(value)).toBe(expected);
  });

  it('normalizes known aliases to the persisted store key', () => {
    expect(normalizeStoreKey('PSN')).toBe('PS_STORE');
  });
});
