import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  Swords,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { loadGameCatalog, loadGameManifest } from '@/data/games/gameLoader';
import { evaluateJourneyCheckpoint } from '@/domain/journey';
import { createEmptyTeam } from '@/domain/sharing';
import type { GameCatalogEntry, TeamSlotIndex } from '@/domain/types';
import { useTeamStore } from '@/stores/useTeamStore';

export function JourneyPlannerPanel() {
  const context = useTeamStore((s) => s.context);
  const activeManifest = useTeamStore((s) => s.activeManifest);
  const activeCheckpointId = useTeamStore((s) => s.activeCheckpointId);
  const journeySnapshots = useTeamStore((s) => s.journeySnapshots);
  const excludeTradeEvolutions = useTeamStore((s) => s.excludeTradeEvolutions);
  const setActiveCheckpoint = useTeamStore((s) => s.setActiveCheckpoint);
  const selectCampaignGame = useTeamStore((s) => s.selectCampaignGame);
  const syncJourneyFromFinalTeam = useTeamStore((s) => s.syncJourneyFromFinalTeam);
  const clearJourneySlot = useTeamStore((s) => s.clearJourneySlot);
  const openPicker = useTeamStore((s) => s.openPicker);

  const [catalog, setCatalog] = useState<readonly GameCatalogEntry[]>([]);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeManifest) {
      loadGameCatalog().then(setCatalog);
    }
  }, [activeManifest]);

  const currentCheckpointId = activeCheckpointId ?? activeManifest?.checkpoints[0]?.id ?? null;

  const currentTeam = useMemo(() => {
    if (!currentCheckpointId) return createEmptyTeam();
    return journeySnapshots[currentCheckpointId] ?? createEmptyTeam();
  }, [currentCheckpointId, journeySnapshots]);

  const evaluation = useMemo(() => {
    if (!activeManifest || !currentCheckpointId) return null;
    return evaluateJourneyCheckpoint(
      currentTeam,
      currentCheckpointId,
      activeManifest,
      context,
      pkmnDexGateway,
      {
        excludeTradeEvolutions,
        ...(context.mode === 'campaign' && context.versionId
          ? { versionId: context.versionId }
          : {}),
      },
    );
  }, [activeManifest, context, currentCheckpointId, currentTeam, excludeTradeEvolutions]);

  if (!activeManifest) {
    return (
      <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--ink-primary)]">
            <Compass className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>Choose a Campaign to Plan Your Journey</span>
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Select a mainline game (Generation 1 through Black 2 & White 2) to track Gym level caps,
            catch locations, trade evolution rules, and early-game temporary teammates.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((game) => (
            <button
              key={game.id}
              type="button"
              disabled={loadingGameId === game.id}
              onClick={async () => {
                setLoadingGameId(game.id);
                const manifest = await loadGameManifest(game.id);
                setLoadingGameId(null);
                if (manifest) {
                  selectCampaignGame(manifest);
                }
              }}
              className="flex flex-col items-start justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5 text-left transition hover:border-[var(--accent-primary)]"
            >
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Gen {game.generation} · {game.region}
                </span>
                <p className="mt-0.5 text-sm font-bold text-[var(--ink-primary)]">{game.name}</p>
              </div>
              <span className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">
                {loadingGameId === game.id ? 'Loading...' : 'Plan Campaign →'}
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (!evaluation || !currentCheckpointId) return null;

  const ratingStyle =
    evaluation.overallRating === 'Favorable'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : evaluation.overallRating === 'Risky'
        ? 'bg-red-500/15 text-red-700 dark:text-red-300'
        : 'bg-amber-500/15 text-amber-800 dark:text-amber-300';

  return (
    <section aria-labelledby="journey-heading" className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="journey-heading"
            className="text-lg font-bold tracking-tight text-[var(--ink-primary)]"
          >
            Journey Planner — {activeManifest.name}
          </h2>
          <p className="text-xs text-[var(--ink-muted)]">
            Customize your active team at each milestone. Early-game carries can differ from your
            final team above.
          </p>
        </div>
        <button
          type="button"
          onClick={syncJourneyFromFinalTeam}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 text-xs font-semibold text-[var(--ink-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Auto-Sync Evolutions from Final Team</span>
        </button>
      </div>

      {/* Checkpoint Timeline Rail */}
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Campaign checkpoints"
      >
        {activeManifest.checkpoints.map((cp) => {
          const isActive = cp.id === currentCheckpointId;
          return (
            <button
              key={cp.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCheckpoint(cp.id)}
              className={`flex min-w-[10.5rem] shrink-0 flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition ${
                isActive
                  ? 'border-[var(--accent-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)]/70 hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tabular-nums text-[var(--ink-muted)]">
                  Stage {cp.order}
                </span>
                <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--ink-secondary)]">
                  Cap Lv {cp.levelCap}
                </span>
              </div>
              <p className="line-clamp-1 text-xs font-bold text-[var(--ink-primary)]">{cp.name}</p>
              {cp.specialtyType ? (
                <TypeBadge type={cp.specialtyType} size="sm" />
              ) : (
                <span className="text-[11px] text-[var(--ink-muted)]">Mixed Team</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Checkpoint Team & Boss Matchup */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: 6 Checkpoint Slots */}
        <div className="space-y-3 xl:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--ink-primary)]">
              Team for {evaluation.checkpoint.name}
            </h3>
            <span className="text-xs font-medium tabular-nums text-[var(--ink-muted)]">
              Level Cap: {evaluation.checkpoint.levelCap}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {([0, 1, 2, 3, 4, 5] as const).map((slotIndex) => {
              const diag = evaluation.slots[slotIndex];
              if (!diag) {
                return (
                  <button
                    key={slotIndex}
                    type="button"
                    onClick={() => openPicker(slotIndex as TeamSlotIndex, currentCheckpointId)}
                    className="flex min-h-[5.5rem] items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)]/50 p-3 text-xs font-semibold text-[var(--ink-muted)] transition hover:border-[var(--accent-primary)] hover:text-[var(--ink-primary)]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>
                      Assign Slot {slotIndex + 1} for Stage {evaluation.checkpoint.order}
                    </span>
                  </button>
                );
              }

              const isOk = diag.status === 'ready';
              const isWarn = diag.status === 'early-stage-recommended';

              return (
                <div
                  key={slotIndex}
                  className={`flex flex-col justify-between gap-2 rounded-xl border p-3 ${
                    isOk
                      ? 'border-[var(--border-subtle)] bg-[var(--surface-card)]'
                      : isWarn
                        ? 'border-amber-500/45 bg-amber-500/5'
                        : 'border-red-500/45 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openPicker(slotIndex as TeamSlotIndex, currentCheckpointId)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <PokemonSprite
                        spriteId={diag.species.spriteId}
                        dexNumber={diag.species.dexNumber}
                        name={diag.species.name}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-bold text-[var(--ink-primary)]">
                          {diag.species.name}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {diag.species.types.map((t) => (
                            <TypeBadge key={t} type={t} size="sm" />
                          ))}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        clearJourneySlot(currentCheckpointId, slotIndex as TeamSlotIndex)
                      }
                      aria-label={`Remove ${diag.species.name} from stage`}
                      className="rounded p-1 text-[var(--ink-muted)] hover:bg-red-500/15 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-start gap-1.5 text-[11px] text-[var(--ink-secondary)]">
                    {isOk ? (
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <AlertTriangle
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isWarn ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{diag.messages.join(' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Boss Matchup & Unlocked Areas */}
        <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 xl:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                Boss Matchup — {evaluation.checkpoint.bossName}
              </h3>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${ratingStyle}`}>
              {evaluation.overallRating}
            </span>
          </div>

          <div className="space-y-2">
            {evaluation.bossMatchups.map((m) => (
              <div
                key={m.bossSpecies.slug}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <PokemonSprite
                    spriteId={m.bossSpecies.spriteId}
                    dexNumber={m.bossSpecies.dexNumber}
                    name={m.bossSpecies.name}
                    size="sm"
                    className="h-9 w-9"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--ink-primary)]">
                      {m.bossSpecies.name}
                    </p>
                    <div className="mt-0.5 flex gap-1">
                      {m.bossSpecies.types.map((t) => (
                        <TypeBadge key={t} type={t} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px]">
                  {m.counteredBy.length > 0 ? (
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">
                      Countered by {m.counteredBy.slice(0, 2).join(', ')}
                    </p>
                  ) : (
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      No direct counter
                    </p>
                  )}
                  {m.threatens.length > 0 && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                      <span>Threatens {m.threatens.slice(0, 2).join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {evaluation.checkpoint.unlockedLocations.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-secondary)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                <span>Unlocked Regions at Stage {evaluation.checkpoint.order}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                {evaluation.checkpoint.unlockedLocations.join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
