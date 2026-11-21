import { X } from 'lucide-react';
import { TYPE_COLOR_VARS, TypeIcon } from '@/components/pokemon/TypeIcon';
import type { GenerationNumber, PokemonType } from '@/domain/types';

const REGION_GEN_MAP: readonly { gen: GenerationNumber; label: string }[] = [
  { gen: 1, label: 'Kanto' },
  { gen: 2, label: 'Johto' },
  { gen: 3, label: 'Hoenn' },
  { gen: 4, label: 'Sinnoh' },
  { gen: 5, label: 'Unova' },
  { gen: 6, label: 'Kalos' },
  { gen: 7, label: 'Alola' },
  { gen: 8, label: 'Galar / Hisui' },
  { gen: 9, label: 'Paldea' },
];

interface BrowserFilterTrayProps {
  isCampaign: boolean;
  availableTypes: readonly PokemonType[];
  selectedTypes: readonly PokemonType[];
  onToggleType: (type: PokemonType) => void;
  selectedRegionGen: GenerationNumber | 'all';
  onChangeRegionGen: (gen: GenerationNumber | 'all') => void;
  onlyCatchableInGame: boolean;
  onChangeOnlyCatchable: (checked: boolean) => void;
  excludeTradeEvolutions: boolean;
  onChangeExcludeTradeEvolutions: (checked: boolean) => void;
  fullyEvolvedOnly: boolean;
  onChangeFullyEvolvedOnly: (checked: boolean) => void;
  excludeLegendaries: boolean;
  onChangeExcludeLegendaries: (checked: boolean) => void;
  includeBattleForms: boolean;
  onChangeIncludeBattleForms: (checked: boolean) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function BrowserFilterTray({
  isCampaign,
  availableTypes,
  selectedTypes,
  onToggleType,
  selectedRegionGen,
  onChangeRegionGen,
  onlyCatchableInGame,
  onChangeOnlyCatchable,
  excludeTradeEvolutions,
  onChangeExcludeTradeEvolutions,
  fullyEvolvedOnly,
  onChangeFullyEvolvedOnly,
  excludeLegendaries,
  onChangeExcludeLegendaries,
  includeBattleForms,
  onChangeIncludeBattleForms,
  hasActiveFilters,
  onResetFilters,
}: BrowserFilterTrayProps) {
  return (
    <div className="space-y-3 rounded-xl bg-[var(--surface-card)] p-3.5">
      {/* Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {availableTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggleType(type)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                isSelected
                  ? 'text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:bg-[var(--surface-muted)]'
              }`}
              style={isSelected ? { backgroundColor: TYPE_COLOR_VARS[type] } : undefined}
            >
              <TypeIcon type={type} className="h-3 w-3 shrink-0" />
              <span>{type}</span>
            </button>
          );
        })}
      </div>

      {/* Region (Free Mode) + Gameplay Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {!isCampaign && (
            <select
              aria-label="Filter by region"
              value={selectedRegionGen}
              onChange={(e) => {
                const val = e.target.value;
                onChangeRegionGen(val === 'all' ? 'all' : (Number(val) as GenerationNumber));
              }}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-xs font-medium text-[var(--ink-primary)]"
            >
              <option value="all">All Regions</option>
              {REGION_GEN_MAP.map((r) => (
                <option key={r.gen} value={r.gen}>
                  {r.label}
                </option>
              ))}
            </select>
          )}

          {isCampaign && (
            <>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
                <input
                  type="checkbox"
                  checked={onlyCatchableInGame}
                  onChange={(e) => onChangeOnlyCatchable(e.target.checked)}
                  className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
                />
                <span>Catchable Only</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
                <input
                  type="checkbox"
                  checked={excludeTradeEvolutions}
                  onChange={(e) => onChangeExcludeTradeEvolutions(e.target.checked)}
                  className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
                />
                <span>No Trade Evolutions</span>
              </label>
            </>
          )}

          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
            <input
              type="checkbox"
              checked={fullyEvolvedOnly}
              onChange={(e) => onChangeFullyEvolvedOnly(e.target.checked)}
              className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
            />
            <span>Fully Evolved</span>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
            <input
              type="checkbox"
              checked={excludeLegendaries}
              onChange={(e) => onChangeExcludeLegendaries(e.target.checked)}
              className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
            />
            <span>No Legendaries</span>
          </label>

          {!isCampaign && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={includeBattleForms}
                onChange={(e) => onChangeIncludeBattleForms(e.target.checked)}
                className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
              />
              <span>Megas & Battle Forms</span>
            </label>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            <X className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
