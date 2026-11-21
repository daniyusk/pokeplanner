import { Search, SlidersHorizontal } from 'lucide-react';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { VersionSelector } from '@/components/ui/VersionSelector';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { getAvailableSpeciesInGame } from '@/domain/journey';
import { getAvailableTypes } from '@/domain/mechanics';
import { getScopeKey } from '@/domain/team';
import type { GenerationNumber, PokemonType } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';
import { BrowserFilterTray } from './browser/BrowserFilterTray';
import { SpeciesSpriteGrid } from './browser/SpeciesSpriteGrid';

const PAGE_SIZE = 120;

interface PokemonBrowserProps {
  searchInputRef?: RefObject<HTMLInputElement | null>;
  allowedSpeciesSlugs?: ReadonlySet<string>;
}

export function PokemonBrowser({ searchInputRef, allowedSpeciesSlugs }: PokemonBrowserProps) {
  const context = useTeamStore((s) => s.context);
  return (
    <PokemonBrowserInner
      key={getScopeKey(context)}
      {...(searchInputRef ? { searchInputRef } : {})}
      {...(allowedSpeciesSlugs !== undefined ? { allowedSpeciesSlugs } : {})}
    />
  );
}

function PokemonBrowserInner({ searchInputRef, allowedSpeciesSlugs }: PokemonBrowserProps) {
  const context = useTeamStore((s) => s.context);
  const activeManifest = useTeamStore((s) => s.activeManifest);
  const excludeTradeEvolutions = useTeamStore((s) => s.excludeTradeEvolutions);
  const onlyCatchableInGame = useTeamStore((s) => s.onlyCatchableInGame);
  const team = useTeamStore((s) => s.team);
  const addSpeciesToTeam = useTeamStore((s) => s.addSpeciesToTeam);
  const setVersionId = useTeamStore((s) => s.setVersionId);
  const setOnlyCatchableInGame = useTeamStore((s) => s.setOnlyCatchableInGame);
  const setExcludeTradeEvolutions = useTeamStore((s) => s.setExcludeTradeEvolutions);

  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>([]);
  const [selectedRegionGen, setSelectedRegionGen] = useState<GenerationNumber | 'all'>('all');
  const [fullyEvolvedOnly, setFullyEvolvedOnly] = useState(false);
  const [excludeLegendaries, setExcludeLegendaries] = useState(false);
  const [includeBattleForms, setIncludeBattleForms] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isCampaign = context.mode === 'campaign' && activeManifest !== null;
  const isTeamFull = team.every((slot) => slot !== null);

  const selectedSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const slot of team) {
      if (slot) set.add(slot.speciesSlug);
    }
    return set;
  }, [team]);

  const availableTypes = useMemo(
    () => getAvailableTypes(context.generation, pkmnDexGateway),
    [context.generation],
  );

  const allowedCampaignSlugs = useMemo(() => {
    if (allowedSpeciesSlugs !== undefined) return allowedSpeciesSlugs;
    if (!isCampaign || !activeManifest || !onlyCatchableInGame) return null;
    return getAvailableSpeciesInGame(activeManifest, {
      excludeTradeEvolutions,
      ...(context.mode === 'campaign' && context.versionId ? { versionId: context.versionId } : {}),
    });
  }, [
    activeManifest,
    allowedSpeciesSlugs,
    context,
    excludeTradeEvolutions,
    isCampaign,
    onlyCatchableInGame,
  ]);

  const basePool = useMemo(() => {
    const raw = pkmnDexGateway.listSpecies(context.generation);
    if (allowedCampaignSlugs) {
      return raw.filter((sp) => allowedCampaignSlugs.has(sp.slug));
    }
    return raw;
  }, [allowedCampaignSlugs, context.generation]);

  const filteredSpecies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const numericQuery = q.replace(/^#/, '');

    return basePool.filter((sp) => {
      if (!includeBattleForms && sp.isBattleOnly) return false;
      if (fullyEvolvedOnly && sp.nfe) return false;
      if (excludeLegendaries && sp.isLegendary) return false;
      if (
        !isCampaign &&
        selectedRegionGen !== 'all' &&
        sp.generationIntroduced !== selectedRegionGen
      ) {
        return false;
      }
      if (selectedTypes.length > 0 && !selectedTypes.every((t) => sp.types.includes(t))) {
        return false;
      }
      if (!q) return true;
      return (
        sp.name.toLowerCase().includes(q) ||
        sp.slug.includes(q) ||
        (numericQuery.length > 0 && String(sp.dexNumber) === numericQuery)
      );
    });
  }, [
    basePool,
    excludeLegendaries,
    fullyEvolvedOnly,
    includeBattleForms,
    isCampaign,
    query,
    selectedRegionGen,
    selectedTypes,
  ]);

  const visibleSpecies = useMemo(() => filteredSpecies.slice(0, limit), [filteredSpecies, limit]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (visibleSpecies.length >= filteredSpecies.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLimit((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredSpecies.length, visibleSpecies.length]);

  const toggleTypeFilter = (type: PokemonType) => {
    setLimit(PAGE_SIZE);
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (prev.length >= 2) return [prev[1] as PokemonType, type];
      return [...prev, type];
    });
  };

  const activeFilterCount =
    selectedTypes.length +
    (!isCampaign && selectedRegionGen !== 'all' ? 1 : 0) +
    (fullyEvolvedOnly ? 1 : 0) +
    (excludeLegendaries ? 1 : 0) +
    (includeBattleForms ? 1 : 0);

  const resetAllFilters = () => {
    setQuery('');
    setSelectedTypes([]);
    setSelectedRegionGen('all');
    setFullyEvolvedOnly(false);
    setExcludeLegendaries(false);
    setIncludeBattleForms(false);
    setLimit(PAGE_SIZE);
  };

  return (
    <section
      aria-label="Pokémon list"
      className="space-y-3 border-t border-[var(--border-subtle)] pt-5"
    >
      {/* Search + Version + Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Search Pokémon..."
            aria-label="Search Pokémon"
            className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] pr-3 pl-8 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCampaign && activeManifest && (
            <VersionSelector
              versions={activeManifest.versions}
              activeVersionId={context.versionId}
              onSelectVersion={setVersionId}
              containerTone="elevated"
            />
          )}

          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
              filtersOpen || activeFilterCount > 0
                ? 'border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[var(--accent-primary)] px-1.5 py-0.25 text-[10px] font-semibold tabular-nums text-[var(--accent-ink)]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {filtersOpen && (
        <BrowserFilterTray
          isCampaign={isCampaign}
          availableTypes={availableTypes}
          selectedTypes={selectedTypes}
          onToggleType={toggleTypeFilter}
          selectedRegionGen={selectedRegionGen}
          onChangeRegionGen={(gen) => {
            setSelectedRegionGen(gen);
            setLimit(PAGE_SIZE);
          }}
          onlyCatchableInGame={onlyCatchableInGame}
          onChangeOnlyCatchable={(checked) => {
            setOnlyCatchableInGame(checked);
            setLimit(PAGE_SIZE);
          }}
          excludeTradeEvolutions={excludeTradeEvolutions}
          onChangeExcludeTradeEvolutions={(checked) => {
            setExcludeTradeEvolutions(checked);
            setLimit(PAGE_SIZE);
          }}
          fullyEvolvedOnly={fullyEvolvedOnly}
          onChangeFullyEvolvedOnly={(checked) => {
            setFullyEvolvedOnly(checked);
            setLimit(PAGE_SIZE);
          }}
          excludeLegendaries={excludeLegendaries}
          onChangeExcludeLegendaries={(checked) => {
            setExcludeLegendaries(checked);
            setLimit(PAGE_SIZE);
          }}
          includeBattleForms={includeBattleForms}
          onChangeIncludeBattleForms={(checked) => {
            setIncludeBattleForms(checked);
            setLimit(PAGE_SIZE);
          }}
          hasActiveFilters={activeFilterCount > 0 || Boolean(query)}
          onResetFilters={resetAllFilters}
        />
      )}

      <SpeciesSpriteGrid
        visibleSpecies={visibleSpecies}
        totalFilteredCount={filteredSpecies.length}
        selectedSlugs={selectedSlugs}
        isTeamFull={isTeamFull}
        onSelectSpecies={addSpeciesToTeam}
        onLoadMore={() => setLimit((prev) => prev + PAGE_SIZE)}
        sentinelRef={sentinelRef}
      />
    </section>
  );
}
