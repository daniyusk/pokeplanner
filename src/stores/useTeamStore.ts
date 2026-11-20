import { create } from 'zustand';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import {
  deleteSavedTeamRecord,
  listSavedTeams,
  type SavedTeamRecord,
  saveTeamRecord,
} from '@/data/storage/teamStorage';
import { createEmptyTeam, type ShareableTeamState } from '@/domain/sharing';
import {
  createFreeModeContext,
  type GameContext,
  type GenerationNumber,
  type Team,
  type TeamMember,
  type TeamSlot,
  type TeamSlotIndex,
} from '@/domain/types';

export type TeamMemberPatch = {
  [K in keyof TeamMember]?: TeamMember[K] | undefined;
};

export interface TeamStoreState {
  context: GameContext;
  teamName: string;
  team: Team;
  pickerSlotIndex: TeamSlotIndex | null;
  editingSlotIndex: TeamSlotIndex | null;
  savedTeams: SavedTeamRecord[];
  isStorageLoaded: boolean;

  setGeneration: (generation: GenerationNumber) => void;
  setTeamName: (name: string) => void;
  setSlotSpecies: (slotIndex: TeamSlotIndex, speciesSlug: string) => void;
  updateSlotMember: (slotIndex: TeamSlotIndex, patch: TeamMemberPatch) => void;
  clearSlot: (slotIndex: TeamSlotIndex) => void;
  swapSlots: (fromIndex: TeamSlotIndex, toIndex: TeamSlotIndex) => void;
  resetTeam: () => void;
  openPicker: (slotIndex: TeamSlotIndex) => void;
  closePicker: () => void;
  openEditor: (slotIndex: TeamSlotIndex) => void;
  closeEditor: () => void;
  hydrateFromSharedState: (shared: ShareableTeamState) => void;
  hydrateTeam: (team: Team) => void;
  loadSavedTeams: () => Promise<void>;
  saveCurrentTeam: (customName?: string) => Promise<SavedTeamRecord>;
  loadSavedTeam: (id: string) => void;
  deleteSavedTeam: (id: string) => Promise<void>;
}

function sanitizeSlotForContext(slot: TeamSlot, context: GameContext): TeamSlot {
  if (!slot) return null;
  const species = pkmnDexGateway.getSpecies(slot.speciesSlug, context.generation);
  if (!species) return null;

  const validMoves = slot.moveSlugs.filter((m) =>
    Boolean(pkmnDexGateway.getMove(m, context.generation)),
  );
  const validAbility =
    context.mechanics.hasAbilities && slot.abilitySlug
      ? (pkmnDexGateway.getAbility(slot.abilitySlug, context.generation)?.slug ??
        species.abilities[0])
      : context.mechanics.hasAbilities
        ? species.abilities[0]
        : undefined;

  const validItem =
    context.mechanics.hasHeldItems && slot.itemSlug
      ? pkmnDexGateway.getItem(slot.itemSlug, context.generation)?.slug
      : undefined;

  const validNature =
    context.mechanics.hasNatures && slot.natureId
      ? pkmnDexGateway.getNature(slot.natureId, context.generation)?.id
      : undefined;

  const validTera = context.mechanics.gimmick === 'terastal' ? slot.teraType : undefined;

  return {
    speciesSlug: species.slug,
    moveSlugs: validMoves,
    ...(validAbility ? { abilitySlug: validAbility } : {}),
    ...(validItem ? { itemSlug: validItem } : {}),
    ...(validNature ? { natureId: validNature } : {}),
    ...(validTera ? { teraType: validTera } : {}),
    ...(slot.level !== undefined ? { level: slot.level } : {}),
    ...(slot.nickname ? { nickname: slot.nickname } : {}),
  };
}

