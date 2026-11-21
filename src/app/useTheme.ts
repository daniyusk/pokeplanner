import { useEffect, useState } from 'react';
import { getThemePreference, setThemePreference, type ThemeMode } from '@/data/storage/teamStorage';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => getThemePreference());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setThemePreference(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
}
