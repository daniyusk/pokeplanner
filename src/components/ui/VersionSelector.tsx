import type { GameVersionInfo } from '@/domain/types';

interface VersionSelectorProps {
  versions: readonly GameVersionInfo[];
  activeVersionId: string | undefined;
  onSelectVersion: (versionId: string) => void;
  containerTone?: 'card' | 'elevated';
}

export function VersionSelector({
  versions,
  activeVersionId,
  onSelectVersion,
  containerTone = 'card',
}: VersionSelectorProps) {
  if (versions.length <= 1) return null;

  const wrapperBg =
    containerTone === 'elevated' ? 'bg-[var(--surface-elevated)]' : 'bg-[var(--surface-card)]';
  const selectedBg =
    containerTone === 'elevated' ? 'bg-[var(--surface-card)]' : 'bg-[var(--surface-elevated)]';

  return (
    <fieldset
      aria-label="Game version"
      className={`flex items-center gap-0.5 rounded-lg border-0 ${wrapperBg} p-0.5`}
    >
      {versions.map((v) => {
        const isSelected = (activeVersionId ?? versions[0]?.id) === v.id;
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectVersion(v.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              isSelected
                ? `${selectedBg} text-[var(--ink-primary)]`
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {v.name}
          </button>
        );
      })}
    </fieldset>
  );
}
