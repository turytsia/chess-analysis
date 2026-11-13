import { useTranslation } from 'react-i18next';

import type { TimeClass } from '../services/db';

export function useLocalizeTimeClass(): (timeClass: TimeClass) => string {
  const { t } = useTranslation();

  return (timeClass) =>
    ({
      bullet: t('Bullet'),
      blitz: t('Blitz'),
      rapid: t('Rapid'),
      daily: t('Daily'),
      unknown: t('UnknownTimeControl'),
    }[timeClass]);
}
