import { create } from 'zustand';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { loadGameManifest } from '@/data/games/gameLoader';
import {
  deleteSavedTeamRecord,
  listSavedTeams,
  type SavedTeamRecord,
  saveTeamRecord,
} from '@/data/storage/teamStorage';
import type { ShareableTeamState } from '@/domain/sharing';
import {
  createEmptyTeam,
  findFirstEmptySlotIndex,
  resolveGenderFormeTarget,
  sanitizeTeamForContext,
  swapTeamSlots,
  withTeamSlot,
} from '@/domain/team';
import {
  createFreeModeContext,
  type GameContext,
  type GameManifest,
  type GenerationNumber,
  type Team,
  type TeamMember,
  type TeamSlotIndex,
} from '@/domain/types';
import { generateEntityId } from './idGenerator';
import {
  buildCampaignContext,
  buildCampaignLoadState,
  buildFreeLoadState,
  buildMemberFromSpecies,
  getScopeKey,
  resolveScopedSnapshot,
  type ScopedTeamSnapshot,
} from './teamTransitions';

export type { ScopedTeamSnapshot };

export type TeamMemberPatch = {
  [K in keyof TeamMember]?: TeamMember[K] | undefined;
};

export interface TeamStoreState {
  context: GameContext;
  activeManifest: GameManifest | null;
  excludeTradeEvolutions: boolean;
  onlyCatchableInGame: boolean;

  teamsByScope: Record<string, ScopedTeamSnapshot>;
  teamName: string;
  team: Team;
  editingSlotIndex: TeamSlotIndex | null;
  savedTeams: SavedTeamRecord[];
  isStorageLoaded: boolean;

  setGeneration: (generation: GenerationNumber) => void;
  selectCampaignGame: (manifest: GameManifest, versionId?: string) => void;
  setVersionId: (versionId: string) => void;
  setExcludeTradeEvolutions: (value: boolean) => void;
  setOnlyCatchableInGame: (value: boolean) => void;

