import { create } from 'zustand';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { loadGameManifest } from '@/data/games/gameLoader';
import {
  deleteSavedTeamRecord,
  listSavedTeams,
  type SavedTeamRecord,
  saveTeamRecord,
} from '@/data/storage/teamStorage';
import { buildDefaultJourneyFromFinalTeam } from '@/domain/journey';
import { createEmptyTeam, type ShareableTeamState } from '@/domain/sharing';
import {
  type CampaignGameContext,
  createFreeModeContext,
  type GameContext,
  type GameManifest,
  type GenerationNumber,
  type Team,
  type TeamMember,
  type TeamSlot,
  type TeamSlotIndex,
} from '@/domain/types';

export type TeamMemberPatch = {
  [K in keyof TeamMember]?: TeamMember[K] | undefined;
};

export interface PickerTarget {
  slotIndex: TeamSlotIndex;
  checkpointId?: string;
}

export interface TeamStoreState {
  context: GameContext;
  activeManifest: GameManifest | null;
  excludeTradeEvolutions: boolean;
  onlyCatchableInGame: boolean;
  activeCheckpointId: string | null;
  journeySnapshots: Record<string, Team>;

  teamName: string;
  team: Team;
  pickerTarget: PickerTarget | null;
  pickerSlotIndex: TeamSlotIndex | null;
  editingSlotIndex: TeamSlotIndex | null;
  savedTeams: SavedTeamRecord[];
  isStorageLoaded: boolean;

  setGeneration: (generation: GenerationNumber) => void;
  selectCampaignGame: (manifest: GameManifest, versionId?: string) => void;
  setVersionId: (versionId: string) => void;
  setExcludeTradeEvolutions: (value: boolean) => void;
  setOnlyCatchableInGame: (value: boolean) => void;
  setActiveCheckpoint: (checkpointId: string) => void;
  syncJourneyFromFinalTeam: () => void;
  clearJourneySlot: (checkpointId: string, slotIndex: TeamSlotIndex) => void;

