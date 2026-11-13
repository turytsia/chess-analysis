import { MoveLabel } from '../../services/classify';
import { useAnalysisTranslation } from '../../translations/hooks';

export function useLocalizeMoveLabel(): (label: MoveLabel) => string {
  const { t } = useAnalysisTranslation();

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