  setTeamName: (name: string) => void;
  selectFreeMode: () => void;
  setSlotSpecies: (slotIndex: TeamSlotIndex, speciesSlug: string) => void;
  addSpeciesToTeam: (speciesSlug: string) => void;
  toggleSlotGender: (slotIndex: TeamSlotIndex) => void;
  toggleSlotShiny: (slotIndex: TeamSlotIndex) => void;
  updateSlotMember: (slotIndex: TeamSlotIndex, patch: TeamMemberPatch) => void;
  clearSlot: (slotIndex: TeamSlotIndex) => void;
  swapSlots: (fromIndex: TeamSlotIndex, toIndex: TeamSlotIndex) => void;
  resetTeam: () => void;
  openEditor: (slotIndex: TeamSlotIndex) => void;
  closeEditor: () => void;
  hydrateFromSharedState: (shared: ShareableTeamState) => Promise<void>;
  hydrateTeam: (team: Team) => void;
  loadSavedTeams: () => Promise<void>;
  saveCurrentTeam: (customName?: string) => Promise<SavedTeamRecord>;
  loadSavedTeam: (id: string) => Promise<void>;
  deleteSavedTeam: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamStoreState>((set, get) => ({
  context: createFreeModeContext(9),
  activeManifest: null,
  excludeTradeEvolutions: true,
  onlyCatchableInGame: true,

  teamsByScope: {},
  teamName: '',
  team: createEmptyTeam(),
  editingSlotIndex: null,
  savedTeams: [],
  isStorageLoaded: false,

  setGeneration(generation) {
    const nextContext = createFreeModeContext(generation, generation === 9);
    const nextTeam = sanitizeTeamForContext(get().team, nextContext, pkmnDexGateway);
    set({
      context: nextContext,
      activeManifest: null,
      team: nextTeam,
    });
  },

  selectFreeMode() {
    const { context, team, teamName, teamsByScope } = get();
    const nextContext = createFreeModeContext(9, true);
    const { updatedScopes, restored } = resolveScopedSnapshot(
      context,
      team,
      teamName,
      teamsByScope,
      nextContext,
    );

    set({
      ...buildFreeLoadState(9, restored.team, restored.teamName),
      teamsByScope: updatedScopes,
    });
  },

  selectCampaignGame(manifest, versionId) {
    const { context, team, teamName, teamsByScope } = get();
    const nextContext = buildCampaignContext(manifest, versionId);
    const { updatedScopes, restored } = resolveScopedSnapshot(
      context,
      team,
      teamName,
      teamsByScope,
      nextContext,
    );

    set({
      ...buildCampaignLoadState(manifest, restored.team, restored.teamName, versionId),
      teamsByScope: updatedScopes,
    });
  },

  setVersionId(versionId) {
    const { context } = get();
    if (context.mode !== 'campaign') return;
    set({
      context: {
        ...context,
        versionId,
      },
    });
  },

  setExcludeTradeEvolutions(value) {
    set({ excludeTradeEvolutions: value });
  },

  setOnlyCatchableInGame(value) {
    set({ onlyCatchableInGame: value });
  },

  setTeamName(name) {
    set({ teamName: name });
  },

  setSlotSpecies(slotIndex, speciesSlug) {
    const { context, team } = get();
    const nextMember = buildMemberFromSpecies(speciesSlug, context, team[slotIndex]);
    if (!nextMember) return;

    set({ team: withTeamSlot(team, slotIndex, nextMember) });
  },

  addSpeciesToTeam(speciesSlug) {
    const emptyIndex = findFirstEmptySlotIndex(get().team);
    if (emptyIndex !== -1) {
      get().setSlotSpecies(emptyIndex, speciesSlug);
    }
  },

  toggleSlotGender(slotIndex) {
    const { context, team } = get();
    const current = team[slotIndex];
    if (!current) return;
    const species = pkmnDexGateway.getSpecies(current.speciesSlug, context.generation);
    if (!species) return;

    if (species.availableGenders.length === 1) {
      const altForme = resolveGenderFormeTarget(species, context.generation, pkmnDexGateway);
      if (altForme) {
        const nextGender = altForme.availableGenders[0];
        set({
          team: withTeamSlot(team, slotIndex, {
            ...current,
            speciesSlug: altForme.slug,
            ...(nextGender ? { gender: nextGender } : {}),
          }),
        });
        return;
      }

      const fixedGender = species.availableGenders[0];
      if (fixedGender && current.gender !== fixedGender) {
        get().updateSlotMember(slotIndex, { gender: fixedGender });
      }
      return;
    }

    const currentGender = current.gender ?? species.availableGenders[0] ?? 'M';
    const currentIdx = species.availableGenders.indexOf(currentGender);
    const nextGender =
      species.availableGenders[(currentIdx + 1) % species.availableGenders.length] ??
      species.availableGenders[0];
    if (nextGender) {
      get().updateSlotMember(slotIndex, { gender: nextGender });
    }
  },

  toggleSlotShiny(slotIndex) {
    const current = get().team[slotIndex];
    if (!current) return;
    get().updateSlotMember(slotIndex, { shiny: current.shiny ? undefined : true });
  },

  updateSlotMember(slotIndex, patch) {
    const team = get().team;
    const current = team[slotIndex];
    if (!current) return;

    const abilitySlug = 'abilitySlug' in patch ? patch.abilitySlug : current.abilitySlug;
    const itemSlug = 'itemSlug' in patch ? patch.itemSlug : current.itemSlug;
    const natureId = 'natureId' in patch ? patch.natureId : current.natureId;
    const teraType = 'teraType' in patch ? patch.teraType : current.teraType;
    const level = 'level' in patch ? patch.level : current.level;
    const nickname = 'nickname' in patch ? patch.nickname : current.nickname;
    const gender = 'gender' in patch ? patch.gender : current.gender;
    const shiny = 'shiny' in patch ? patch.shiny : current.shiny;

    const nextMember: TeamMember = {
      speciesSlug: patch.speciesSlug ?? current.speciesSlug,
      moveSlugs: patch.moveSlugs ?? current.moveSlugs,
      ...(abilitySlug ? { abilitySlug } : {}),
      ...(itemSlug ? { itemSlug } : {}),
      ...(natureId ? { natureId } : {}),
      ...(teraType ? { teraType } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(nickname ? { nickname } : {}),
      ...(gender ? { gender } : {}),
      ...(shiny ? { shiny: true } : {}),
    };

    set({ team: withTeamSlot(team, slotIndex, nextMember) });
  },

  clearSlot(slotIndex) {
    const editingSlotIndex = get().editingSlotIndex === slotIndex ? null : get().editingSlotIndex;
    set({ team: withTeamSlot(get().team, slotIndex, null), editingSlotIndex });
  },

  swapSlots(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    set({ team: swapTeamSlots(get().team, fromIndex, toIndex) });
  },

  resetTeam() {
    const { context, teamsByScope } = get();
    const empty = createEmptyTeam();
    const scopeKey = getScopeKey(context);
    set({
      team: empty,
      teamName: '',
      teamsByScope: {
        ...teamsByScope,
        [scopeKey]: { team: empty, teamName: '' },
      },
      editingSlotIndex: null,
    });
  },

  openEditor(slotIndex) {
    if (!get().team[slotIndex]) return;
    set({ editingSlotIndex: slotIndex });
  },

  closeEditor() {
    set({ editingSlotIndex: null });
  },

  async hydrateFromSharedState(shared) {
    if (shared.mode === 'campaign' && shared.gameId) {
      const manifest = await loadGameManifest(shared.gameId);
      if (manifest) {
        set(buildCampaignLoadState(manifest, shared.team, shared.teamName ?? '', shared.versionId));
        return;
      }
    }

    set(buildFreeLoadState(shared.generation, shared.team, shared.teamName ?? ''));
  },

  hydrateTeam(team) {
    const { context } = get();
    const sanitized = sanitizeTeamForContext(team, context, pkmnDexGateway);
    set({ team: sanitized });
  },

  async loadSavedTeams() {
    const savedTeams = await listSavedTeams();
    set({ savedTeams, isStorageLoaded: true });
  },

  async saveCurrentTeam(customName) {
    const { context, team, teamName } = get();
    const resolvedName =
      customName?.trim() ||
      teamName.trim() ||
      (context.mode === 'campaign' ? `${context.gameId} Run` : 'Free Mode Team');

    const record: SavedTeamRecord = {
      id: generateEntityId('team'),
      name: resolvedName,
      updatedAt: new Date().toISOString(),
      mode: context.mode,
      generation: context.generation,
      ...(context.mode === 'campaign' ? { gameId: context.gameId } : {}),
      ...(context.mode === 'campaign' && context.versionId ? { versionId: context.versionId } : {}),
      team,
    };

    const savedTeams = await saveTeamRecord(record);
    set({ savedTeams, teamName: resolvedName });
    return record;
  },

  async loadSavedTeam(id) {
    const target = get().savedTeams.find((item) => item.id === id);
    if (!target) return;

    if (target.mode === 'campaign' && target.gameId) {
      const manifest = await loadGameManifest(target.gameId);
      if (manifest) {
        set(buildCampaignLoadState(manifest, target.team, target.name, target.versionId));
        return;
      }
    }

    set(buildFreeLoadState(target.generation, target.team, target.name));
  },

  async deleteSavedTeam(id) {
    const savedTeams = await deleteSavedTeamRecord(id);
    set({ savedTeams });
  },
}));
