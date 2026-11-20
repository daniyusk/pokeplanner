import * as Dialog from '@radix-ui/react-dialog';
import { BookmarkPlus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PokemonSprite } from '@/components/pokemon/PokemonSprite';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { useTeamStore } from '@/stores/useTeamStore';

interface SavedTeamsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedTeamsModal({ open, onOpenChange }: SavedTeamsModalProps) {
  const team = useTeamStore((s) => s.team);
  const teamName = useTeamStore((s) => s.teamName);
  const savedTeams = useTeamStore((s) => s.savedTeams);
  const saveCurrentTeam = useTeamStore((s) => s.saveCurrentTeam);
  const loadSavedTeam = useTeamStore((s) => s.loadSavedTeam);
  const deleteSavedTeam = useTeamStore((s) => s.deleteSavedTeam);

  const [nameInput, setNameInput] = useState('');
  const hasAnyMember = team.some((s) => s !== null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyMember) return;
    await saveCurrentTeam(nameInput || teamName || undefined);
    setNameInput('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-[8%] left-1/2 z-50 flex max-h-[84vh] w-[94vw] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-bold text-[var(--ink-primary)]">
                Saved Teams (Local Browser Storage)
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--ink-muted)]">
                Stored offline in IndexedDB on this device
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close saved teams dialog"
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 overflow-y-auto p-5">
            {/* Save Current Team Form */}
            <form onSubmit={handleSave} className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={teamName || 'Name your current team (e.g., Platinum Run)...'}
                aria-label="Team name"
                maxLength={60}
                className="h-9 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--ink-primary)]"
              />
              <button
                type="submit"
                disabled={!hasAnyMember}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-45"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span>Save Team</span>
              </button>
            </form>

            {/* Saved Teams List */}
            {savedTeams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] py-10 text-center text-xs text-[var(--ink-muted)]">
                No teams saved yet. Add at least one Pokémon and save your first team above.
              </div>
            ) : (
              <ul className="space-y-2">
                {savedTeams.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">
                          {record.name}
                        </p>
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--ink-muted)]">
                          Gen {record.generation}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {([0, 1, 2, 3, 4, 5] as const).map((slotPos) => {
                          const slot = record.team[slotPos];
                          if (!slot) return null;
                          const sp = pkmnDexGateway.getSpecies(slot.speciesSlug, record.generation);
                          if (!sp) return null;
                          return (
                            <PokemonSprite
                              key={`${record.id}-slot-${slotPos}-${sp.slug}`}
                              spriteId={sp.spriteId}
                              dexNumber={sp.dexNumber}
                              name={sp.name}
                              size="sm"
                              className="h-8 w-8"
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          loadSavedTeam(record.id);
                          onOpenChange(false);
                        }}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-primary)] transition hover:border-[var(--accent-primary)]"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedTeam(record.id)}
                        aria-label={`Delete saved team ${record.name}`}
                        className="rounded-lg p-1.5 text-[var(--ink-muted)] transition hover:bg-red-500/15 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
