import { useSettingsStore } from '../stores/settingsStore';

const DARK_CLASS = 'dark';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function initializeTheme(): void {
  const systemScheme = window.matchMedia(DARK_SCHEME_QUERY);
  const applyTheme = (): void => {
    const { theme } = useSettingsStore.getState();
    document.documentElement.classList.toggle(
      DARK_CLASS,
      theme === 'dark' || (theme === 'system' && systemScheme.matches)
    );
  };

  applyTheme();
  systemScheme.addEventListener('change', applyTheme);
  useSettingsStore.subscribe(applyTheme);
}
