import { useTranslation } from 'react-i18next';

import { MoveLabel } from '../services/classify';

export function useLocalizeMoveLabel(): (label: MoveLabel) => string {
  const { t } = useTranslation();

  return (label) =>
    ({
      [MoveLabel.Brilliant]: t('Brilliant'),
      [MoveLabel.Great]: t('Great'),
      [MoveLabel.Best]: t('Best'),
      [MoveLabel.Excellent]: t('Excellent'),
      [MoveLabel.Good]: t('Good'),
      [MoveLabel.Book]: t('Book'),
      [MoveLabel.Inaccuracy]: t('Inaccuracy'),
      [MoveLabel.Mistake]: t('Mistake'),
      [MoveLabel.Miss]: t('Miss'),
      [MoveLabel.Blunder]: t('Blunder'),
    }[label]);
}
