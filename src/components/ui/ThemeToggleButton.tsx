import { Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '@/data/storage/teamStorage';

interface ThemeToggleButtonProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export function ThemeToggleButton({ theme, onToggle }: ThemeToggleButtonProps) {
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--ink-primary)]"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
