interface GameWithCovers {
  cover_url?: string | null;
  custom_cover_url?: string | null;
}

export const getBestGameCover = (game: GameWithCovers): string | undefined => {
  if (game.custom_cover_url) {
    return resolveImageUrl(game.custom_cover_url);
  }
  
  if (game.cover_url) {
    return resolveImageUrl(game.cover_url);
  }
  
  return undefined; 
};

export function resolveImageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `http://localhost:8000${url}`;
}