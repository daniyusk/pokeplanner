import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { BATTLE_GIMMICK, MAX_MOVES_PER_MEMBER, TEXT_LIMITS } from '@/domain/constants';
import { filterLearnableMoves, getAvailableTypes } from '@/domain/mechanics';
import { recommendBuildForMember } from '@/domain/recommendations';
import type {
  GameContext,
  MoveData,
  PokemonType,
  SpeciesData,
  Team,
  TeamMember,
  TeamSlotIndex,
} from '@/domain/types';
import { learnableMoveSlugsQueryOptions } from '@/hooks/gameQueries';
import { useTransientFlag } from '@/hooks/useTransientFlag';
import { useTeamStore } from '@/stores/useTeamStore';
import { AutoBuildSuggestionCard } from './build-drawer/AutoBuildSuggestionCard';
import { HeldItemPicker } from './build-drawer/HeldItemPicker';
import { MovesetEditor } from './build-drawer/MovesetEditor';
import { SpeciesEvolutionFormes } from './build-drawer/SpeciesEvolutionFormes';

const ITEM_SEARCH_LIMIT = 40;
const MOVE_PICKER_LIMIT = 60;

interface BuildDrawerContentProps {
  editingSlotIndex: TeamSlotIndex;
  member: TeamMember;
  species: SpeciesData;
  team: Team;
  context: GameContext;
}

