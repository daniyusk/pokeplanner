import { Shield } from 'lucide-react';
import { useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { DefensiveProfile, SlotDefensiveCell } from '@/domain/analysis';
import type { GameContext, Team, TeamSlotIndex } from '@/domain/types';

interface DefensiveMatrixProps {
  defense: DefensiveProfile;
  team: Team;
  context: GameContext;
}

function formatMultiplier(multiplier: number): string {
  if (multiplier === 0) return '0×';
  if (multiplier === 0.25) return '¼×';
  if (multiplier === 0.5) return '½×';
  if (multiplier === 1) return '1×';
  return `${multiplier}×`;
}

function getCellStyle(multiplier: number): string {
  if (multiplier === 0) {
    return 'border-cyan-600/50 bg-cyan-600 text-white dark:bg-cyan-700';
  }
  if (multiplier <= 0.25) {
    return 'border-emerald-600/50 bg-emerald-600/18 text-emerald-800 dark:text-emerald-300 font-bold';
  }
  if (multiplier < 1) {
    return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (multiplier >= 4) {
    return 'border-2 border-red-600 bg-red-600/20 text-red-700 dark:text-red-300 font-bold';
  }
  if (multiplier >= 2) {
    return 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold';
  }
  return 'border-transparent text-[var(--ink-muted)]/45';
}

function MultiplierBadge({
  cell,
  generation,
}: {
  cell: SlotDefensiveCell;
  generation: GameContext['generation'];
}) {
  const modifierLabel =
    cell.modifierSource === 'ability' && cell.modifierName
      ? (pkmnDexGateway.getAbility(cell.modifierName, generation)?.name ?? cell.modifierName)
      : cell.modifierSource === 'item' && cell.modifierName
        ? (pkmnDexGateway.getItem(cell.modifierName, generation)?.name ?? cell.modifierName)
        : undefined;

  return (
    <span
      title={modifierLabel ? `Modified by ${modifierLabel}` : undefined}
      className={`inline-flex min-w-[3.1rem] items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-xs tabular-nums ${getCellStyle(cell.multiplier)}`}
    >
      <span>{formatMultiplier(cell.multiplier)}</span>
      {modifierLabel && (
        <Shield className="h-3 w-3 shrink-0" aria-label={`Modified by ${modifierLabel}`} />
      )}
    </span>
  );
}

export function DefensiveMatrix({ defense, team, context }: DefensiveMatrixProps) {
  const [onlyNotable, setOnlyNotable] = useState(false);

  const activeSlots = ([0, 1, 2, 3, 4, 5] as const)
    .map((slotIndex) => {
      const member = team[slotIndex];
      if (!member) return null;
      const species = pkmnDexGateway.getSpecies(member.speciesSlug, context.generation);
      if (!species) return null;
      return { slotIndex: slotIndex as TeamSlotIndex, member, species };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const visibleRows = onlyNotable
    ? defense.rows.filter((r) => r.weakCount > 0 || r.resistCount > 0 || r.immuneCount > 0)
    : defense.rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--ink-muted)]">
          Includes active Abilities and Held Items (marked with a shield icon).
        </p>
        <button
          type="button"
          aria-pressed={onlyNotable}
          onClick={() => setOnlyNotable((prev) => !prev)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            onlyNotable
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
          }`}
        >
          {onlyNotable ? 'Showing Threats & Resists' : 'Filter: Threats & Resists'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <th scope="col" className="px-3 py-2.5 font-semibold text-[var(--ink-secondary)]">
                Attack Type
              </th>
              {activeSlots.map((slot) => (
                <th
                  key={slot.slotIndex}
                  scope="col"
                  className="px-2 py-2 text-center font-semibold text-[var(--ink-primary)]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <PokemonSprite
                      spriteId={slot.species.spriteId}
                      dexNumber={slot.species.dexNumber}
                      name={slot.species.name}
                      size="sm"
                      className="h-8 w-8"
                    />
                    <span className="max-w-[5.5rem] truncate text-[11px]">{slot.species.name}</span>
                  </div>
                </th>
              ))}
              <th
                scope="col"
                className="px-2.5 py-2.5 text-center font-semibold text-red-600 dark:text-red-400"
              >
                Weak
              </th>
              <th
                scope="col"
                className="px-2.5 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400"
              >
                Resist
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold text-[var(--ink-secondary)]"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {visibleRows.map((row) => (
              <tr
                key={row.attackType}
                className={
                  row.severity === 'critical'
                    ? 'bg-red-500/5'
                    : row.severity === 'warning'
                      ? 'bg-amber-500/5'
                      : 'hover:bg-[var(--surface-elevated)]/60'
                }
              >
                <th scope="row" className="px-3 py-2 font-medium">
                  <TypeBadge type={row.attackType} size="sm" />
                </th>
                {activeSlots.map((slot) => {
                  const cell = row.slots[slot.slotIndex];
                  return (
                    <td key={slot.slotIndex} className="px-2 py-2 text-center">
                      {cell ? <MultiplierBadge cell={cell} generation={context.generation} /> : '—'}
                    </td>
                  );
                })}
                <td className="px-2.5 py-2 text-center font-semibold tabular-nums text-[var(--ink-primary)]">
                  {row.weakCount > 0 ? (
                    row.weakCount
                  ) : (
                    <span className="text-[var(--ink-muted)]/40">0</span>
                  )}
                </td>
                <td className="px-2.5 py-2 text-center font-semibold tabular-nums text-[var(--ink-primary)]">
                  {row.resistCount + row.immuneCount > 0 ? (
                    row.resistCount + row.immuneCount
                  ) : (
                    <span className="text-[var(--ink-muted)]/40">0</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.severity === 'critical' && (
                    <span className="inline-block rounded-md bg-red-600/15 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
                      Critical
                    </span>
                  )}
                  {row.severity === 'warning' && (
                    <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      Exposed
                    </span>
                  )}
                  {row.severity === 'strong' && (
                    <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Solid
                    </span>
                  )}
                  {row.severity === 'balanced' && (
                    <span className="text-[11px] text-[var(--ink-muted)]">Balanced</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
