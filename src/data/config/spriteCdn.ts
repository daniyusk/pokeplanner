import type { PokemonGender } from '@/domain/types';

export const SPRITE_CDN = {
  showdownSpritesBase: 'https://play.pokemonshowdown.com/sprites',
  pokeApiOfficialArtworkBase:
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork',
} as const;

export function buildPokemonSpriteUrls(
  spriteId: string,
  dexNumber: number,
  shiny: boolean,
  gender: PokemonGender | undefined,
  variant: 'home' | 'dex',
): string[] {
  const tryFemale = gender === 'F' && !spriteId.endsWith('-f');
  const homeDir = shiny ? 'home-shiny' : 'home';
  const dexDir = shiny ? 'dex-shiny' : 'dex';

  const homeUrls = tryFemale
    ? [
        `${SPRITE_CDN.showdownSpritesBase}/${homeDir}/${spriteId}-f.png`,
        `${SPRITE_CDN.showdownSpritesBase}/${homeDir}/${spriteId}.png`,
      ]
    : [`${SPRITE_CDN.showdownSpritesBase}/${homeDir}/${spriteId}.png`];

  const dexUrls = tryFemale
    ? [
        `${SPRITE_CDN.showdownSpritesBase}/${dexDir}/${spriteId}-f.png`,
        `${SPRITE_CDN.showdownSpritesBase}/${dexDir}/${spriteId}.png`,
      ]
    : [`${SPRITE_CDN.showdownSpritesBase}/${dexDir}/${spriteId}.png`];

  const pokeApiUrl = shiny
    ? `${SPRITE_CDN.pokeApiOfficialArtworkBase}/shiny/${dexNumber}.png`
    : `${SPRITE_CDN.pokeApiOfficialArtworkBase}/${dexNumber}.png`;

  const primaryUrls = variant === 'dex' ? [...dexUrls, ...homeUrls] : [...homeUrls, ...dexUrls];
  const urls = [...primaryUrls, pokeApiUrl];

  if (shiny) {
    urls.push(`${SPRITE_CDN.showdownSpritesBase}/${variant}/${spriteId}.png`);
  }

  return urls;
}
