import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { TYPE_COLOR_VARS } from '@/components/pokemon/TypeIcon';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { getAvailableTypes, getEffectiveMoveCategory } from '@/domain/mechanics';
import type { MoveData, PokemonType } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';

export function BuildDrawer() {
  const editingSlotIndex = useTeamStore((s) => s.editingSlotIndex);
  const team = useTeamStore((s) => s.team);
  const context = useTeamStore((s) => s.context);
  const closeEditor = useTeamStore((s) => s.closeEditor);
  const setSlotSpecies = useTeamStore((s) => s.setSlotSpecies);
  const updateSlotMember = useTeamStore((s) => s.updateSlotMember);

  const member = editingSlotIndex !== null ? team[editingSlotIndex] : null;
  const species = member
    ? pkmnDexGateway.getSpecies(member.speciesSlug, context.generation)
    : undefined;

  const [itemQuery, setItemQuery] = useState('');
  const [moveQuery, setMoveQuery] = useState('');
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [learnableSlugs, setLearnableSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!species) {
      setLearnableSlugs(null);
      return;
    }
    setItemQuery('');
    setMoveQuery('');
    setShowAllMoves(false);
    let cancelled = false;
    setLearnableSlugs(null);
    pkmnDexGateway.getLearnableMoveSlugs(species.slug, context.generation).then((slugs) => {
      if (!cancelled) {
        setLearnableSlugs(new Set(slugs));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [species, context.generation]);

  const availableTypes = useMemo(
    () => getAvailableTypes(context.generation, pkmnDexGateway),
    [context.generation],
  );

  const natures = useMemo(
    () => pkmnDexGateway.listNatures(context.generation),
    [context.generation],
  );

  const filteredItems = useMemo(() => {
    if (!context.mechanics.hasHeldItems) return [];
    const q = itemQuery.trim().toLowerCase();
    const all = pkmnDexGateway.listItems(context.generation);
    if (!q) return all.slice(0, 30);
    return all.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 40);
  }, [context.generation, context.mechanics.hasHeldItems, itemQuery]);

  const candidateMoves = useMemo(() => {
    const all = pkmnDexGateway.listMoves(context.generation);
    const q = moveQuery.trim().toLowerCase();

    const pool =
      !showAllMoves && learnableSlugs && learnableSlugs.size > 0
        ? all.filter(
            (m) =>
              learnableSlugs.has(m.slug) ||
              (m.slug.startsWith('hiddenpower') && learnableSlugs.has('hiddenpower')),
          )
        : all;

    const filtered = q
      ? pool.filter((m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q))
      : pool;

    return filtered.slice(0, 60);
  }, [context.generation, learnableSlugs, moveQuery, showAllMoves]);

  if (editingSlotIndex === null || !member || !species) {
    return null;
  }

  const toggleMove = (move: MoveData) => {
    const current = [...member.moveSlugs];
    const existingIndex = current.indexOf(move.slug);
    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
      updateSlotMember(editingSlotIndex, { moveSlugs: current });
      return;
    }
    if (current.length >= 4) return;
    current.push(move.slug);
    updateSlotMember(editingSlotIndex, { moveSlugs: current });
  };

  const selectedAbilityObj = member.abilitySlug
    ? pkmnDexGateway.getAbility(member.abilitySlug, context.generation)
    : undefined;

  const selectedItemObj = member.itemSlug
    ? pkmnDexGateway.getItem(member.itemSlug, context.generation)
    : undefined;

  const allFormSlugs = Array.from(
    new Set([species.baseSpeciesSlug, species.slug, ...species.otherFormeSlugs]),
  ).filter((slug) => Boolean(pkmnDexGateway.getSpecies(slug, context.generation)));

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeEditor()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="flex items-center gap-3">
              <PokemonSprite
                spriteId={species.spriteId}
                dexNumber={species.dexNumber}
                name={species.name}
                size="sm"
              />
              <div>
                <Dialog.Title className="text-base font-bold text-[var(--ink-primary)]">
                  {species.name} — Build
                </Dialog.Title>
                <Dialog.Description className="text-xs text-[var(--ink-muted)]">
                  Slot {editingSlotIndex + 1} · Generation {context.generation}
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
            {/* Types, Evolutions & Forms */}
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {species.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {species.prevoSlug && (
                    <button
                      type="button"
                      onClick={() => setSlotSpecies(editingSlotIndex, species.prevoSlug as string)}
                      className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)]"
                    >
                      ← Prevo
                    </button>
                  )}
                  {species.evoSlugs.map((evoSlug) => {
                    const evo = pkmnDexGateway.getSpecies(evoSlug, context.generation);
                    if (!evo) return null;
                    return (
                      <button
                        key={evoSlug}
                        type="button"
                        onClick={() => setSlotSpecies(editingSlotIndex, evoSlug)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-1 font-medium text-[var(--ink-primary)] hover:border-[var(--accent-primary)]"
                      >
                        <span>{evo.name}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {allFormSlugs.length > 1 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-[var(--ink-secondary)]">Form</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allFormSlugs.map((formSlug) => {
                      const formSpecies = pkmnDexGateway.getSpecies(formSlug, context.generation);
                      if (!formSpecies) return null;
                      const isCurrent = formSpecies.slug === species.slug;
                      return (
                        <button
                          key={formSlug}
                          type="button"
                          onClick={() => setSlotSpecies(editingSlotIndex, formSlug)}
                          className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                            isCurrent
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-ink)]'
                              : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          {formSpecies.forme || 'Base'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
                maxLength={32}
                value={member.nickname ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateSlotMember(
                    editingSlotIndex,
                    val ? { nickname: val } : { nickname: undefined },
                  );
                }}
                placeholder={species.name}
                className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--ink-primary)]"
              />
            </div>

            {/* Ability, Nature, Tera Grid */}
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
                          e.target.value
                            ? { abilitySlug: e.target.value }
                            : { abilitySlug: undefined },
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
            {context.mechanics.gimmick === 'terastal' && (
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

            {/* Held Item */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-secondary)]">Held Item</span>
                {selectedItemObj && (
                  <button
                    type="button"
                    onClick={() => updateSlotMember(editingSlotIndex, { itemSlug: undefined })}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Remove ({selectedItemObj.name})
                  </button>
                )}
              </div>

              {context.mechanics.hasHeldItems ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={itemQuery}
                      onChange={(e) => setItemQuery(e.target.value)}
                      placeholder={
                        selectedItemObj
                          ? `Equipped: ${selectedItemObj.name}`
                          : 'Search held item (e.g., Leftovers, Air Balloon)...'
                      }
                      aria-label="Search held item"
                      className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] pr-3 pl-8 text-xs text-[var(--ink-primary)]"
                    />
                  </div>
                  {itemQuery.trim().length > 0 && (
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1">
                      {filteredItems.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => {
                            updateSlotMember(editingSlotIndex, { itemSlug: item.slug });
                            setItemQuery('');
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-[var(--surface-muted)]"
                        >
                          <span className="font-semibold text-[var(--ink-primary)]">
                            {item.name}
                          </span>
                          <span className="truncate text-[var(--ink-muted)]">{item.shortDesc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                  Held items were introduced in Generation 2.
                </p>
              )}
            </div>

            {/* Moveset (4 slots + searchable learnset) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-secondary)]">
                  Moves ({member.moveSlugs.length}/4)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllMoves((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{showAllMoves ? 'Showing all Gen moves' : 'Showing learnable moves'}</span>
                </button>
              </div>

              {/* Selected 4 Move Slots */}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {[0, 1, 2, 3].map((idx) => {
                  const slug = member.moveSlugs[idx];
                  const move = slug ? pkmnDexGateway.getMove(slug, context.generation) : undefined;
                  if (!move) {
                    return (
                      <div
                        key={idx}
                        className="flex h-10 items-center rounded-lg border border-dashed border-[var(--border-subtle)] px-3 text-xs text-[var(--ink-muted)]"
                      >
                        Empty move slot {idx + 1}
                      </div>
                    );
                  }
                  const category = getEffectiveMoveCategory(move.slug, context, pkmnDexGateway);
                  return (
                    <div
                      key={move.slug}
                      className="flex h-10 items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: TYPE_COLOR_VARS[move.type] }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[var(--ink-primary)]">
                            {move.name}
                          </p>
                          <p className="text-[10px] tabular-nums text-[var(--ink-muted)]">
                            {move.type} · {category} ·{' '}
                            {move.basePower > 0 ? `BP ${move.basePower}` : '—'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMove(move)}
                        aria-label={`Remove ${move.name}`}
                        className="rounded p-1 text-[var(--ink-muted)] hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Move Search & Picker */}
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={moveQuery}
                  onChange={(e) => setMoveQuery(e.target.value)}
                  placeholder="Search moves by name or type..."
                  aria-label="Search moves"
                  className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] pr-3 pl-8 text-xs text-[var(--ink-primary)]"
                />
              </div>

              <div className="max-h-60 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                {candidateMoves.map((move) => {
                  const isSelected = member.moveSlugs.includes(move.slug);
                  const category = getEffectiveMoveCategory(move.slug, context, pkmnDexGateway);
                  const disabled = !isSelected && member.moveSlugs.length >= 4;

                  return (
                    <button
                      key={move.slug}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMove(move)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition ${
                        isSelected
                          ? 'bg-[var(--accent-primary)]/12'
                          : disabled
                            ? 'cursor-not-allowed opacity-45'
                            : 'hover:bg-[var(--surface-muted)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-[var(--ink-primary)]">
                            {move.name}
                          </span>
                          <TypeBadge type={move.type} size="sm" />
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--ink-muted)]">
                          {move.shortDesc}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px] tabular-nums text-[var(--ink-secondary)]">
                        <div className="font-medium">{category}</div>
                        <div className="text-[var(--ink-muted)]">
                          {move.basePower > 0 ? `BP ${move.basePower}` : 'Status'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
