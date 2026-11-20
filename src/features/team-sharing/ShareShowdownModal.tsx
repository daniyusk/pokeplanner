import * as Dialog from '@radix-ui/react-dialog';
import { Check, Copy, Download, Upload, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { pkmnDexGateway } from '@/data/dex/pkmnDexGateway';
import { exportTeamToShowdown, importTeamFromShowdown } from '@/domain/sharing';
import { useTeamStore } from '@/stores/useTeamStore';

interface ShareShowdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
}

export function ShareShowdownModal({ open, onOpenChange, shareUrl }: ShareShowdownModalProps) {
  const team = useTeamStore((s) => s.team);
  const context = useTeamStore((s) => s.context);
  const hydrateTeam = useTeamStore((s) => s.hydrateTeam);

  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [copiedPaste, setCopiedPaste] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const exportedPaste = useMemo(
    () => exportTeamToShowdown(team, context, pkmnDexGateway),
    [team, context],
  );

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleCopyPaste = async () => {
    if (!exportedPaste) return;
    try {
      await navigator.clipboard.writeText(exportedPaste);
      setCopiedPaste(true);
      setTimeout(() => setCopiedPaste(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleImport = () => {
    const result = importTeamFromShowdown(importText, context, pkmnDexGateway);
    hydrateTeam(result.team);
    setWarnings(result.warnings);
    if (result.warnings.length === 0) {
      setImportText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-[8%] left-1/2 z-50 flex max-h-[84vh] w-[94vw] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-bold text-[var(--ink-primary)]">
                Share & Pokémon Showdown Interop
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--ink-muted)]">
                Permanent shareable links and Showdown text import/export
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close share dialog"
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 overflow-y-auto p-5">
            {/* Permanent Link */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-secondary)]">
                  Permanent Shareable URL
                </span>
                <span className="text-[11px] tabular-nums text-[var(--ink-muted)]">
                  {shareUrl.length} chars
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  aria-label="Shareable team URL"
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 font-mono text-xs text-[var(--ink-primary)]"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-primary-hover)]"
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Showdown Tabs */}
            <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1">
              <button
                type="button"
                onClick={() => setTab('export')}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'export'
                    ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Showdown</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('import');
                  setWarnings([]);
                }}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'import'
                    ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import Showdown</span>
              </button>
            </div>

            {tab === 'export' ? (
              <div className="space-y-2.5">
                <textarea
                  readOnly
                  rows={10}
                  value={exportedPaste || 'Add Pokémon to your team to generate a Showdown export.'}
                  aria-label="Exported Showdown team text"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 font-mono text-xs text-[var(--ink-primary)]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!exportedPaste}
                    onClick={handleCopyPaste}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3.5 text-xs font-semibold text-[var(--ink-primary)] transition hover:border-[var(--border-strong)] disabled:opacity-45"
                  >
                    {copiedPaste ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedPaste ? 'Copied Paste' : 'Copy Showdown Paste'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <textarea
                  rows={10}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Garchomp @ Rocky Helmet\nAbility: Rough Skin\nJolly Nature\n- Earthquake\n- Dragon Claw\n- Swords Dance\n- Fire Fang`}
                  aria-label="Paste Pokémon Showdown team text"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 font-mono text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
                />
                {warnings.length > 0 && (
                  <div
                    role="status"
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
                  >
                    <p className="font-semibold">Imported with warnings:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!importText.trim()}
                    onClick={handleImport}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 text-xs font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-45"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Import to Active Team</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
