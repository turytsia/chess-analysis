import { ChessKnight, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore, type Theme } from '../stores/settingsStore';
import { toHref } from '../utilities/router';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';

const NEXT_THEME: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const THEME_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

export const AppHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className='sticky top-0 z-40 h-(--header-height) border-b bg-background/80 backdrop-blur'>
      <div className='mx-auto flex h-full w-full max-w-7xl items-center gap-6 px-4 sm:px-6'>
        <a
          href={toHref({ name: 'library' })}
          className='flex items-center gap-2 rounded-sm text-sm font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
        >
          <span className='flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground'>
            <ChessKnight className='size-4' />
          </span>
          {t('AppName')}
        </a>
        <div className='ml-auto'>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

const ThemeToggle: React.FC = () => {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const Icon = THEME_ICONS[theme];
  const label = {
    system: t('ThemeSystem'),
    light: t('ThemeLight'),
    dark: t('ThemeDark'),
  }[theme];

  return (
    <Tooltip content={label}>
      <Button
        variant='ghost'
        size='iconSm'
        aria-label={label}
        onClick={() => setTheme(NEXT_THEME[theme])}
      >
        <Icon />
      </Button>
    </Tooltip>
  );
};
