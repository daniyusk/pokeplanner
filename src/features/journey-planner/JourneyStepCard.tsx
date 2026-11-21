import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Flag,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import type { EvaluatedJourneyBranchNode } from '@/domain/journey';
import type { GenerationNumber, JourneyStepNode } from '@/domain/types';
import { JOURNEY_STEP_LABELS } from './stepLabels';

interface JourneyStepCardProps {
  branch: EvaluatedJourneyBranchNode;
  generation: GenerationNumber;
  onAddChildStep: (parentNode: JourneyStepNode, branchNode: EvaluatedJourneyBranchNode) => void;
  onEditStep: (branchNode: EvaluatedJourneyBranchNode) => void;
  onRemoveStep: (stepId: string) => void;
}

function StepIcon({ type }: { type: JourneyStepNode['action']['type'] }) {
  if (type === 'capture') return <Plus className="h-3 w-3" aria-hidden="true" />;
  if (type === 'train') return <ArrowUpRight className="h-3 w-3" aria-hidden="true" />;
  if (type === 'evolve') return <GitBranch className="h-3 w-3" aria-hidden="true" />;
  if (type === 'replace') return <RefreshCw className="h-3 w-3" aria-hidden="true" />;
  return <Flag className="h-3 w-3" aria-hidden="true" />;
}

export function JourneyStepCard({
  branch,
  generation,
  onAddChildStep,
  onEditStep,
  onRemoveStep,
}: JourneyStepCardProps) {
  const { node, status, messages } = branch;
  const action = node.action;

  const badgeTone =
    action.type === 'capture'
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
      : action.type === 'evolve'
        ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
        : action.type === 'train'
          ? 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
          : action.type === 'replace'
            ? 'bg-purple-500/12 text-purple-700 dark:text-purple-300'
            : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)]';

  const renderContent = () => {
    if (action.type === 'capture') {
      const sp = pkmnDexGateway.getSpecies(action.speciesSlug, generation);
      return (
        <div className="flex items-center gap-2.5">
          {sp && (
            <PokemonSprite
              spriteId={sp.spriteId}
              dexNumber={sp.dexNumber}
              name={sp.name}
              size="sm"
              className="shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--ink-primary)]">
              {sp?.name ?? action.speciesSlug}
            </p>
            {(action.location || action.level !== undefined) && (
              <p className="truncate text-[11px] tabular-nums text-[var(--ink-muted)]">
                {[action.location, action.level !== undefined ? `Lv ${action.level}` : undefined]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (action.type === 'train') {
      const sp = pkmnDexGateway.getSpecies(action.speciesSlug, generation);
      return (
        <div className="flex items-center gap-2.5">
          {sp && (
            <PokemonSprite
              spriteId={sp.spriteId}
              dexNumber={sp.dexNumber}
              name={sp.name}
              size="sm"
              className="shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--ink-primary)]">
              {sp?.name ?? action.speciesSlug}
            </p>
            <p className="text-[11px] font-medium tabular-nums text-[var(--ink-secondary)]">
              → Lv {action.targetLevel}
            </p>
          </div>
        </div>
      );
    }

    if (action.type === 'evolve') {
      const fromSp = pkmnDexGateway.getSpecies(action.fromSpeciesSlug, generation);
      const toSp = pkmnDexGateway.getSpecies(action.toSpeciesSlug, generation);
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            {fromSp && (
              <PokemonSprite
                spriteId={fromSp.spriteId}
                dexNumber={fromSp.dexNumber}
                name={fromSp.name}
                size="custom"
                className="h-9 w-9"
              />
            )}
            <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-muted)]" aria-hidden="true" />
            {toSp && (
              <PokemonSprite
                spriteId={toSp.spriteId}
                dexNumber={toSp.dexNumber}
                name={toSp.name}
                size="custom"
                className="h-9 w-9"
              />
            )}
          </div>
          <p className="truncate text-center text-xs font-semibold text-[var(--ink-primary)]">
            {toSp?.name ?? action.toSpeciesSlug}
            {action.targetLevel !== undefined && (
              <span className="ml-1 font-normal tabular-nums text-[var(--ink-muted)]">
                Lv {action.targetLevel}
              </span>
            )}
          </p>
        </div>
      );
    }

    if (action.type === 'replace') {
      const outSp = pkmnDexGateway.getSpecies(action.outSpeciesSlug, generation);
      const inSp = pkmnDexGateway.getSpecies(action.inSpeciesSlug, generation);
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            {outSp && (
              <PokemonSprite
                spriteId={outSp.spriteId}
                dexNumber={outSp.dexNumber}
                name={outSp.name}
                size="xs"
                className="opacity-55"
              />
            )}
            <RefreshCw className="h-3 w-3 text-[var(--ink-muted)]" aria-hidden="true" />
            {inSp && (
              <PokemonSprite
                spriteId={inSp.spriteId}
                dexNumber={inSp.dexNumber}
                name={inSp.name}
                size="custom"
                className="h-9 w-9"
              />
            )}
          </div>
          <p className="truncate text-center text-xs font-semibold text-[var(--ink-primary)]">
            {outSp?.name ?? action.outSpeciesSlug} → {inSp?.name ?? action.inSpeciesSlug}
          </p>
        </div>
      );
    }

    const sp = action.speciesSlug
      ? pkmnDexGateway.getSpecies(action.speciesSlug, generation)
      : undefined;
    return (
      <div className="flex items-center gap-2">
        {sp && (
          <PokemonSprite
            spriteId={sp.spriteId}
            dexNumber={sp.dexNumber}
            name={sp.name}
            size="xs"
            className="shrink-0"
          />
        )}
        <p className="line-clamp-2 text-xs font-medium text-[var(--ink-primary)]">{action.title}</p>
      </div>
    );
  };

  return (
    <div
      className={`group relative w-52 rounded-xl bg-[var(--surface-card)] p-3 text-left transition ${
        status === 'error'
          ? 'ring-1 ring-red-500/60'
          : status === 'warning'
            ? 'ring-1 ring-amber-500/60'
            : ''
      }`}
    >
      {/* Header badge & controls */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badgeTone}`}
        >
          <StepIcon type={action.type} />
          <span>{JOURNEY_STEP_LABELS[action.type]}</span>
        </span>

        <div className="flex items-center gap-0.5 opacity-80 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAddChildStep(node, branch)}
            aria-label="Add next step in branch"
            title="Chain next step"
            className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onEditStep(branch)}
            aria-label="Edit step"
            title="Edit step"
            className="rounded p-1 text-[var(--ink-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onRemoveStep(node.id)}
            aria-label="Remove step"
            title="Remove step"
            className="rounded p-1 text-[var(--ink-muted)] hover:bg-red-500/12 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {renderContent()}

      {messages.length > 0 && (
        <div
          className={`mt-2 flex items-start gap-1 text-[10px] leading-snug ${
            status === 'error'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-700 dark:text-amber-300'
          }`}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            {messages.map((msg) => (
              <p key={msg}>{msg}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
