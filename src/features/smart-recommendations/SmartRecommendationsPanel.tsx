import { Check, Plus, RefreshCw, Shield, Sparkles, Swords, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { BATTLE_GIMMICK, TEAM_SLOT_INDICES } from '@/domain/constants';
import {
  type PokemonRecommendation,
  type RecommendationReason,
  recommendPokemonForTeam,
} from '@/domain/recommendations';
import type { TeamSlotIndex } from '@/domain/types';
import { useTransientValue } from '@/hooks/useTransientFlag';
import { useTeamStore } from '@/stores/useTeamStore';

function ReasonIcon({ category }: { category: RecommendationReason['category'] }) {
  if (category === 'defense') {
    return (
      <Shield
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400"
        aria-hidden="true"
      />
    );
  }
  if (category === 'offense') {
    return (
      <Swords
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
    );
  }
  return (
    <TrendingUp
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
      aria-hidden="true"
    />
  );
}

interface SmartRecommendationsPanelProps {
  allowedSpeciesSlugs?: ReadonlySet<string>;
}

export function SmartRecommendationsPanel({ allowedSpeciesSlugs }: SmartRecommendationsPanelProps) {
  const team = useTeamStore((s) => s.team);
  const context = useTeamStore((s) => s.context);
  const setSlotSpecies = useTeamStore((s) => s.setSlotSpecies);
  const updateSlotMember = useTeamStore((s) => s.updateSlotMember);

  const [excludeLegendaries, setExcludeLegendaries] = useState(true);
  const [excludeNfe, setExcludeNfe] = useState(true);
  const [allowMegas, setAllowMegas] = useState(context.mechanics.gimmick === BATTLE_GIMMICK.Mega);
  const [replaceSlot, setReplaceSlot] = useState<TeamSlotIndex | 'empty'>('empty');
  const [appliedSlug, triggerAppliedSlug] = useTransientValue<string>(1500);

  const firstEmptyIndex = team.indexOf(null);
  const hasEmptySlot = firstEmptyIndex >= 0;

  const effectiveTargetSlot: TeamSlotIndex =
    replaceSlot === 'empty' ? ((hasEmptySlot ? firstEmptyIndex : 0) as TeamSlotIndex) : replaceSlot;

  const isReplaceMode = replaceSlot !== 'empty' || !hasEmptySlot;

  const recommendations = useMemo(
    () =>
      recommendPokemonForTeam(team, context, pkmnDexGateway, {
        limit: 9,
        excludeLegendaries,
        excludeNfe,
        allowMegas,
        ...(isReplaceMode ? { replaceSlotIndex: effectiveTargetSlot } : {}),
        ...(allowedSpeciesSlugs ? { allowedSpeciesSlugs } : {}),
      }),
    [
      allowMegas,
      allowedSpeciesSlugs,
      context,
      effectiveTargetSlot,
      excludeLegendaries,
      excludeNfe,
      isReplaceMode,
      team,
    ],
  );

  const handleApply = (rec: PokemonRecommendation) => {
    setSlotSpecies(effectiveTargetSlot, rec.species.slug);
    if (rec.recommendedAbilitySlug && context.mechanics.hasAbilities) {
      updateSlotMember(effectiveTargetSlot, { abilitySlug: rec.recommendedAbilitySlug });
    }
    triggerAppliedSlug(rec.species.slug);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-[var(--surface-card)] p-5">
      {/* Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="rec-target-slot"
            className="text-xs font-semibold text-[var(--ink-secondary)]"
          >
            Recommend for:
          </label>
          <select
            id="rec-target-slot"
            value={replaceSlot}
            onChange={(e) => {
              const val = e.target.value;
              setReplaceSlot(val === 'empty' ? 'empty' : (Number(val) as TeamSlotIndex));
            }}
            className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-xs font-medium text-[var(--ink-primary)]"
          >
            {hasEmptySlot && (
              <option value="empty">Next Open Slot (Slot {firstEmptyIndex + 1})</option>
            )}
            {TEAM_SLOT_INDICES.map((idx) => {
              const slotMember = team[idx];
              const sp = slotMember
                ? pkmnDexGateway.getSpecies(slotMember.speciesSlug, context.generation)
                : undefined;
              return (
                <option key={idx} value={idx}>
                  {sp ? `Replace Slot ${idx + 1} (${sp.name})` : `Slot ${idx + 1} (Empty)`}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
            <input
              type="checkbox"
              checked={excludeLegendaries}
              onChange={(e) => setExcludeLegendaries(e.target.checked)}
              className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
            />
            <span>Exclude Legendaries</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
            <input
              type="checkbox"
              checked={excludeNfe}
              onChange={(e) => setExcludeNfe(e.target.checked)}
              className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
            />
            <span>Fully Evolved Only</span>
          </label>
          {context.mechanics.gimmick === BATTLE_GIMMICK.Mega && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={allowMegas}
                onChange={(e) => setAllowMegas(e.target.checked)}
                className="rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
              />
              <span>Include Megas</span>
            </label>
          )}
        </div>
      </div>

      {/* Recommendations Grid */}
      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] py-10 text-center text-xs text-[var(--ink-muted)]">
          No candidate Pokémon match the current filters. Try relaxing one of the toggles above.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recommendations.map((rec) => {
            const abilityName =
              context.mechanics.hasAbilities && rec.recommendedAbilitySlug
                ? pkmnDexGateway.getAbility(rec.recommendedAbilitySlug, context.generation)?.name
                : undefined;

            const fitBadgeClass =
              rec.fitLabel === 'Top Synergy'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : rec.fitLabel === 'Strong Fit'
                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  : 'bg-[var(--surface-muted)] text-[var(--ink-secondary)]';

            const justApplied = appliedSlug === rec.species.slug;

            return (
              <article
                key={rec.species.slug}
                className="flex flex-col justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] p-4"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <PokemonSprite
                        spriteId={rec.species.spriteId}
                        dexNumber={rec.species.dexNumber}
                        name={rec.species.name}
                        size="custom"
                        className="h-12 w-12"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                          {rec.species.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {rec.species.types.map((t) => (
                            <TypeBadge key={t} type={t} size="sm" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${fitBadgeClass}`}
                    >
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      <span>{rec.fitLabel}</span>
                    </span>
                  </div>

                  {/* Recommended Ability + Stats Snapshot */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-muted)]">
                    {abilityName && (
                      <span className="rounded bg-[var(--surface-card)] px-2 py-0.5 font-medium text-[var(--ink-secondary)]">
                        Ability: {abilityName}
                      </span>
                    )}
                    <span className="tabular-nums">
                      Atk {rec.species.baseStats.atk} · SpA {rec.species.baseStats.spa} · Spe{' '}
                      {rec.species.baseStats.spe}
                    </span>
                  </div>

                  {/* Evidence Reasons */}
                  <ul className="space-y-1.5 border-t border-[var(--border-subtle)] pt-2.5 text-xs text-[var(--ink-secondary)]">
                    {rec.reasons.map((reason) => (
                      <li key={reason.summary} className="flex items-start gap-2">
                        <ReasonIcon category={reason.category} />
                        <span>{reason.summary}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(rec)}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)]"
                >
                  {justApplied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Applied to Slot {effectiveTargetSlot + 1}</span>
                    </>
                  ) : isReplaceMode ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Swap into Slot {effectiveTargetSlot + 1}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add to Slot {effectiveTargetSlot + 1}</span>
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