export const useTeamStore = create<TeamStoreState>((set, get) => ({
  context: createFreeModeContext(9),
  teamName: '',
  team: createEmptyTeam(),
  pickerSlotIndex: null,
  editingSlotIndex: null,
  savedTeams: [],
  isStorageLoaded: false,

  setGeneration(generation) {
    const nextContext = createFreeModeContext(generation);
    const currentTeam = get().team;
    const nextTeam: Team = [
      sanitizeSlotForContext(currentTeam[0], nextContext),
      sanitizeSlotForContext(currentTeam[1], nextContext),
      sanitizeSlotForContext(currentTeam[2], nextContext),
      sanitizeSlotForContext(currentTeam[3], nextContext),
      sanitizeSlotForContext(currentTeam[4], nextContext),
      sanitizeSlotForContext(currentTeam[5], nextContext),
    ];
    set({ context: nextContext, team: nextTeam });
  },

  setTeamName(name) {
    set({ teamName: name });
  },

  setSlotSpecies(slotIndex, speciesSlug) {
    const { context, team } = get();
    const species = pkmnDexGateway.getSpecies(speciesSlug, context.generation);
    if (!species) return;

    const current = team[slotIndex];
    const isSameBaseSpecies = current
      ? pkmnDexGateway.getSpecies(current.speciesSlug, context.generation)?.baseSpeciesSlug ===
        species.baseSpeciesSlug
      : false;

    const defaultAbility = context.mechanics.hasAbilities ? species.abilities[0] : undefined;
    const nextMember: TeamMember = {
      speciesSlug: species.slug,
      moveSlugs: isSameBaseSpecies && current ? current.moveSlugs : [],
      ...(defaultAbility ? { abilitySlug: defaultAbility } : {}),
      ...(isSameBaseSpecies && current?.itemSlug ? { itemSlug: current.itemSlug } : {}),
      ...(isSameBaseSpecies && current?.natureId ? { natureId: current.natureId } : {}),
      ...(isSameBaseSpecies && current?.teraType ? { teraType: current.teraType } : {}),
      ...(isSameBaseSpecies && current?.nickname ? { nickname: current.nickname } : {}),
    };

    const nextTeam = [...team] as Team;
    nextTeam[slotIndex] = nextMember;
    set({ team: nextTeam, pickerSlotIndex: null });
  },

  updateSlotMember(slotIndex, patch) {
    const team = [...get().team] as Team;
    const current = team[slotIndex];
    if (!current) return;

    const abilitySlug = 'abilitySlug' in patch ? patch.abilitySlug : current.abilitySlug;
    const itemSlug = 'itemSlug' in patch ? patch.itemSlug : current.itemSlug;
    const natureId = 'natureId' in patch ? patch.natureId : current.natureId;
    const teraType = 'teraType' in patch ? patch.teraType : current.teraType;
    const level = 'level' in patch ? patch.level : current.level;
    const nickname = 'nickname' in patch ? patch.nickname : current.nickname;

    const nextMember: TeamMember = {
      speciesSlug: patch.speciesSlug ?? current.speciesSlug,
      moveSlugs: patch.moveSlugs ?? current.moveSlugs,
      ...(abilitySlug ? { abilitySlug } : {}),
      ...(itemSlug ? { itemSlug } : {}),
      ...(natureId ? { natureId } : {}),
      ...(teraType ? { teraType } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(nickname ? { nickname } : {}),
    };

    team[slotIndex] = nextMember;
    set({ team });
  },

  clearSlot(slotIndex) {
    const team = [...get().team] as Team;
    team[slotIndex] = null;
    const editingSlotIndex = get().editingSlotIndex === slotIndex ? null : get().editingSlotIndex;
    set({ team, editingSlotIndex });
  },

  swapSlots(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const team = [...get().team] as Team;
    const temp = team[fromIndex];
    team[fromIndex] = team[toIndex];
    team[toIndex] = temp;
    set({ team });
  },

  resetTeam() {
    set({
      team: createEmptyTeam(),
      teamName: '',
      editingSlotIndex: null,
      pickerSlotIndex: null,
    });
  },

  openPicker(slotIndex) {
    set({ pickerSlotIndex: slotIndex });
  },

  closePicker() {
    set({ pickerSlotIndex: null });
  },

  openEditor(slotIndex) {
    if (!get().team[slotIndex]) return;
    set({ editingSlotIndex: slotIndex });
  },

  closeEditor() {
    set({ editingSlotIndex: null });
  },

  hydrateFromSharedState(shared) {
    const context = createFreeModeContext(shared.generation);
    set({
      context,
      teamName: shared.teamName ?? '',
      team: shared.team,
      editingSlotIndex: null,
      pickerSlotIndex: null,
    });
  },

  hydrateTeam(team) {
    const { context } = get();
    const sanitized: Team = [
      sanitizeSlotForContext(team[0], context),
      sanitizeSlotForContext(team[1], context),
      sanitizeSlotForContext(team[2], context),
      sanitizeSlotForContext(team[3], context),
      sanitizeSlotForContext(team[4], context),
      sanitizeSlotForContext(team[5], context),
    ];
    set({ team: sanitized });
  },

  async loadSavedTeams() {
    const savedTeams = await listSavedTeams();
    set({ savedTeams, isStorageLoaded: true });
  },

  async saveCurrentTeam(customName) {
    const { context, team, teamName } = get();
    const resolvedName = customName?.trim() || teamName.trim() || `Gen ${context.generation} Team`;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `team-${Date.now()}`;

    const record: SavedTeamRecord = {
      id,
      name: resolvedName,
      updatedAt: new Date().toISOString(),
      mode: context.mode,
      generation: context.generation,
      team,
    };

    const savedTeams = await saveTeamRecord(record);
    set({ savedTeams, teamName: resolvedName });
    return record;
  },

  loadSavedTeam(id) {
    const target = get().savedTeams.find((item) => item.id === id);
    if (!target) return;
    const nextContext = createFreeModeContext(target.generation);
    set({
      context: nextContext,
      teamName: target.name,
      team: target.team,
      editingSlotIndex: null,
      pickerSlotIndex: null,
    });
  },

  async deleteSavedTeam(id) {
    const savedTeams = await deleteSavedTeamRecord(id);
    set({ savedTeams });
  },
}));
