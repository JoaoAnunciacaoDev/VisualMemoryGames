export const STORE_OPTIONS = [
  {label: 'Steam', value: 'STEAM'},
  {label: 'Epic Games', value: 'EPIC'},
  {label: 'GOG', value: 'GOG'},
  {label: 'Itch.io', value: 'ITCH'},
  {label: 'PlayStation Store', value: 'PS_STORE'},
  {label: 'Xbox Store', value: 'XBOX'},
  {label: 'Nintendo eShop', value: 'NINTENDO'},
  {label: 'Google Play', value: 'GOOGLE_PLAY'},
  {label: 'App Store', value: 'APP_STORE'},
  {label: 'Mídia Física', value: 'PHYSICAL'},
  {label: 'Outro', value: 'OTHER'},
];

export type Store = typeof STORE_OPTIONS[number]['value'];