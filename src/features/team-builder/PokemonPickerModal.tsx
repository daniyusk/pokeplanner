import * as Dialog from '@radix-ui/react-dialog';
import { Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { TYPE_COLOR_VARS, TypeIcon } from '@/components/pokemon/TypeIcon';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { getAvailableTypes } from '@/domain/mechanics';
import { recommendPokemonForTeam } from '@/domain/recommendations';
import type { PokemonType, SpeciesData } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';

const PAGE_SIZE = 60;

function computeBst(species: SpeciesData): number {
  const s = species.baseStats;
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
}

export function PokemonPickerModal() {
  const pickerSlotIndex = useTeamStore((s) => s.pickerSlotIndex);
  const context = useTeamStore((s) => s.context);
  const team = useTeamStore((s) => s.team);
  const closePicker = useTeamStore((s) => s.closePicker);
  const setSlotSpecies = useTeamStore((s) => s.setSlotSpecies);

  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>([]);
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isOpen = pickerSlotIndex !== null;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedTypes([]);
      setOnlyRecommended(false);
      setLimit(PAGE_SIZE);
      setActiveIndex(0);
    }
  }, [isOpen]);

  const availableTypes = useMemo(
    () => getAvailableTypes(context.generation, pkmnDexGateway),
    [context.generation],
  );

  const allSpecies = useMemo(
    () => pkmnDexGateway.listSpecies(context.generation),
    [context.generation],
  );

  const recommendedMap = useMemo(() => {
    if (!isOpen || !onlyRecommended) return null;
    const recs = recommendPokemonForTeam(team, context, pkmnDexGateway, {
      limit: 36,
      excludeLegendaries: true,
      ...(pickerSlotIndex !== null ? { replaceSlotIndex: pickerSlotIndex } : {}),
    });
    return new Map(recs.map((r) => [r.species.slug, r]));
  }, [context, isOpen, onlyRecommended, pickerSlotIndex, team]);

  const filteredSpecies = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const baseList = recommendedMap
      ? Array.from(recommendedMap.values()).map((r) => r.species)
      : allSpecies;

    return baseList.filter((species) => {
      if (selectedTypes.length > 0) {
        const hasAllTypes = selectedTypes.every((t) => species.types.includes(t));
        if (!hasAllTypes) return false;
      }
      if (!trimmed) return true;
      const dexMatch = String(species.dexNumber).includes(trimmed.replace(/^#/, ''));
      return species.name.toLowerCase().includes(trimmed) || dexMatch;
    });
  }, [allSpecies, query, recommendedMap, selectedTypes]);

  const visibleSpecies = useMemo(() => filteredSpecies.slice(0, limit), [filteredSpecies, limit]);

  const toggleTypeFilter = (type: PokemonType) => {
    setLimit(PAGE_SIZE);
    setActiveIndex(0);
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (prev.length >= 2) return [prev[1] as PokemonType, type];
      return [...prev, type];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (visibleSpecies.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, visibleSpecies.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && pickerSlotIndex !== null) {
      const target = visibleSpecies[activeIndex];
      if (target) {
        e.preventDefault();
        setSlotSpecies(pickerSlotIndex, target.slug);
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closePicker()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchInputRef.current?.focus();
          }}
          className="fixed top-[6%] left-1/2 z-50 flex max-h-[88vh] w-[94vw] max-w-4xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
            <div>
              <Dialog.Title className="text-base font-bold text-[var(--ink-primary)]">
                Select Pokémon — Slot {pickerSlotIndex !== null ? pickerSlotIndex + 1 : ''}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--ink-muted)]">
                Generation {context.generation} · {filteredSpecies.length} matching species
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close Pokémon picker"
              className="rounded-lg p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Search & Type Filter Bar */}
          <div className="space-y-3 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-3.5">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[14rem]">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(PAGE_SIZE);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search Pokémon by name or #dex number..."
                  aria-label="Search Pokémon"
                  className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] pr-3 pl-9 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
                />
              </div>

              <button
                type="button"
                aria-pressed={onlyRecommended}
                onClick={() => {
                  setOnlyRecommended((prev) => !prev);
                  setActiveIndex(0);
                }}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition ${
                  onlyRecommended
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-ink)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Recommended</span>
              </button>
            </div>

            <fieldset className="flex flex-wrap items-center gap-1.5 border-0 p-0">
              <legend className="sr-only">Filter by type</legend>
              {availableTypes.map((type) => {
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleTypeFilter(type)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                      isSelected
                        ? 'border-transparent text-white shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                    style={isSelected ? { backgroundColor: TYPE_COLOR_VARS[type] } : undefined}
                  >
                    <TypeIcon type={type} className="h-3 w-3 shrink-0" />
                    <span>{type}</span>
                  </button>
                );
              })}
              {selectedTypes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTypes([])}
                  className="ml-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                >
                  Reset filters
                </button>
              )}
            </fieldset>
          </div>

          {/* Species Results Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {visibleSpecies.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
                No Pokémon found matching your search in Generation {context.generation}.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleSpecies.map((species, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={species.slug}
                        type="button"
                        onClick={() => {
                          if (pickerSlotIndex !== null) {
                            setSlotSpecies(pickerSlotIndex, species.slug);
                          }
                        }}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                          isActive
                            ? 'border-[var(--accent-primary)] bg-[var(--surface-elevated)]'
                            : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                        }`}
                      >
                        <PokemonSprite
                          spriteId={species.spriteId}
                          dexNumber={species.dexNumber}
                          name={species.name}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--ink-primary)]">
                              {species.name}
                            </span>
                            <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--ink-muted)]">
                              #{String(species.dexNumber).padStart(3, '0')}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1">
                              {species.types.map((t) => (
                                <TypeBadge key={t} type={t} size="sm" />
                              ))}
                            </div>
                            <span className="text-[11px] font-medium tabular-nums text-[var(--ink-muted)]">
                              BST {computeBst(species)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredSpecies.length > visibleSpecies.length && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-2 text-xs font-semibold text-[var(--ink-primary)] transition hover:border-[var(--border-strong)]"
                    >
                      Show more ({filteredSpecies.length - visibleSpecies.length} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
