import { formatISO } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate } from '../utilities/format';
import { getRelativeDate } from '../utilities/relativeDate';

interface RelativeDateProps {
  timestamp: number;
}

export const RelativeDate: React.FC<RelativeDateProps> = ({ timestamp }) => {
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const { unit, count, isFuture } = getRelativeDate(timestamp, now);

  const getText = (): string => {
    if (unit === 'day' && count === 0) {
      return t('Today');
    }
    if (unit === 'day' && count === 1) {
      return isFuture ? t('Tomorrow') : t('Yesterday');
    }
    return isFuture
      ? {
          day: t('InDays', { count }),
          week: t('InWeeks', { count }),
          month: t('InMonths', { count }),
          year: t('InYears', { count }),
        }[unit]
      : {
          day: t('DaysAgo', { count }),
          week: t('WeeksAgo', { count }),
          month: t('MonthsAgo', { count }),
          year: t('YearsAgo', { count }),
        }[unit];
  };

  return (
    <time dateTime={formatISO(timestamp)} title={formatDate(timestamp)}>
      {getText()}
    </time>
  );
};
