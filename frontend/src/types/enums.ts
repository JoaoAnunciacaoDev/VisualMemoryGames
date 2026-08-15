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

export function getStoreLabel(storeKey: string | null | undefined): string {
  if (!storeKey) return '';
  const u = storeKey.trim().toUpperCase();
  const option = STORE_OPTIONS.find(
    (opt) => opt.value.toUpperCase() === u || opt.label.toUpperCase() === u
  );
  return option ? option.label : storeKey;
}

export function isStoreMatch(gameStore: string | null | undefined, filterStore: string): boolean {
  if (!filterStore || filterStore === 'Todas') return true;
  if (!gameStore) return filterStore === 'Outra' || filterStore === 'Outro';

  const gUpper = gameStore.trim().toUpperCase();
  const fUpper = filterStore.trim().toUpperCase();

  if (gUpper === fUpper) return true;

  const findOption = (str: string) =>
    STORE_OPTIONS.find(
      (opt) =>
        opt.label.toUpperCase() === str ||
        opt.value.toUpperCase() === str ||
        opt.label.toUpperCase().startsWith(str) ||
        str.startsWith(opt.label.toUpperCase())
    );

  const filterOption = findOption(fUpper);
  if (filterOption) {
    const gameOption = findOption(gUpper);
    if (gameOption && gameOption.value === filterOption.value) return true;
    return gUpper === filterOption.value.toUpperCase() || gUpper === filterOption.label.toUpperCase();
  }

  if (filterStore === 'Outra' || filterStore === 'Outro') {
    const isKnown = STORE_OPTIONS.some(
      (opt) =>
        gUpper === opt.value.toUpperCase() ||
        gUpper === opt.label.toUpperCase()
    );
    return !isKnown;
  }

  return false;
}