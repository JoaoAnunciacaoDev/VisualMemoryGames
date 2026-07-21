export interface PlatformOption {
  id: string;
  label: string;
}

export const STANDARD_PLATFORMS: PlatformOption[] = [
  { id: 'PC', label: 'PC' },
  { id: 'PlayStation 5', label: 'PlayStation 5' },
  { id: 'PlayStation 4', label: 'PlayStation 4' },
  { id: 'Xbox Series X/S', label: 'Xbox Series X/S' },
  { id: 'Xbox One', label: 'Xbox One' },
  { id: 'Nintendo Switch', label: 'Nintendo Switch' },
  { id: 'PlayStation 3', label: 'PlayStation 3' },
  { id: 'Xbox 360', label: 'Xbox 360' },
  { id: 'iOS', label: 'iOS' },
  { id: 'Android', label: 'Android' },
];

export function translatePlatform(platformId: string): string {
  const found = STANDARD_PLATFORMS.find((p) => p.id.toLowerCase() === platformId.toLowerCase());
  return found ? found.label : platformId;
}
