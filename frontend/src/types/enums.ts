export const STORE_OPTIONS = [
  {label: 'Steam', value: 'Steam'},
  {label: 'Epic Games', value: 'Epic Games'},
  {label: 'GOG', value: 'GOG'},
  {label: 'Itch.io', value: 'Itch.io'},
  {label: 'PlayStation Store', value: 'PlayStation Store'},
  {label: 'Xbox Store', value: 'Xbox Store'},
  {label: 'Nintendo eShop', value: 'Nintendo eShop'},
  {label: 'Google Play', value: 'Google Play'},
  {label: 'App Store', value: 'App Store'},
  {label: 'Mídia Física', value: 'Mídia Física'},
  {label: 'Outro', value: 'Outro'},
];

export type Store = typeof STORE_OPTIONS[number]['value'];