  setTeamName: (name: string) => void;
  setSlotSpecies: (slotIndex: TeamSlotIndex, speciesSlug: string) => void;
  updateSlotMember: (slotIndex: TeamSlotIndex, patch: TeamMemberPatch) => void;
  clearSlot: (slotIndex: TeamSlotIndex) => void;
  swapSlots: (fromIndex: TeamSlotIndex, toIndex: TeamSlotIndex) => void;
  resetTeam: () => void;
  openPicker: (slotIndex: TeamSlotIndex, checkpointId?: string) => void;
  closePicker: () => void;
  openEditor: (slotIndex: TeamSlotIndex) => void;
  closeEditor: () => void;
  hydrateFromSharedState: (shared: ShareableTeamState) => Promise<void>;
  hydrateTeam: (team: Team) => void;
  loadSavedTeams: () => Promise<void>;
  saveCurrentTeam: (customName?: string) => Promise<SavedTeamRecord>;
  loadSavedTeam: (id: string) => Promise<void>;
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

function sanitizeTeamForContext(team: Team, context: GameContext): Team {
  return [
    sanitizeSlotForContext(team[0], context),
    sanitizeSlotForContext(team[1], context),
    sanitizeSlotForContext(team[2], context),
    sanitizeSlotForContext(team[3], context),
    sanitizeSlotForContext(team[4], context),
    sanitizeSlotForContext(team[5], context),
  ];
}

function buildMemberFromSpecies(
  speciesSlug: string,
  context: GameContext,
  existing: TeamSlot,
): TeamMember | null {
  const species = pkmnDexGateway.getSpecies(speciesSlug, context.generation);
  if (!species) return null;

  const isSameBaseSpecies = existing
    ? pkmnDexGateway.getSpecies(existing.speciesSlug, context.generation)?.baseSpeciesSlug ===
      species.baseSpeciesSlug
    : false;

  const defaultAbility = context.mechanics.hasAbilities ? species.abilities[0] : undefined;
  return {
    speciesSlug: species.slug,
    moveSlugs: isSameBaseSpecies && existing ? existing.moveSlugs : [],
    ...(defaultAbility ? { abilitySlug: defaultAbility } : {}),
    ...(isSameBaseSpecies && existing?.itemSlug ? { itemSlug: existing.itemSlug } : {}),
    ...(isSameBaseSpecies && existing?.natureId ? { natureId: existing.natureId } : {}),
    ...(isSameBaseSpecies && existing?.teraType ? { teraType: existing.teraType } : {}),
    ...(isSameBaseSpecies && existing?.nickname ? { nickname: existing.nickname } : {}),
  };
}

export const useTeamStore = create<TeamStoreState>((set, get) => ({
  context: createFreeModeContext(9),
  activeManifest: null,
  excludeTradeEvolutions: true,
  onlyCatchableInGame: true,
  activeCheckpointId: null,
  journeySnapshots: {},

  teamName: '',
  team: createEmptyTeam(),
  pickerTarget: null,
  pickerSlotIndex: null,
  editingSlotIndex: null,
  savedTeams: [],
  isStorageLoaded: false,

  setGeneration(generation) {
    const nextContext = createFreeModeContext(generation);
    const nextTeam = sanitizeTeamForContext(get().team, nextContext);
    set({
      context: nextContext,
      activeManifest: null,
      activeCheckpointId: null,
      journeySnapshots: {},
      team: nextTeam,
    });
  },

  selectCampaignGame(manifest, versionId) {
    const resolvedVersionId = versionId ?? manifest.versions[0]?.id;
    const nextContext: CampaignGameContext = {
      mode: 'campaign',
      gameId: manifest.id,
      ...(resolvedVersionId ? { versionId: resolvedVersionId } : {}),
      generation: manifest.generation,
      mechanics: manifest.mechanics,
    };

    const nextTeam = sanitizeTeamForContext(get().team, nextContext);
    const firstCheckpoint = manifest.checkpoints[0]?.id ?? null;
    const journeySnapshots = buildDefaultJourneyFromFinalTeam(nextTeam, manifest, pkmnDexGateway);

    set({
      context: nextContext,
      activeManifest: manifest,
      activeCheckpointId: firstCheckpoint,
      journeySnapshots,
      team: nextTeam,
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

  setActiveCheckpoint(checkpointId) {
    set({ activeCheckpointId: checkpointId });
  },

  syncJourneyFromFinalTeam() {
    const { activeManifest, team } = get();
    if (!activeManifest) return;
    const journeySnapshots = buildDefaultJourneyFromFinalTeam(team, activeManifest, pkmnDexGateway);
    set({ journeySnapshots });
  },

  clearJourneySlot(checkpointId, slotIndex) {
    const { journeySnapshots } = get();
    const currentSnapshot = journeySnapshots[checkpointId] ?? createEmptyTeam();
    const nextSnapshot = [...currentSnapshot] as Team;
    nextSnapshot[slotIndex] = null;
    set({
      journeySnapshots: {
        ...journeySnapshots,
        [checkpointId]: nextSnapshot,
      },
    });
  },

  setTeamName(name) {
    set({ teamName: name });
  },

  setSlotSpecies(slotIndex, speciesSlug) {
    const { context, team, pickerTarget, journeySnapshots, activeManifest } = get();

    // If picker was opened for a specific Journey Checkpoint, update that snapshot!
    if (pickerTarget?.checkpointId) {
      const cpId = pickerTarget.checkpointId;
      const currentSnapshot = journeySnapshots[cpId] ?? createEmptyTeam();
      const nextMember = buildMemberFromSpecies(speciesSlug, context, currentSnapshot[slotIndex]);
      if (!nextMember) return;
      const nextSnapshot = [...currentSnapshot] as Team;
      nextSnapshot[slotIndex] = nextMember;
      set({
        journeySnapshots: {
          ...journeySnapshots,
          [cpId]: nextSnapshot,
        },
        pickerTarget: null,
        pickerSlotIndex: null,
      });
      return;
    }

    const nextMember = buildMemberFromSpecies(speciesSlug, context, team[slotIndex]);
    if (!nextMember) return;

    const nextTeam = [...team] as Team;
    nextTeam[slotIndex] = nextMember;

    const nextSnapshots = activeManifest
      ? buildDefaultJourneyFromFinalTeam(nextTeam, activeManifest, pkmnDexGateway)
      : journeySnapshots;

    set({
      team: nextTeam,
      journeySnapshots: nextSnapshots,
      pickerTarget: null,
      pickerSlotIndex: null,
    });
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
    const { activeManifest, journeySnapshots } = get();
    const team = [...get().team] as Team;
    team[slotIndex] = null;
    const editingSlotIndex = get().editingSlotIndex === slotIndex ? null : get().editingSlotIndex;
    const nextSnapshots = activeManifest
      ? buildDefaultJourneyFromFinalTeam(team, activeManifest, pkmnDexGateway)
      : journeySnapshots;

    set({ team, editingSlotIndex, journeySnapshots: nextSnapshots });
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
    const { activeManifest } = get();
    const empty = createEmptyTeam();
    set({
      team: empty,
      teamName: '',
      editingSlotIndex: null,
      pickerTarget: null,
      pickerSlotIndex: null,
      journeySnapshots: activeManifest
        ? buildDefaultJourneyFromFinalTeam(empty, activeManifest, pkmnDexGateway)
        : {},
    });
  },

  openPicker(slotIndex, checkpointId) {
    set({
      pickerSlotIndex: slotIndex,
      pickerTarget: checkpointId ? { slotIndex, checkpointId } : { slotIndex },
    });
  },

  closePicker() {
    set({ pickerSlotIndex: null, pickerTarget: null });
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
        const versionId = shared.versionId ?? manifest.versions[0]?.id;
        const context: CampaignGameContext = {
          mode: 'campaign',
          gameId: manifest.id,
          ...(versionId ? { versionId } : {}),
          generation: manifest.generation,
          mechanics: manifest.mechanics,
        };
        const sanitized = sanitizeTeamForContext(shared.team, context);
        set({
          context,
          activeManifest: manifest,
          activeCheckpointId: manifest.checkpoints[0]?.id ?? null,
          journeySnapshots: buildDefaultJourneyFromFinalTeam(sanitized, manifest, pkmnDexGateway),
          teamName: shared.teamName ?? '',
          team: sanitized,
          editingSlotIndex: null,
          pickerTarget: null,
          pickerSlotIndex: null,
        });
        return;
      }
    }

    const context = createFreeModeContext(shared.generation);
    set({
      context,
      activeManifest: null,
      activeCheckpointId: null,
      journeySnapshots: {},
      teamName: shared.teamName ?? '',
      team: sanitizeTeamForContext(shared.team, context),
      editingSlotIndex: null,
      pickerTarget: null,
      pickerSlotIndex: null,
    });
  },

  hydrateTeam(team) {
    const { context, activeManifest } = get();
    const sanitized = sanitizeTeamForContext(team, context);
    set({
      team: sanitized,
      ...(activeManifest
        ? {
            journeySnapshots: buildDefaultJourneyFromFinalTeam(
              sanitized,
              activeManifest,
              pkmnDexGateway,
            ),
          }
        : {}),
    });
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
      (context.mode === 'campaign' ? `${context.gameId} Run` : `Gen ${context.generation} Team`);
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
        const versionId = target.versionId ?? manifest.versions[0]?.id;
        const nextContext: CampaignGameContext = {
          mode: 'campaign',
          gameId: manifest.id,
          ...(versionId ? { versionId } : {}),
          generation: manifest.generation,
          mechanics: manifest.mechanics,
        };
        const sanitized = sanitizeTeamForContext(target.team, nextContext);
        set({
          context: nextContext,
          activeManifest: manifest,
          activeCheckpointId: manifest.checkpoints[0]?.id ?? null,
          journeySnapshots: buildDefaultJourneyFromFinalTeam(sanitized, manifest, pkmnDexGateway),
          teamName: target.name,
          team: sanitized,
          editingSlotIndex: null,
          pickerTarget: null,
          pickerSlotIndex: null,
        });
        return;
      }
    }

    const nextContext = createFreeModeContext(target.generation);
    set({
      context: nextContext,
      activeManifest: null,
      activeCheckpointId: null,
      journeySnapshots: {},
      teamName: target.name,
      team: sanitizeTeamForContext(target.team, nextContext),
      editingSlotIndex: null,
      pickerTarget: null,
      pickerSlotIndex: null,
    });
  },

  async deleteSavedTeam(id) {
    const savedTeams = await deleteSavedTeamRecord(id);
    set({ savedTeams });
  },
}));