export function BuildDrawer() {
  const editingSlotIndex = useTeamStore((s) => s.editingSlotIndex);
  const team = useTeamStore((s) => s.team);
  const context = useTeamStore((s) => s.context);
  const closeEditor = useTeamStore((s) => s.closeEditor);

  const member = editingSlotIndex !== null ? team[editingSlotIndex] : null;
  const species = member
    ? pkmnDexGateway.getSpecies(member.speciesSlug, context.generation)
    : undefined;

  if (editingSlotIndex === null || !member || !species) {
    return null;
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeEditor()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <BuildDrawerContent
          key={`${editingSlotIndex}:${species.slug}`}
          editingSlotIndex={editingSlotIndex}
          member={member}
          species={species}
          team={team}
          context={context}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BuildDrawerContent({
  editingSlotIndex,
  member,
  species,
  team,
  context,
}: BuildDrawerContentProps) {
  const setSlotSpecies = useTeamStore((s) => s.setSlotSpecies);
  const updateSlotMember = useTeamStore((s) => s.updateSlotMember);
  const activeManifest = useTeamStore((s) => s.activeManifest);

  const [itemQuery, setItemQuery] = useState('');
  const [moveQuery, setMoveQuery] = useState('');
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [appliedAutoBuild, triggerAppliedAutoBuild] = useTransientFlag(1600);

  const { data: learnableList } = useQuery({
    ...learnableMoveSlugsQueryOptions(species.slug, context.generation),
  });

  const learnableSlugs = useMemo(
    () => (learnableList ? new Set(learnableList) : null),
    [learnableList],
  );

  const availableTypes = useMemo(
    () => getAvailableTypes(context.generation, pkmnDexGateway),
    [context.generation],
  );

  const natures = useMemo(
    () => pkmnDexGateway.listNatures(context.generation),
    [context.generation],
  );

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!context.mechanics.hasHeldItems || !q) return [];
    return pkmnDexGateway
      .listItems(context.generation)
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, ITEM_SEARCH_LIMIT);
  }, [context.generation, context.mechanics.hasHeldItems, itemQuery]);

  const candidateMoves = useMemo(() => {
    const all = pkmnDexGateway.listMoves(context.generation);
    const q = moveQuery.trim().toLowerCase();

    const pool =
      !showAllMoves && learnableSlugs && learnableSlugs.size > 0
        ? filterLearnableMoves(all, learnableSlugs)
        : all;

    const filtered = q
      ? pool.filter((m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q))
      : pool;

    return filtered.slice(0, MOVE_PICKER_LIMIT);
  }, [context.generation, learnableSlugs, moveQuery, showAllMoves]);

  const recommendedBuild = useMemo(
    () => recommendBuildForMember(editingSlotIndex, team, context, pkmnDexGateway, learnableList),
    [context, editingSlotIndex, learnableList, team],
  );

  const allForms = useMemo(
    () =>
      Array.from(new Set([species.baseSpeciesSlug, species.slug, ...species.otherFormeSlugs]))
        .map((slug) => pkmnDexGateway.getSpecies(slug, context.generation))
        .filter((sp): sp is SpeciesData => Boolean(sp)),
    [context.generation, species],
  );

  const handleApplyAutoBuild = () => {
    if (!recommendedBuild) return;
    updateSlotMember(editingSlotIndex, {
      ...(recommendedBuild.ability ? { abilitySlug: recommendedBuild.ability.slug } : {}),
      ...(recommendedBuild.item ? { itemSlug: recommendedBuild.item.slug } : {}),
      ...(recommendedBuild.nature ? { natureId: recommendedBuild.nature.id } : {}),
      moveSlugs: recommendedBuild.moves.map((m) => m.move.slug),
    });
    triggerAppliedAutoBuild();
  };

  const toggleMove = (move: MoveData) => {
    const current = [...member.moveSlugs];
    const existingIndex = current.indexOf(move.slug);
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
      updateSlotMember(editingSlotIndex, { moveSlugs: current });
      return;
    }
    if (current.length >= MAX_MOVES_PER_MEMBER) return;
    current.push(move.slug);
    updateSlotMember(editingSlotIndex, { moveSlugs: current });
  };

  const selectedAbilityObj = member.abilitySlug
    ? pkmnDexGateway.getAbility(member.abilitySlug, context.generation)
    : undefined;

  const selectedItemObj = member.itemSlug
    ? pkmnDexGateway.getItem(member.itemSlug, context.generation)
    : undefined;

  return (
    <Dialog.Content className="fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex items-center gap-3">
          <PokemonSprite
            spriteId={species.spriteId}
            dexNumber={species.dexNumber}
            name={species.name}
            size="sm"
            shiny={Boolean(member.shiny)}
            gender={member.gender}
          />
          <div>
            <Dialog.Title className="text-base font-semibold text-[var(--ink-primary)]">
              {species.name}
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--ink-muted)]">
              {activeManifest ? activeManifest.name : 'Free Mode'}
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close
          aria-label="Close build drawer"
          className="rounded-lg p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
        >
          <X className="h-4 w-4" />
        </Dialog.Close>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <SpeciesEvolutionFormes
          species={species}
          generation={context.generation}
          allForms={allForms}
          onSelectSpecies={(slug) => setSlotSpecies(editingSlotIndex, slug)}
        />

        {recommendedBuild && (
          <AutoBuildSuggestionCard
            recommendation={recommendedBuild}
            applied={appliedAutoBuild}
            onApply={handleApplyAutoBuild}
          />
        )}

        {/* Nickname */}
        <div>
          <label
            htmlFor="member-nickname"
            className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
          >
            Nickname (optional)
          </label>
          <input
            id="member-nickname"
            type="text"
            maxLength={TEXT_LIMITS.nicknameMaxLength}
            value={member.nickname ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              updateSlotMember(editingSlotIndex, val ? { nickname: val } : { nickname: undefined });
            }}
            placeholder={species.name}
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink-primary)]"
          />
        </div>

        {/* Ability & Nature Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="member-ability"
              className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            >
              Ability
            </label>
            {context.mechanics.hasAbilities ? (
              <>
                <select
                  id="member-ability"
                  value={member.abilitySlug ?? ''}
                  onChange={(e) =>
                    updateSlotMember(
                      editingSlotIndex,
                      e.target.value ? { abilitySlug: e.target.value } : { abilitySlug: undefined },
                    )
                  }
                  className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-sm text-[var(--ink-primary)]"
                >
                  {species.abilities.map((slug) => {
                    const ab = pkmnDexGateway.getAbility(slug, context.generation);
                    return (
                      <option key={slug} value={slug}>
                        {ab?.name ?? slug}
                      </option>
                    );
                  })}
                </select>
                {selectedAbilityObj?.shortDesc && (
                  <p className="mt-1 text-[11px] leading-snug text-[var(--ink-muted)]">
                    {selectedAbilityObj.shortDesc}
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                Not available in Gen {context.generation}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="member-nature"
              className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            >
              Nature
            </label>
            {context.mechanics.hasNatures ? (
              <select
                id="member-nature"
                value={member.natureId ?? ''}
                onChange={(e) =>
                  updateSlotMember(
                    editingSlotIndex,
                    e.target.value ? { natureId: e.target.value } : { natureId: undefined },
                  )
                }
                className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-sm text-[var(--ink-primary)]"
              >
                <option value="">Neutral / Any</option>
                {natures.map((n) => {
                  const mod =
                    n.plus && n.minus
                      ? ` (+${n.plus.toUpperCase()} / -${n.minus.toUpperCase()})`
                      : '';
                  return (
                    <option key={n.id} value={n.id}>
                      {n.name}
                      {mod}
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                Not available in Gen {context.generation}
              </p>
            )}
          </div>
        </div>

        {/* Tera Type (Gen 9 only) */}
        {context.mechanics.gimmick === BATTLE_GIMMICK.Terastal && (
          <div>
            <label
              htmlFor="member-tera"
              className="mb-1.5 block text-xs font-semibold text-[var(--ink-secondary)]"
            >
              Tera Type
            </label>
            <select
              id="member-tera"
              value={member.teraType ?? ''}
              onChange={(e) =>
                updateSlotMember(
                  editingSlotIndex,
                  e.target.value
                    ? { teraType: e.target.value as PokemonType }
                    : { teraType: undefined },
                )
              }
              className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-sm text-[var(--ink-primary)]"
            >
              <option value="">Default ({species.types.join(' / ')})</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}

        <HeldItemPicker
          hasHeldItems={context.mechanics.hasHeldItems}
          selectedItem={selectedItemObj}
          itemQuery={itemQuery}
          onChangeItemQuery={setItemQuery}
          filteredItems={filteredItems}
          onSelectItem={(slug) => {
            updateSlotMember(editingSlotIndex, { itemSlug: slug });
            setItemQuery('');
          }}
          onRemoveItem={() => updateSlotMember(editingSlotIndex, { itemSlug: undefined })}
        />

        <MovesetEditor
          moveSlugs={member.moveSlugs}
          context={context}
          showAllMoves={showAllMoves}
          onToggleShowAllMoves={() => setShowAllMoves((prev) => !prev)}
          moveQuery={moveQuery}
          onChangeMoveQuery={setMoveQuery}
          candidateMoves={candidateMoves}
          onToggleMove={toggleMove}
        />
      </div>
    </Dialog.Content>
  );
}
