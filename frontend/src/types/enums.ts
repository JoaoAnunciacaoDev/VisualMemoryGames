export const STORE_OPTIONS = [
  { label: 'Steam', value: 'STEAM' },
  { label: 'Epic Games', value: 'EPIC' },
  { label: 'GOG', value: 'GOG' },
  { label: 'Itch.io', value: 'ITCH' },
  { label: 'PlayStation Store', value: 'PS_STORE' },
  { label: 'Xbox Store', value: 'XBOX' },
  { label: 'Nintendo eShop', value: 'NINTENDO' },
  { label: 'EA App', value: 'EA_APP' },
  { label: 'Ubisoft Connect', value: 'UBISOFT' },
  { label: 'Amazon Games', value: 'AMAZON' },
  { label: 'Google Play', value: 'GOOGLE_PLAY' },
  { label: 'App Store', value: 'APP_STORE' },
  { label: 'Mídia Física', value: 'PHYSICAL' },
  { label: 'Outro', value: 'OTHER' },
];

export type Store = typeof STORE_OPTIONS[number]['value'];

const STORE_ALIASES: Record<string, Store> = {
  PLAYSTATION: 'PS_STORE',
  PLAYSTATION_STORE: 'PS_STORE',
  PSN: 'PS_STORE',
};

export function normalizeStoreKey(storeKey: string): string {
  const normalized = storeKey.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const enumValue = normalized.slice(normalized.lastIndexOf('.') + 1);
  return STORE_ALIASES[enumValue] ?? enumValue;
}

export function getStoreLabel(storeKey: string | null | undefined): string {
  if (!storeKey) return '';
  const u = normalizeStoreKey(storeKey);
  const option = STORE_OPTIONS.find(
    (opt) => opt.value === u || normalizeStoreKey(opt.label) === u
  );
  return option ? option.label : storeKey;
}

export function isStoreMatch(gameStore: string | null | undefined, filterStore: string): boolean {
  if (!filterStore || filterStore === 'Todas') return true;
  if (!gameStore) return filterStore === 'Outra' || filterStore === 'Outro';

  const gUpper = normalizeStoreKey(gameStore);
  const fUpper = normalizeStoreKey(filterStore);

  if (gUpper === fUpper) return true;

  const findOption = (str: string) =>
    STORE_OPTIONS.find(
      (opt) =>
        normalizeStoreKey(opt.label) === str ||
        opt.value === str ||
        normalizeStoreKey(opt.label).startsWith(str) ||
        str.startsWith(normalizeStoreKey(opt.label))
    );

  const filterOption = findOption(fUpper);
  if (filterOption) {
    const gameOption = findOption(gUpper);
    if (gameOption && gameOption.value === filterOption.value) return true;
    return gUpper === filterOption.value || gUpper === normalizeStoreKey(filterOption.label);
  }

  if (filterStore === 'Outra' || filterStore === 'Outro') {
    const isKnown = STORE_OPTIONS.some(
      (opt) =>
        gUpper === opt.value ||
        gUpper === normalizeStoreKey(opt.label)
    );
    return !isKnown;
  }

  return false;
}
