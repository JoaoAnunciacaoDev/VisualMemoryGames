interface GameWithCovers {
  cover_url?: string | null;
  custom_cover_url?: string | null;
}

export const getBestGameCover = (game: GameWithCovers): string | undefined => {
  console.log('getBestGameCover called with game:', game);
  console.log('custom_cover_url:', game.custom_cover_url);
  console.log('cover_url:', game.cover_url);
  if (game.custom_cover_url) {
    console.log('Using custom cover for game:', game);
    return resolveImageUrl(game.custom_cover_url);
  }
  
  if (game.cover_url) {
    console.log('Using default cover for game:', game);
    return resolveImageUrl(game.cover_url);
  }
  
  return undefined; 
};

export function resolveImageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `http://localhost:8000${url}`;
}