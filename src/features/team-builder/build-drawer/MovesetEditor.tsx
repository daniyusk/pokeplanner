import { Search, Sparkles, Trash2 } from 'lucide-react';
import { TypeBadge } from '@/components/pokemon/TypeBadge';
import { TYPE_COLOR_VARS } from '@/components/pokemon/TypeIcon';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { MAX_MOVES_PER_MEMBER } from '@/domain/constants';
import { resolveMoveCategory } from '@/domain/mechanics';
import type { GameContext, MoveData } from '@/domain/types';

const MOVE_SLOT_INDICES = [0, 1, 2, 3] as const;

interface MovesetEditorProps {
  moveSlugs: readonly string[];
  context: GameContext;
  showAllMoves: boolean;
  onToggleShowAllMoves: () => void;
  moveQuery: string;
  onChangeMoveQuery: (query: string) => void;
  candidateMoves: readonly MoveData[];
  onToggleMove: (move: MoveData) => void;
}

export function MovesetEditor({
  moveSlugs,
  context,
  showAllMoves,
  onToggleShowAllMoves,
  moveQuery,
  onChangeMoveQuery,
  candidateMoves,
  onToggleMove,
}: MovesetEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ink-secondary)]">
          Moves ({moveSlugs.length}/{MAX_MOVES_PER_MEMBER})
        </span>
        <button
          type="button"
          onClick={onToggleShowAllMoves}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
        >
          <Sparkles className="h-3 w-3" />
          <span>{showAllMoves ? 'Showing all Gen moves' : 'Showing learnable moves'}</span>
        </button>
      </div>

      {/* Selected 4 Move Slots */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {MOVE_SLOT_INDICES.map((idx) => {
          const slug = moveSlugs[idx];
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
          const category = resolveMoveCategory(move, context);
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
                    {move.type} · {category} · {move.basePower > 0 ? `BP ${move.basePower}` : '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleMove(move)}
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
          onChange={(e) => onChangeMoveQuery(e.target.value)}
          placeholder="Search moves by name or type..."
          aria-label="Search moves"
          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] pr-3 pl-8 text-xs text-[var(--ink-primary)]"
        />
      </div>

      <div className="max-h-60 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        {candidateMoves.map((move) => {
          const isSelected = moveSlugs.includes(move.slug);
          const category = resolveMoveCategory(move, context);
          const disabled = !isSelected && moveSlugs.length >= MAX_MOVES_PER_MEMBER;

          return (
            <button
              key={move.slug}
              type="button"
              disabled={disabled}
              onClick={() => onToggleMove(move)}
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
  );
}
