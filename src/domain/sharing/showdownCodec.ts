import {
  BATTLE_GIMMICK,
  LEVEL_BOUNDS,
  MAX_MOVES_PER_MEMBER,
  POKEMON_GENDER,
  TEAM_SIZE,
} from '@/domain/constants';
import { createEmptyTeam } from '@/domain/team';
import type {
  DexGateway,
  GameContext,
  PokemonGender,
  PokemonType,
  Team,
  TeamMember,
} from '@/domain/types';

export interface ShowdownImportResult {
  team: Team;
  warnings: readonly string[];
}

/**
 * Exports a 6-slot team into standard Pokémon Showdown paste format.
 */
export function exportTeamToShowdown(team: Team, context: GameContext, dex: DexGateway): string {
  const blocks: string[] = [];

  for (const slot of team) {
    if (!slot) continue;
    const species = dex.getSpecies(slot.speciesSlug, context.generation);
    if (!species) continue;

    const lines: string[] = [];
    const displayName = slot.nickname ? `${slot.nickname} (${species.name})` : species.name;
    const genderSuffix =
      slot.gender === POKEMON_GENDER.Male || slot.gender === POKEMON_GENDER.Female
        ? ` (${slot.gender})`
        : '';

    let itemSuffix = '';
    if (context.mechanics.hasHeldItems && slot.itemSlug) {
      const item = dex.getItem(slot.itemSlug, context.generation);
      if (item) itemSuffix = ` @ ${item.name}`;
    }
    lines.push(`${displayName}${genderSuffix}${itemSuffix}`);

    if (context.mechanics.hasAbilities && slot.abilitySlug) {
      const ability = dex.getAbility(slot.abilitySlug, context.generation);
      if (ability) lines.push(`Ability: ${ability.name}`);
    }

    if (slot.level !== undefined) {
      lines.push(`Level: ${slot.level}`);
    }

    if (slot.shiny) {
      lines.push('Shiny: Yes');
    }

    if (context.mechanics.gimmick === BATTLE_GIMMICK.Terastal && slot.teraType) {
      lines.push(`Tera Type: ${slot.teraType}`);
    }

    if (context.mechanics.hasNatures && slot.natureId) {
      const nature = dex.getNature(slot.natureId, context.generation);
      if (nature) lines.push(`${nature.name} Nature`);
    }

    for (const moveSlug of slot.moveSlugs) {
      const move = dex.getMove(moveSlug, context.generation);
      if (move) lines.push(`- ${move.name}`);
    }

    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}

function parseHeaderLine(headerLine: string): {
  speciesName: string;
  nickname?: string;
  gender?: PokemonGender;
  itemName?: string;
} {
  const atIndex = headerLine.lastIndexOf(' @ ');
  const rawLeft = atIndex >= 0 ? headerLine.slice(0, atIndex).trim() : headerLine.trim();
  const itemName = atIndex >= 0 ? headerLine.slice(atIndex + 3).trim() : undefined;

  const genderMatch = /\s+\((M|F)\)$/i.exec(rawLeft);
  const gender = genderMatch?.[1] ? (genderMatch[1].toUpperCase() as 'M' | 'F') : undefined;
  const withoutGender = rawLeft.replace(/\s+\((M|F)\)$/i, '').trim();

  // Check for "Nickname (Species)"
  const parenMatch = /^(.+?)\s+\(([^()]+)\)$/.exec(withoutGender);
  if (parenMatch?.[1] && parenMatch[2]) {
    return {
      nickname: parenMatch[1].trim(),
      speciesName: parenMatch[2].trim(),
      ...(gender ? { gender } : {}),
      ...(itemName ? { itemName } : {}),
    };
  }

  return {
    speciesName: withoutGender,
    ...(gender ? { gender } : {}),
    ...(itemName ? { itemName } : {}),
  };
}

/**
 * Imports up to 6 Pokémon from a standard Pokémon Showdown paste into a Team.
 * Unrecognized species or moves generate non-fatal warnings.
 */
export function importTeamFromShowdown(
  pasteText: string,
  context: GameContext,
  dex: DexGateway,
): ShowdownImportResult {
  const team = createEmptyTeam();
  const warnings: string[] = [];

  const blocks = pasteText
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, TEAM_SIZE);

  let slotIndex = 0;

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const header = lines[0];
    if (!header) continue;

    const { speciesName, nickname, gender, itemName } = parseHeaderLine(header);
    const species = dex.getSpecies(speciesName, context.generation);
    if (!species) {
      warnings.push(`Unknown species "${speciesName}" for generation ${context.generation}.`);
      continue;
    }

    let abilitySlug: string | undefined;
    let itemSlug: string | undefined;
    let natureId: string | undefined;
    let teraType: PokemonType | undefined;
    let level: number | undefined;
    let shiny = false;
    const moveSlugs: string[] = [];

    if (itemName && context.mechanics.hasHeldItems) {
      const item = dex.getItem(itemName, context.generation);
      if (item) {
        itemSlug = item.slug;
      } else {
        warnings.push(`Unknown item "${itemName}" for ${species.name}.`);
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (line.startsWith('Ability:') && context.mechanics.hasAbilities) {
        const abilityName = line.slice('Ability:'.length).trim();
        const ability = dex.getAbility(abilityName, context.generation);
        if (ability) abilitySlug = ability.slug;
        else warnings.push(`Unknown ability "${abilityName}" for ${species.name}.`);
      } else if (line.startsWith('Level:')) {
        const parsedLevel = Number.parseInt(line.slice('Level:'.length).trim(), 10);
        if (
          Number.isFinite(parsedLevel) &&
          parsedLevel >= LEVEL_BOUNDS.min &&
          parsedLevel <= LEVEL_BOUNDS.max
        ) {
          level = parsedLevel;
        }
      } else if (/^Shiny:\s*Yes$/i.test(line)) {
        shiny = true;
      } else if (
        line.startsWith('Tera Type:') &&
        context.mechanics.gimmick === BATTLE_GIMMICK.Terastal
      ) {
        const rawTera = line.slice('Tera Type:'.length).trim();
        const availableTypes = dex.getAvailableTypes(context.generation);
        const matchType = availableTypes.find((t) => t.toLowerCase() === rawTera.toLowerCase());
        if (matchType) teraType = matchType;
      } else if (line.endsWith(' Nature') && context.mechanics.hasNatures) {
        const rawNature = line.slice(0, -' Nature'.length).trim();
        const nature = dex.getNature(rawNature, context.generation);
        if (nature) natureId = nature.id;
      } else if (line.startsWith('- ') && moveSlugs.length < MAX_MOVES_PER_MEMBER) {
        const moveName = line.slice(2).trim();
        const move = dex.getMove(moveName, context.generation);
        if (move) moveSlugs.push(move.slug);
        else warnings.push(`Unknown move "${moveName}" for ${species.name}.`);
      }
    }

    const member: TeamMember = {
      speciesSlug: species.slug,
      moveSlugs,
      ...(abilitySlug ? { abilitySlug } : {}),
      ...(itemSlug ? { itemSlug } : {}),
      ...(natureId ? { natureId } : {}),
      ...(teraType ? { teraType } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(nickname ? { nickname } : {}),
      ...(gender && species.availableGenders.includes(gender) ? { gender } : {}),
      ...(shiny ? { shiny: true } : {}),
    };

    team[slotIndex] = member;
    slotIndex += 1;
  }

  return { team, warnings };
}
